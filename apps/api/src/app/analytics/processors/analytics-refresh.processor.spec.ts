import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsRefreshProcessor } from './analytics-refresh.processor';
import { AnalyticsService } from '../analytics.service';
import { Job } from 'bullmq';
import { ANALYTICS_REFRESH_JOB } from '../constants/analytics.constants';

describe('AnalyticsRefreshProcessor', () => {
  let processor: AnalyticsRefreshProcessor;
  let analyticsService: jest.Mocked<Partial<AnalyticsService>>;

  beforeEach(async () => {
    analyticsService = {
      refreshMaterializedViews: jest.fn().mockResolvedValue({
        success: true,
        refreshedAt: '2026-09-30T10:00:00.000Z',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsRefreshProcessor,
        {
          provide: AnalyticsService,
          useValue: analyticsService,
        },
      ],
    }).compile();

    processor = module.get<AnalyticsRefreshProcessor>(AnalyticsRefreshProcessor);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('process', () => {
    it('should invoke analyticsService.refreshMaterializedViews and return execution duration', async () => {
      const mockJob = {
        id: 'job-101',
        name: ANALYTICS_REFRESH_JOB,
        data: { triggeredBy: 'cron' },
      } as unknown as Job;

      const result = await processor.process(mockJob);

      expect(analyticsService.refreshMaterializedViews).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
      expect(result.refreshedAt).toBe('2026-09-30T10:00:00.000Z');
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should throw and log error when refreshMaterializedViews fails', async () => {
      analyticsService.refreshMaterializedViews = jest
        .fn()
        .mockRejectedValue(new Error('PostgreSQL refresh deadlocked'));

      const mockJob = {
        id: 'job-102',
        name: ANALYTICS_REFRESH_JOB,
        data: {},
      } as unknown as Job;

      await expect(processor.process(mockJob)).rejects.toThrow(
        'PostgreSQL refresh deadlocked'
      );
    });
  });

  describe('events', () => {
    it('should handle onCompleted event gracefully', () => {
      const mockJob = { id: 'job-101', name: ANALYTICS_REFRESH_JOB } as Job;
      expect(() => processor.onCompleted(mockJob)).not.toThrow();
    });

    it('should handle onFailed event gracefully', () => {
      const mockJob = { id: 'job-102' } as Job;
      const error = new Error('Connection timeout');
      expect(() => processor.onFailed(mockJob, error)).not.toThrow();
    });
  });
});
