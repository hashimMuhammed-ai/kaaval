import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { AnalyticsSchedulerService } from './analytics-scheduler.service';
import {
  ANALYTICS_REFRESH_QUEUE,
  ANALYTICS_REFRESH_JOB,
  DEFAULT_ANALYTICS_REFRESH_CRON,
} from '../constants/analytics.constants';
import { getQueueToken } from '@nestjs/bullmq';

describe('AnalyticsSchedulerService', () => {
  let service: AnalyticsSchedulerService;
  let mockQueue: jest.Mocked<Partial<Queue>>;
  let mockConfigService: jest.Mocked<Partial<ConfigService>>;

  beforeEach(async () => {
    mockQueue = {
      getRepeatableJobs: jest.fn().mockResolvedValue([]),
      add: jest.fn().mockResolvedValue({ id: 'job-123' } as any),
      removeRepeatableByKey: jest.fn().mockResolvedValue(true as any),
      isPaused: jest.fn().mockResolvedValue(false),
      getJobCounts: jest.fn().mockResolvedValue({
        waiting: 1,
        active: 0,
        completed: 24,
        failed: 0,
        delayed: 0,
      } as any),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue(DEFAULT_ANALYTICS_REFRESH_CRON),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsSchedulerService,
        {
          provide: getQueueToken(ANALYTICS_REFRESH_QUEUE),
          useValue: mockQueue,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AnalyticsSchedulerService>(AnalyticsSchedulerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit / initScheduledJob', () => {
    it('should register repeatable cron job when none exists', async () => {
      await service.onModuleInit();

      expect(mockQueue.getRepeatableJobs).toHaveBeenCalled();
      expect(mockQueue.add).toHaveBeenCalledWith(
        ANALYTICS_REFRESH_JOB,
        expect.objectContaining({ triggeredBy: 'cron' }),
        expect.objectContaining({
          repeat: { pattern: DEFAULT_ANALYTICS_REFRESH_CRON },
        })
      );
    });

    it('should retain existing repeatable job if cron pattern matches', async () => {
      mockQueue.getRepeatableJobs = jest.fn().mockResolvedValue([
        {
          key: 'analytics-refresh:::0 * * * *',
          name: ANALYTICS_REFRESH_JOB,
          pattern: DEFAULT_ANALYTICS_REFRESH_CRON,
        },
      ] as any);

      await service.onModuleInit();

      expect(mockQueue.removeRepeatableByKey).not.toHaveBeenCalled();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('should replace repeatable job if cron pattern has changed', async () => {
      mockQueue.getRepeatableJobs = jest.fn().mockResolvedValue([
        {
          key: 'analytics-refresh:::*/30 * * * *',
          name: ANALYTICS_REFRESH_JOB,
          pattern: '*/30 * * * *',
        },
      ] as any);

      await service.onModuleInit();

      expect(mockQueue.removeRepeatableByKey).toHaveBeenCalledWith(
        'analytics-refresh:::*/30 * * * *'
      );
      expect(mockQueue.add).toHaveBeenCalledWith(
        ANALYTICS_REFRESH_JOB,
        expect.objectContaining({ triggeredBy: 'cron' }),
        expect.objectContaining({
          repeat: { pattern: DEFAULT_ANALYTICS_REFRESH_CRON },
        })
      );
    });

    it('should skip scheduled job registration when ENABLE_ANALYTICS_WORKER=false', async () => {
      mockConfigService.get = jest.fn().mockImplementation((key: string) => {
        if (key === 'ENABLE_ANALYTICS_WORKER') return 'false';
        return DEFAULT_ANALYTICS_REFRESH_CRON;
      });

      await service.onModuleInit();

      expect(mockQueue.getRepeatableJobs).not.toHaveBeenCalled();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('triggerRefreshNow', () => {
    it('should enqueue immediate one-off refresh job when worker is enabled', async () => {
      const result = await service.triggerRefreshNow('manual-admin');

      expect(mockQueue.add).toHaveBeenCalledWith(
        ANALYTICS_REFRESH_JOB,
        expect.objectContaining({ triggeredBy: 'manual-admin' }),
        expect.objectContaining({ removeOnComplete: true })
      );
      expect(result).toEqual({ jobId: 'job-123', status: 'enqueued' });
    });

    it('should throw an error when ENABLE_ANALYTICS_WORKER=false', async () => {
      mockConfigService.get = jest.fn().mockImplementation((key: string) => {
        if (key === 'ENABLE_ANALYTICS_WORKER') return 'false';
        return DEFAULT_ANALYTICS_REFRESH_CRON;
      });

      await expect(service.triggerRefreshNow('manual-admin')).rejects.toThrow(
        /ENABLE_ANALYTICS_WORKER=false/
      );
      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('getQueueStatus', () => {
    it('should return queue metrics, pause state, and repeatable jobs list', async () => {
      const result = await service.getQueueStatus();

      expect(result.queueName).toBe(ANALYTICS_REFRESH_QUEUE);
      expect(result.cronSchedule).toBe(DEFAULT_ANALYTICS_REFRESH_CRON);
      expect(result.isPaused).toBe(false);
      expect(result.workerEnabled).toBe(true);
      expect(result.counts.completed).toBe(24);
      expect(result.counts.waiting).toBe(1);
    });

    it('should return safe inactive state with counts: null without querying queue when ENABLE_ANALYTICS_WORKER=false', async () => {
      mockConfigService.get = jest.fn().mockImplementation((key: string) => {
        if (key === 'ENABLE_ANALYTICS_WORKER') return 'false';
        return DEFAULT_ANALYTICS_REFRESH_CRON;
      });

      const result = await service.getQueueStatus();

      expect(result.isPaused).toBe(true);
      expect(result.workerEnabled).toBe(false);
      expect(result.counts).toBeNull();
      expect(result.message).toContain('ENABLE_ANALYTICS_WORKER=false');
      expect(mockQueue.getJobCounts).not.toHaveBeenCalled();
      expect(mockQueue.isPaused).not.toHaveBeenCalled();
    });

    it('should handle Redis error in getQueueStatus gracefully with counts: null', async () => {
      mockQueue.getJobCounts = jest
        .fn()
        .mockRejectedValue(
          new Error('ERR max requests limit exceeded. Limit: 500000, Usage: 500004')
        );

      const result = await service.getQueueStatus();

      expect(result.isPaused).toBe(true);
      expect(result.counts).toBeNull();
      expect(result.message).toContain('Queue status unavailable');
      expect(result.repeatableJobs).toEqual([]);
    });
  });
});
