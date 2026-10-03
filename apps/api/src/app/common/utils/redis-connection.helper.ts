import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Throttles and deduplicates repeated Redis / Upstash quota limit errors
 * to prevent flooding application logs.
 */
export class RedisQuotaErrorThrottler {
  private static lastLogTime = 0;
  private static suppressedCount = 0;
  private static readonly THROTTLE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  /**
   * Check whether an error is an Upstash or Redis request/quota limit exceeded error.
   */
  static isQuotaError(error: any): boolean {
    if (!error) return false;
    const msg = typeof error === 'string' ? error : error.message || String(error);
    return (
      msg.includes('max requests limit exceeded') ||
      msg.includes('ERR max requests limit exceeded') ||
      msg.includes('quota exceeded') ||
      msg.includes('Daily request limit exceeded') ||
      msg.includes('Monthly request limit exceeded')
    );
  }

  /**
   * Log quota error with throttling (at most once every 15 minutes).
   * Non-quota errors are always logged immediately.
   *
   * @returns true if logged, false if throttled/suppressed
   */
  static logThrottled(
    logger: { warn: (msg: string) => void; error: (msg: string) => void },
    context: string,
    error: any,
    level: 'warn' | 'error' = 'warn'
  ): boolean {
    const now = Date.now();
    const isQuota = this.isQuotaError(error);

    if (!isQuota) {
      const msg = error?.message || String(error);
      if (level === 'error') {
        logger.error(`[${context}] ${msg}`);
      } else {
        logger.warn(`[${context}] ${msg}`);
      }
      return true;
    }

    if (now - this.lastLogTime >= this.THROTTLE_WINDOW_MS) {
      const suppressedMsg =
        this.suppressedCount > 0
          ? ` (${this.suppressedCount} repeated quota errors suppressed in previous window)`
          : '';
      const errMsg = error?.message || String(error);
      const logMessage = `[${context}] Upstash Redis quota limit exceeded: "${errMsg}". Further quota error logs suppressed for 15 minutes.${suppressedMsg}`;

      if (level === 'error') {
        logger.error(logMessage);
      } else {
        logger.warn(logMessage);
      }

      this.lastLogTime = now;
      this.suppressedCount = 0;
      return true;
    } else {
      this.suppressedCount++;
      return false;
    }
  }

  /**
   * Reset throttling state (primarily for unit test isolation).
   */
  static reset(): void {
    this.lastLogTime = 0;
    this.suppressedCount = 0;
  }

  static getSuppressedCount(): number {
    return this.suppressedCount;
  }

  static getLastLogTime(): number {
    return this.lastLogTime;
  }
}

/**
 * Validates Redis connection parameters and guards against accidental
 * connections from local development to production Upstash Redis.
 */
export class RedisConnectionHelper {
  private static readonly logger = new Logger(RedisConnectionHelper.name);

  /**
   * Check if a hostname corresponds to a local loopback or local container address.
   */
  static isLocalHost(host?: string): boolean {
    if (!host) return true;
    const normalized = host.trim().toLowerCase();
    const localHosts = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '::1',
      'redis',
      'host.docker.internal',
    ];
    return localHosts.includes(normalized);
  }

  /**
   * Check if a host string or connection URL points to a remote (non-local) Redis instance.
   */
  static isRemoteRedis(hostOrUrl?: string): boolean {
    if (!hostOrUrl) return false;
    try {
      if (hostOrUrl.includes('://')) {
        const parsed = new URL(hostOrUrl);
        if (parsed.protocol === 'rediss:') return true;
        return !this.isLocalHost(parsed.hostname);
      }
      return !this.isLocalHost(hostOrUrl);
    } catch {
      return hostOrUrl.includes('upstash.io');
    }
  }

  /**
   * Check whether a connection to remote Redis should be blocked in development/test.
   */
  static isRemoteBlockedInDev(
    hostOrUrl: string | undefined,
    nodeEnv: string | undefined,
    allowRemoteInDev: boolean
  ): boolean {
    const isProduction = nodeEnv === 'production';
    if (isProduction) return false;
    if (allowRemoteInDev) return false;
    return this.isRemoteRedis(hostOrUrl);
  }

  /**
   * Safely sanitize a Redis connection string by masking any password/credentials.
   */
  static sanitizeRedisUrl(urlOrHost?: string): string {
    if (!urlOrHost) return 'undefined';
    try {
      if (urlOrHost.includes('://')) {
        const parsed = new URL(urlOrHost);
        const auth = parsed.password ? '***:***@' : '';
        return `${parsed.protocol}//${auth}${parsed.hostname}:${parsed.port || '6379'}`;
      }
      return urlOrHost;
    } catch {
      return 'invalid-url';
    }
  }

  /**
   * Resolves BullMQ connection configuration from ConfigService.
   * In non-production environments, blocks connection to remote Upstash Redis unless explicitly allowed.
   */
  static resolveBullConfig(configService: ConfigService) {
    const nodeEnv = configService.get<string>('NODE_ENV', 'development');
    const isProduction = nodeEnv === 'production';
    const redisUrl = configService.get<string>('REDIS_URL');
    const allowRemote =
      configService.get<string>('ALLOW_REMOTE_REDIS_IN_DEV') === 'true';

    // Guard: Prevent non-production environments from connecting to remote/Upstash Redis
    if (!isProduction && this.isRemoteRedis(redisUrl) && !allowRemote) {
      const sanitized = this.sanitizeRedisUrl(redisUrl);
      const isWorkerEnabled =
        configService.get<string>('ENABLE_ANALYTICS_WORKER') !== 'false' &&
        configService.get<string>('ENABLE_ANALYTICS_WORKER') !== '0';

      if (isWorkerEnabled) {
        throw new Error(
          `[RedisGuard] SECURITY GUARD: Blocked connection to remote Redis in ${nodeEnv} (${sanitized}). ` +
            `Never connect local development to production Upstash Redis. ` +
            `To use Redis locally, point REDIS_URL to localhost:6379. ` +
            `To disable the background worker, set ENABLE_ANALYTICS_WORKER=false. ` +
            `To explicitly override this guard, set ALLOW_REMOTE_REDIS_IN_DEV=true.`
        );
      } else {
        this.logger.warn(
          `[RedisGuard] Blocked remote Redis in ${nodeEnv} (${sanitized}) with worker disabled. Pointing BullModule connection to localhost:6379.`
        );
        return {
          host: 'localhost',
          port: 6379,
          maxRetriesPerRequest: null,
          retryStrategy: () => null,
        };
      }
    }

    if (redisUrl) {
      return {
        url: redisUrl,
        maxRetriesPerRequest: null,
      };
    }

    return {
      host: configService.get<string>('REDIS_HOST', 'localhost'),
      port: parseInt(configService.get<string>('REDIS_PORT', '6379'), 10),
      password: configService.get<string>('REDIS_PASSWORD') || undefined,
      maxRetriesPerRequest: null,
    };
  }
}
