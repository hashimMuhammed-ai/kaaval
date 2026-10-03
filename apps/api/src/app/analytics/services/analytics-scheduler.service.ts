import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import {
  ANALYTICS_REFRESH_QUEUE,
  ANALYTICS_REFRESH_JOB,
  DEFAULT_ANALYTICS_REFRESH_CRON,
} from '../constants/analytics.constants';

@Injectable()
export class AnalyticsSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(AnalyticsSchedulerService.name);
  private readonly cronSchedule: string;

  constructor(
    @Optional()
    @InjectQueue(ANALYTICS_REFRESH_QUEUE)
    private readonly refreshQueue?: Queue,
    private readonly configService?: ConfigService
  ) {
    this.cronSchedule =
      this.configService?.get<string>('ANALYTICS_REFRESH_CRON') ||
      DEFAULT_ANALYTICS_REFRESH_CRON;
  }

  async onModuleInit() {
    if (!this.refreshQueue) {
      this.logger.warn('BullMQ refreshQueue not available. Skipping automatic cron setup.');
      return;
    }

    try {
      await this.initScheduledJob();
    } catch (err: any) {
      this.logger.error(
        `Failed to initialize BullMQ scheduled job on queue ${ANALYTICS_REFRESH_QUEUE}: ${err.message}`,
        err.stack
      );
    }
  }

  /**
   * Registers or ensures the repeatable BullMQ cron job is configured.
   */
  async initScheduledJob(): Promise<void> {
    if (!this.refreshQueue) return;

    this.logger.log(
      `Initializing BullMQ scheduled job for materialized views refresh with cron: "${this.cronSchedule}"`
    );

    // Fetch existing repeatable jobs to avoid duplicates
    const repeatableJobs = await this.refreshQueue.getRepeatableJobs();
    const existing = repeatableJobs.find(
      (job) => job.name === ANALYTICS_REFRESH_JOB
    );

    if (existing) {
      this.logger.log(
        `Found existing repeatable job: ${existing.key} (pattern: ${existing.pattern})`
      );
      if (existing.pattern === this.cronSchedule) {
        this.logger.log('Existing cron pattern matches configuration. Retaining scheduled job.');
        return;
      }
      this.logger.log('Cron pattern updated. Removing previous repeatable job...');
      await this.refreshQueue.removeRepeatableByKey(existing.key);
    }

    // Add repeatable job with cron pattern
    await this.refreshQueue.add(
      ANALYTICS_REFRESH_JOB,
      { triggeredBy: 'cron', timestamp: new Date().toISOString() },
      {
        repeat: {
          pattern: this.cronSchedule,
        },
        removeOnComplete: true,
        removeOnFail: 20,
      }
    );

    this.logger.log(
      `Successfully registered BullMQ repeatable job for ${ANALYTICS_REFRESH_JOB} with cron pattern: ${this.cronSchedule}`
    );
  }

  /**
   * Trigger an immediate background job to refresh materialized views via BullMQ.
   */
  async triggerRefreshNow(triggeredBy = 'manual'): Promise<{ jobId: string; status: string }> {
    if (!this.refreshQueue) {
      throw new Error('BullMQ queue is not available.');
    }

    const job = await this.refreshQueue.add(
      ANALYTICS_REFRESH_JOB,
      { triggeredBy, timestamp: new Date().toISOString() },
      {
        removeOnComplete: true,
        removeOnFail: 20,
      }
    );

    this.logger.log(`Enqueued immediate refresh job: ID=${job.id}`);
    return {
      jobId: String(job.id),
      status: 'enqueued',
    };
  }

  /**
   * Retrieves current BullMQ queue status and repeatable job details.
   */
  async getQueueStatus(): Promise<{
    queueName: string;
    cronSchedule: string;
    isPaused: boolean;
    counts: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    };
    repeatableJobs: any[];
  }> {
    if (!this.refreshQueue) {
      return {
        queueName: ANALYTICS_REFRESH_QUEUE,
        cronSchedule: this.cronSchedule,
        isPaused: true,
        counts: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
        repeatableJobs: [],
      };
    }

    const [isPaused, counts, repeatableJobs] = await Promise.all([
      this.refreshQueue.isPaused(),
      this.refreshQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      this.refreshQueue.getRepeatableJobs(),
    ]);

    return {
      queueName: ANALYTICS_REFRESH_QUEUE,
      cronSchedule: this.cronSchedule,
      isPaused,
      counts: {
        waiting: counts.waiting || 0,
        active: counts.active || 0,
        completed: counts.completed || 0,
        failed: counts.failed || 0,
        delayed: counts.delayed || 0,
      },
      repeatableJobs,
    };
  }
}
