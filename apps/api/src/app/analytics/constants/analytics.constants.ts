export const ANALYTICS_REFRESH_QUEUE = 'analytics-refresh';
export const ANALYTICS_REFRESH_JOB = 'refresh-materialized-views';
export const DEFAULT_ANALYTICS_REFRESH_CRON = '0 * * * *'; // Hourly on the hour (e.g., 01:00, 02:00, etc.)

// Short TTL Redis Cache Configuration for Dashboard Queries
export const DEFAULT_ANALYTICS_CACHE_TTL = 300; // 5 minutes in seconds
export const ANALYTICS_CACHE_PREFIX = 'analytics';
