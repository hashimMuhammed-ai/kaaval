import { ConfigService } from '@nestjs/config';
import {
  RedisConnectionHelper,
  RedisQuotaErrorThrottler,
} from './redis-connection.helper';

describe('RedisConnectionHelper & RedisQuotaErrorThrottler', () => {
  beforeEach(() => {
    RedisQuotaErrorThrottler.reset();
  });

  describe('RedisConnectionHelper.isLocalHost', () => {
    it('should identify local hosts', () => {
      expect(RedisConnectionHelper.isLocalHost('localhost')).toBe(true);
      expect(RedisConnectionHelper.isLocalHost('127.0.0.1')).toBe(true);
      expect(RedisConnectionHelper.isLocalHost('0.0.0.0')).toBe(true);
      expect(RedisConnectionHelper.isLocalHost('::1')).toBe(true);
      expect(RedisConnectionHelper.isLocalHost('redis')).toBe(true);
      expect(RedisConnectionHelper.isLocalHost('host.docker.internal')).toBe(true);
      expect(RedisConnectionHelper.isLocalHost(undefined)).toBe(true);
    });

    it('should identify non-local hosts', () => {
      expect(
        RedisConnectionHelper.isLocalHost('awake-lioness-183783.upstash.io')
      ).toBe(false);
      expect(RedisConnectionHelper.isLocalHost('my-redis.cloud.com')).toBe(false);
      expect(RedisConnectionHelper.isLocalHost('192.168.1.100')).toBe(false);
    });
  });

  describe('RedisConnectionHelper.isRemoteRedis', () => {
    it('should detect remote Redis from URL and host', () => {
      expect(
        RedisConnectionHelper.isRemoteRedis(
          'rediss://default:pwd@awake-lioness-183783.upstash.io:6379'
        )
      ).toBe(true);
      expect(
        RedisConnectionHelper.isRemoteRedis('redis://my-redis.example.com:6379')
      ).toBe(true);
      expect(
        RedisConnectionHelper.isRemoteRedis('redis://localhost:6379')
      ).toBe(false);
      expect(
        RedisConnectionHelper.isRemoteRedis('redis://127.0.0.1:6379')
      ).toBe(false);
      expect(RedisConnectionHelper.isRemoteRedis(undefined)).toBe(false);
    });

    it('should detect TLS rediss: protocol as remote regardless of host', () => {
      expect(RedisConnectionHelper.isRemoteRedis('rediss://localhost:6379')).toBe(
        true
      );
    });
  });

  describe('RedisConnectionHelper.isRemoteBlockedInDev', () => {
    it('should block remote Redis in development when override is not set', () => {
      const isBlocked = RedisConnectionHelper.isRemoteBlockedInDev(
        'rediss://default:pwd@upstash.io:6379',
        'development',
        false
      );
      expect(isBlocked).toBe(true);
    });

    it('should not block remote Redis in production', () => {
      const isBlocked = RedisConnectionHelper.isRemoteBlockedInDev(
        'rediss://default:pwd@upstash.io:6379',
        'production',
        false
      );
      expect(isBlocked).toBe(false);
    });

    it('should not block remote Redis when allowRemoteInDev is true', () => {
      const isBlocked = RedisConnectionHelper.isRemoteBlockedInDev(
        'rediss://default:pwd@upstash.io:6379',
        'development',
        true
      );
      expect(isBlocked).toBe(false);
    });

    it('should not block local Redis in development', () => {
      const isBlocked = RedisConnectionHelper.isRemoteBlockedInDev(
        'redis://localhost:6379',
        'development',
        false
      );
      expect(isBlocked).toBe(false);
    });
  });

  describe('RedisConnectionHelper.sanitizeRedisUrl', () => {
    it('should mask credentials in Redis URL', () => {
      const sanitized = RedisConnectionHelper.sanitizeRedisUrl(
        'rediss://default:supersecretpassword@awake-lioness-183783.upstash.io:6379'
      );
      expect(sanitized).toBe(
        'rediss://***:***@awake-lioness-183783.upstash.io:6379'
      );
      expect(sanitized).not.toContain('supersecretpassword');
    });

    it('should return plain host if no credentials present', () => {
      expect(
        RedisConnectionHelper.sanitizeRedisUrl('redis://localhost:6379')
      ).toBe('redis://localhost:6379');
    });
  });

  describe('RedisConnectionHelper.resolveBullConfig', () => {
    it('should throw security guard error if remote Redis is used in dev with worker enabled', () => {
      const mockConfig = {
        get: jest.fn().mockImplementation((key: string, defaultVal?: any) => {
          if (key === 'NODE_ENV') return 'development';
          if (key === 'REDIS_URL')
            return 'rediss://default:secret@careful-terrapin.upstash.io:6379';
          if (key === 'ALLOW_REMOTE_REDIS_IN_DEV') return 'false';
          if (key === 'ENABLE_ANALYTICS_WORKER') return 'true';
          return defaultVal;
        }),
      } as unknown as ConfigService;

      expect(() =>
        RedisConnectionHelper.resolveBullConfig(mockConfig)
      ).toThrow(/\[RedisGuard\] SECURITY GUARD: Blocked connection/);
    });

    it('should safely redirect to localhost if remote Redis is used in dev with worker disabled', () => {
      const mockConfig = {
        get: jest.fn().mockImplementation((key: string, defaultVal?: any) => {
          if (key === 'NODE_ENV') return 'development';
          if (key === 'REDIS_URL')
            return 'rediss://default:secret@careful-terrapin.upstash.io:6379';
          if (key === 'ALLOW_REMOTE_REDIS_IN_DEV') return 'false';
          if (key === 'ENABLE_ANALYTICS_WORKER') return 'false';
          return defaultVal;
        }),
      } as unknown as ConfigService;

      const result = RedisConnectionHelper.resolveBullConfig(mockConfig);
      expect(result).toEqual({
        host: 'localhost',
        port: 6379,
        maxRetriesPerRequest: null,
        retryStrategy: expect.any(Function),
      });
    });

    it('should allow remote Redis in production unchanged', () => {
      const remoteUrl =
        'rediss://default:secret@careful-terrapin.upstash.io:6379';
      const mockConfig = {
        get: jest.fn().mockImplementation((key: string, defaultVal?: any) => {
          if (key === 'NODE_ENV') return 'production';
          if (key === 'REDIS_URL') return remoteUrl;
          return defaultVal;
        }),
      } as unknown as ConfigService;

      const result = RedisConnectionHelper.resolveBullConfig(mockConfig);
      expect(result).toEqual({
        url: remoteUrl,
        maxRetriesPerRequest: null,
      });
    });

    it('should configure localhost fallback when no REDIS_URL is provided', () => {
      const mockConfig = {
        get: jest.fn().mockImplementation((key: string, defaultVal?: any) => {
          if (key === 'NODE_ENV') return 'development';
          if (key === 'REDIS_URL') return undefined;
          if (key === 'REDIS_HOST') return 'localhost';
          if (key === 'REDIS_PORT') return '6379';
          return defaultVal;
        }),
      } as unknown as ConfigService;

      const result = RedisConnectionHelper.resolveBullConfig(mockConfig);
      expect(result).toEqual({
        host: 'localhost',
        port: 6379,
        password: undefined,
        maxRetriesPerRequest: null,
      });
    });
  });

  describe('RedisQuotaErrorThrottler', () => {
    it('should recognize Upstash quota exceeded errors', () => {
      expect(
        RedisQuotaErrorThrottler.isQuotaError(
          new Error('ERR max requests limit exceeded. Limit: 500000, Usage: 500004')
        )
      ).toBe(true);
      expect(
        RedisQuotaErrorThrottler.isQuotaError('Daily request limit exceeded')
      ).toBe(true);
      expect(
        RedisQuotaErrorThrottler.isQuotaError(new Error('connect ECONNREFUSED 127.0.0.1:6379'))
      ).toBe(false);
    });

    it('should log the first quota error and suppress subsequent errors within the 15-minute window', () => {
      const mockLogger = {
        warn: jest.fn(),
        error: jest.fn(),
      };

      const error = new Error(
        'ERR max requests limit exceeded. Limit: 500000, Usage: 500004'
      );

      // 1st occurrence: Should log
      const logged1 = RedisQuotaErrorThrottler.logThrottled(
        mockLogger,
        'TestContext',
        error,
        'warn'
      );
      expect(logged1).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Further quota error logs suppressed for 15 minutes')
      );

      // 2nd occurrence: Should be suppressed
      const logged2 = RedisQuotaErrorThrottler.logThrottled(
        mockLogger,
        'TestContext',
        error,
        'warn'
      );
      expect(logged2).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledTimes(1); // Still 1
      expect(RedisQuotaErrorThrottler.getSuppressedCount()).toBe(1);

      // 3rd occurrence: Should be suppressed
      const logged3 = RedisQuotaErrorThrottler.logThrottled(
        mockLogger,
        'TestContext',
        error,
        'warn'
      );
      expect(logged3).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expect(RedisQuotaErrorThrottler.getSuppressedCount()).toBe(2);
    });

    it('should log non-quota errors immediately without suppression', () => {
      const mockLogger = {
        warn: jest.fn(),
        error: jest.fn(),
      };

      const nonQuotaError = new Error('Syntax error in Lua script');

      const logged1 = RedisQuotaErrorThrottler.logThrottled(
        mockLogger,
        'TestContext',
        nonQuotaError,
        'error'
      );
      const logged2 = RedisQuotaErrorThrottler.logThrottled(
        mockLogger,
        'TestContext',
        nonQuotaError,
        'error'
      );

      expect(logged1).toBe(true);
      expect(logged2).toBe(true);
      expect(mockLogger.error).toHaveBeenCalledTimes(2);
    });
  });
});
