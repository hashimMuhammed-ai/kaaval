import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import {
  DEFAULT_ANALYTICS_CACHE_TTL,
  ANALYTICS_CACHE_PREFIX,
} from '../constants/analytics.constants';
import {
  RedisConnectionHelper,
  RedisQuotaErrorThrottler,
} from '../../common/utils/redis-connection.helper';

@Injectable()
export class AnalyticsCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsCacheService.name);
  private client: Redis | null = null;
  private readonly ttlSeconds: number;
  private isRedisReady = false;

  constructor(
    private readonly configService: ConfigService,
    @Optional() injectedClient?: Redis
  ) {
    this.ttlSeconds = parseInt(
      this.configService.get<string>(
        'ANALYTICS_CACHE_TTL_SECONDS',
        String(DEFAULT_ANALYTICS_CACHE_TTL)
      ),
      10
    );

    if (injectedClient) {
      this.client = injectedClient;
      this.isRedisReady = true;
    }
  }

  async onModuleInit() {
    if (this.client) {
      return;
    }

    const redisUrl = this.configService.get<string>('REDIS_URL');
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = parseInt(
      this.configService.get<string>('REDIS_PORT', '6379'),
      10
    );
    const password =
      this.configService.get<string>('REDIS_PASSWORD') || undefined;
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const allowRemote =
      this.configService.get<string>('ALLOW_REMOTE_REDIS_IN_DEV') === 'true';

    // Guard: Prevent non-production environments from silently connecting to remote Upstash Redis
    if (
      RedisConnectionHelper.isRemoteBlockedInDev(
        redisUrl || host,
        nodeEnv,
        allowRemote
      )
    ) {
      this.isRedisReady = false;
      const sanitized = RedisConnectionHelper.sanitizeRedisUrl(
        redisUrl || `${host}:${port}`
      );
      this.logger.warn(
        `[RedisGuard] Blocked remote Redis connection in ${nodeEnv} (${sanitized}). Caching safely disabled; serving directly from PostgreSQL.`
      );
      return;
    }

    try {
      this.client = redisUrl
        ? new Redis(redisUrl, {
            lazyConnect: true,
            enableOfflineQueue: false,
            maxRetriesPerRequest: 1,
            retryStrategy: () => null,
          })
        : new Redis({
            host,
            port,
            password,
            lazyConnect: true,
            enableOfflineQueue: false,
            maxRetriesPerRequest: 1,
            retryStrategy: () => null, // Do not infinite loop reconnect in local dev/tests without Redis
          });

      this.client.on('connect', () => {
        this.isRedisReady = true;
        this.logger.log(`Connected to Redis cache at ${host}:${port}`);
      });

      this.client.on('error', (err) => {
        this.isRedisReady = false;
        RedisQuotaErrorThrottler.logThrottled(
          this.logger,
          'AnalyticsCacheService Client',
          err,
          'warn'
        );
      });

      await this.client.connect().catch((err) => {
        this.isRedisReady = false;
        RedisQuotaErrorThrottler.logThrottled(
          this.logger,
          'AnalyticsCacheService Connect',
          err,
          'warn'
        );
      });
    } catch (err: any) {
      this.isRedisReady = false;
      RedisQuotaErrorThrottler.logThrottled(
        this.logger,
        'AnalyticsCacheService Init',
        err,
        'warn'
      );
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
      } catch (err) {
        // Ignore disconnect errors during shutdown
      }
    }
  }

  /**
   * Generates tenant-isolated cache key for the KPI overview snapshot.
   */
  getOverviewKey(tenantId: string): string {
    return `${ANALYTICS_CACHE_PREFIX}:overview:${tenantId}`;
  }

  /**
   * Generates tenant-isolated cache key for the monthly time-series trend.
   */
  getMonthlyTrendKey(tenantId: string, limit: number): string {
    return `${ANALYTICS_CACHE_PREFIX}:monthly_trend:${tenantId}:${limit}`;
  }

  /**
   * Check if Redis connection is active and healthy.
   */
  isAvailable(): boolean {
    return this.isRedisReady && this.client !== null && this.client.status === 'ready';
  }

  /**
   * Retrieve cached value by key. Returns null on miss or Redis unavailability.
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.client || !this.isRedisReady) {
      return null;
    }

    try {
      const data = await this.client.get(key);
      if (!data) {
        return null;
      }
      return JSON.parse(data) as T;
    } catch (err: any) {
      RedisQuotaErrorThrottler.logThrottled(
        this.logger,
        `Redis Cache GET ${key}`,
        err,
        'warn'
      );
      return null;
    }
  }

  /**
   * Store value in Redis cache with short TTL (defaults to 300 seconds / 5 mins).
   */
  async set<T>(key: string, value: T, customTtlSeconds?: number): Promise<void> {
    if (!this.client || !this.isRedisReady) {
      return;
    }

    const ttl = customTtlSeconds || this.ttlSeconds;

    try {
      const serialized = JSON.stringify(value);
      await this.client.set(key, serialized, 'EX', ttl);
    } catch (err: any) {
      RedisQuotaErrorThrottler.logThrottled(
        this.logger,
        `Redis Cache SET ${key}`,
        err,
        'warn'
      );
    }
  }

  /**
   * Invalidate specific key from Redis cache.
   */
  async del(key: string): Promise<void> {
    if (!this.client || !this.isRedisReady) {
      return;
    }

    try {
      await this.client.del(key);
    } catch (err: any) {
      RedisQuotaErrorThrottler.logThrottled(
        this.logger,
        `Redis Cache DEL ${key}`,
        err,
        'warn'
      );
    }
  }

  /**
   * Invalidate all cached dashboard metrics for a specific agency tenant.
   */
  async invalidateTenant(tenantId: string): Promise<void> {
    if (!this.client || !this.isRedisReady) {
      return;
    }

    try {
      const pattern = `${ANALYTICS_CACHE_PREFIX}:*:${tenantId}*`;
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
        this.logger.log(`Invalidated ${keys.length} cached analytics keys for tenant: ${tenantId}`);
      }
    } catch (err: any) {
      RedisQuotaErrorThrottler.logThrottled(
        this.logger,
        `Redis Cache InvalidateTenant ${tenantId}`,
        err,
        'warn'
      );
    }
  }

  /**
   * Invalidate all cached dashboard metrics across all agencies.
   * Invoked after materialized views refresh.
   */
  async invalidateAll(): Promise<void> {
    if (!this.client || !this.isRedisReady) {
      return;
    }

    try {
      const pattern = `${ANALYTICS_CACHE_PREFIX}:*`;
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
        this.logger.log(`Invalidated ${keys.length} cached analytics keys across all tenants.`);
      }
    } catch (err: any) {
      RedisQuotaErrorThrottler.logThrottled(
        this.logger,
        'Redis Cache InvalidateAll',
        err,
        'warn'
      );
    }
  }
}
