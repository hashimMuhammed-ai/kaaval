import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AnalyticsCacheService } from './analytics-cache.service';
import {
  DEFAULT_ANALYTICS_CACHE_TTL,
  ANALYTICS_CACHE_PREFIX,
} from '../constants/analytics.constants';

describe('AnalyticsCacheService', () => {
  let service: AnalyticsCacheService;
  let mockRedis: jest.Mocked<Partial<Redis>>;
  let mockConfigService: jest.Mocked<Partial<ConfigService>>;

  beforeEach(async () => {
    mockRedis = {
      status: 'ready',
      get: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      keys: jest.fn().mockResolvedValue([]),
      quit: jest.fn().mockResolvedValue('OK'),
      on: jest.fn().mockReturnThis(),
      connect: jest.fn().mockResolvedValue({} as any),
    };

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'ANALYTICS_CACHE_TTL_SECONDS') return '300';
        if (key === 'REDIS_HOST') return 'localhost';
        if (key === 'REDIS_PORT') return '6379';
        return defaultValue;
      }) as any,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: AnalyticsCacheService,
          useFactory: (config: ConfigService) => {
            return new AnalyticsCacheService(config, mockRedis as any);
          },
          inject: [ConfigService],
        },
      ],
    }).compile();

    service = module.get<AnalyticsCacheService>(AnalyticsCacheService);
  });

  it('should be defined and report ready status when client is connected', () => {
    expect(service).toBeDefined();
    expect(service.isAvailable()).toBe(true);
  });

  describe('key generation', () => {
    it('should generate tenant-isolated overview cache key', () => {
      const key = service.getOverviewKey('tenant-abc-123');
      expect(key).toBe(`${ANALYTICS_CACHE_PREFIX}:overview:tenant-abc-123`);
    });

    it('should generate tenant-isolated monthly trend cache key with limit', () => {
      const key = service.getMonthlyTrendKey('tenant-abc-123', 6);
      expect(key).toBe(`${ANALYTICS_CACHE_PREFIX}:monthly_trend:tenant-abc-123:6`);
    });
  });

  describe('get', () => {
    it('should parse and return cached object on hit', async () => {
      const mockData = { occupancyRatePct: 82.5, totalCaregivers: 15 };
      mockRedis.get = jest.fn().mockResolvedValue(JSON.stringify(mockData));

      const result = await service.get<typeof mockData>('analytics:overview:tenant-1');

      expect(mockRedis.get).toHaveBeenCalledWith('analytics:overview:tenant-1');
      expect(result).toEqual(mockData);
    });

    it('should return null on cache miss', async () => {
      mockRedis.get = jest.fn().mockResolvedValue(null);

      const result = await service.get('analytics:overview:tenant-1');

      expect(result).toBeNull();
    });

    it('should handle Redis get errors gracefully by returning null', async () => {
      mockRedis.get = jest.fn().mockRejectedValue(new Error('Connection lost'));

      const result = await service.get('analytics:overview:tenant-1');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should serialize and set key with short TTL (300 seconds default)', async () => {
      const data = { grossRevenue: 250000 };

      await service.set('analytics:overview:tenant-1', data);

      expect(mockRedis.set).toHaveBeenCalledWith(
        'analytics:overview:tenant-1',
        JSON.stringify(data),
        'EX',
        300
      );
    });

    it('should respect custom TTL when specified', async () => {
      const data = { grossRevenue: 250000 };

      await service.set('analytics:overview:tenant-1', data, 60);

      expect(mockRedis.set).toHaveBeenCalledWith(
        'analytics:overview:tenant-1',
        JSON.stringify(data),
        'EX',
        60
      );
    });

    it('should handle Redis write errors gracefully without throwing', async () => {
      mockRedis.set = jest.fn().mockRejectedValue(new Error('Read-only replica'));

      await expect(service.set('test-key', { a: 1 })).resolves.not.toThrow();
    });
  });

  describe('del and invalidation', () => {
    it('should delete a specific key from Redis', async () => {
      await service.del('analytics:overview:tenant-1');
      expect(mockRedis.del).toHaveBeenCalledWith('analytics:overview:tenant-1');
    });

    it('should invalidate all cached keys for a specific tenant', async () => {
      const tenantKeys = [
        'analytics:overview:tenant-1',
        'analytics:monthly_trend:tenant-1:12',
        'analytics:monthly_trend:tenant-1:6',
      ];
      mockRedis.keys = jest.fn().mockResolvedValue(tenantKeys);

      await service.invalidateTenant('tenant-1');

      expect(mockRedis.keys).toHaveBeenCalledWith('analytics:*:tenant-1*');
      expect(mockRedis.del).toHaveBeenCalledWith(...tenantKeys);
    });

    it('should invalidate all analytics keys on demand', async () => {
      const allKeys = [
        'analytics:overview:tenant-1',
        'analytics:overview:tenant-2',
      ];
      mockRedis.keys = jest.fn().mockResolvedValue(allKeys);

      await service.invalidateAll();

      expect(mockRedis.keys).toHaveBeenCalledWith('analytics:*');
      expect(mockRedis.del).toHaveBeenCalledWith(...allKeys);
    });
  });
});
