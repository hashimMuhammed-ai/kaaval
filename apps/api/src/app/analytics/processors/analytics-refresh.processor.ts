import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AnalyticsService } from '../analytics.service';
import {
  ANALYTICS_REFRESH_QUEUE,
  ANALYTICS_REFRESH_JOB,
} from '../constants/analytics.constants';

@Processor(ANALYTICS_REFRESH_QUEUE)
export class AnalyticsRefreshProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalyticsRefreshProcessor.name);

  constructor(private readonly analyticsService: AnalyticsService) {
    super();
  }

  /**
   * Process background jobs to refresh analytics materialized views.
   * Invoked automatically by BullMQ repeatable cron schedule or on-demand trigger.
   */
  async process(
    job: Job<any, any, string>
  ): Promise<{ success: boolean; refreshedAt: string; durationMs: number }> {
    this.logger.log(
      `[BullMQ] Processing job ${job.id} (${job.name}) on queue ${ANALYTICS_REFRESH_QUEUE}...`
    );
    const startTime = Date.now();

    try {
      const result = await this.analyticsService.refreshMaterializedViews();
      const durationMs = Date.now() - startTime;
      this.logger.log(
        `[BullMQ] Job ${job.id} completed successfully in ${durationMs}ms.`
      );

      return {
        success: result.success,
        refreshedAt: result.refreshedAt,
        durationMs,
      };
    } catch (error: any) {
      this.logger.error(
        `[BullMQ] Error refreshing materialized views for job ${job.id}: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(
      `[BullMQ] Job ${job.id} (${job.name}) marked as completed.`
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `[BullMQ] Job ${job?.id} failed with error: ${error.message}`
    );
  }
}
