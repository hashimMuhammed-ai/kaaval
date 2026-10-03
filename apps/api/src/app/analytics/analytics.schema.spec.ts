import * as fs from 'fs';
import * as path from 'path';
import { OwnerMonthlyAnalytics } from './entities/owner-monthly-analytics.entity';
import { OwnerAnalyticsOverview } from './entities/owner-analytics-overview.entity';

describe('Phase 11 Point 1 — Materialized Views for Owner Analytics Dashboard', () => {
  const migrationPath = path.resolve(
    __dirname,
    '../../database/migrations/017_create_analytics_materialized_views.sql'
  );

  it('should have migration 017 file present on disk', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  describe('PostgreSQL Migration 017 Schema & Materialized Views Definition', () => {
    let sql: string;

    beforeAll(() => {
      sql = fs.readFileSync(migrationPath, 'utf8');
    });

    it('should define mv_owner_monthly_analytics materialized view with WITH DATA', () => {
      expect(sql).toContain('CREATE MATERIALIZED VIEW mv_owner_monthly_analytics AS');
      expect(sql).toContain('WITH DATA;');
    });

    it('should include Occupancy Rate columns in mv_owner_monthly_analytics', () => {
      expect(sql).toContain('total_caregivers');
      expect(sql).toContain('active_caregivers');
      expect(sql).toContain('active_assignments');
      expect(sql).toContain('occupancy_rate_pct');
    });

    it('should include Average Time-to-Fill metrics in mv_owner_monthly_analytics', () => {
      expect(sql).toContain('total_requests');
      expect(sql).toContain('filled_requests');
      expect(sql).toContain('pending_requests');
      expect(sql).toContain('avg_time_to_fill_hours');
      expect(sql).toContain('avg_time_to_fill_days');
      expect(sql).toContain('fill_rate_pct');
    });

    it('should include Revenue Trend metrics in mv_owner_monthly_analytics', () => {
      expect(sql).toContain('gross_revenue');
      expect(sql).toContain('commission_revenue');
      expect(sql).toContain('caregiver_payouts');
      expect(sql).toContain('total_deductions');
      expect(sql).toContain('total_days_worked');
      expect(sql).toContain('payments_count');
      expect(sql).toContain('caregivers_paid_count');
    });

    it('should define UNIQUE index on mv_owner_monthly_analytics to allow REFRESH CONCURRENTLY', () => {
      expect(sql).toContain(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_owner_monthly_analytics_unique'
      );
      expect(sql).toContain('ON mv_owner_monthly_analytics (tenant_id, period_month)');
    });

    it('should define mv_owner_analytics_overview materialized view with single-pane KPI metrics', () => {
      expect(sql).toContain('CREATE MATERIALIZED VIEW mv_owner_analytics_overview AS');
      expect(sql).toContain('assigned_caregivers');
      expect(sql).toContain('available_caregivers');
      expect(sql).toContain('on_leave_caregivers');
      expect(sql).toContain('active_workforce_caregivers');
      expect(sql).toContain('all_time_gross_revenue');
      expect(sql).toContain('all_time_commission_revenue');
      expect(sql).toContain('current_month_gross_revenue');
      expect(sql).toContain('current_month_commission_revenue');
      expect(sql).toContain('revenue_growth_mom_pct');
    });

    it('should define UNIQUE index on mv_owner_analytics_overview to allow REFRESH CONCURRENTLY', () => {
      expect(sql).toContain(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_owner_analytics_overview_tenant'
      );
      expect(sql).toContain('ON mv_owner_analytics_overview (tenant_id)');
    });

    it('should define refresh_owner_analytics_views stored procedure executing concurrent refreshes', () => {
      expect(sql).toContain('CREATE OR REPLACE FUNCTION refresh_owner_analytics_views()');
      expect(sql).toContain('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_owner_analytics_overview;');
      expect(sql).toContain('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_owner_monthly_analytics;');
    });
  });

  describe('TypeORM Entities for Analytics Materialized Views', () => {
    it('should instantiate OwnerMonthlyAnalytics entity and transform numeric values', () => {
      const entity = new OwnerMonthlyAnalytics();
      entity.id = 'a0000000-0000-0000-0000-000000000001';
      entity.tenantId = 'b0000000-0000-0000-0000-000000000002';
      entity.periodMonth = '2026-09';
      entity.grossRevenue = 150000;
      entity.commissionRevenue = 22500;
      entity.caregiverPayouts = 127500;
      entity.totalDeductions = 0;
      entity.totalDaysWorked = 120;
      entity.paymentsCount = 5;
      entity.caregiversPaidCount = 5;
      entity.totalRequests = 10;
      entity.filledRequests = 9;
      entity.pendingRequests = 1;
      entity.avgTimeToFillHours = 14.5;
      entity.avgTimeToFillDays = 0.6;
      entity.fillRatePct = 90.0;
      entity.totalCaregivers = 12;
      entity.activeCaregivers = 9;
      entity.activeAssignments = 9;
      entity.occupancyRatePct = 75.0;
      entity.refreshedAt = new Date();

      expect(entity.tenantId).toBe('b0000000-0000-0000-0000-000000000002');
      expect(entity.periodMonth).toBe('2026-09');
      expect(entity.grossRevenue).toBe(150000);
      expect(entity.commissionRevenue).toBe(22500);
      expect(entity.avgTimeToFillHours).toBe(14.5);
      expect(entity.occupancyRatePct).toBe(75.0);
    });

    it('should instantiate OwnerAnalyticsOverview entity with KPI properties', () => {
      const entity = new OwnerAnalyticsOverview();
      entity.tenantId = 'b0000000-0000-0000-0000-000000000002';
      entity.totalCaregivers = 20;
      entity.activeWorkforceCaregivers = 18;
      entity.assignedCaregivers = 14;
      entity.availableCaregivers = 3;
      entity.onLeaveCaregivers = 1;
      entity.inactiveCaregivers = 2;
      entity.activeAssignmentsCount = 14;
      entity.occupancyRatePct = 70.0;
      entity.totalRequests = 45;
      entity.filledRequests = 40;
      entity.pendingRequests = 5;
      entity.avgTimeToFillHours = 18.25;
      entity.avgTimeToFillDays = 0.76;
      entity.fillRatePct = 88.89;
      entity.allTimeGrossRevenue = 540000;
      entity.allTimeCommissionRevenue = 81000;
      entity.allTimeNetPayout = 459000;
      entity.currentMonthGrossRevenue = 150000;
      entity.currentMonthCommissionRevenue = 22500;
      entity.currentMonthNetPayout = 127500;
      entity.previousMonthCommissionRevenue = 20000;
      entity.revenueGrowthMomPct = 12.5;
      entity.refreshedAt = new Date();

      expect(entity.tenantId).toBe('b0000000-0000-0000-0000-000000000002');
      expect(entity.occupancyRatePct).toBe(70.0);
      expect(entity.avgTimeToFillHours).toBe(18.25);
      expect(entity.currentMonthCommissionRevenue).toBe(22500);
      expect(entity.revenueGrowthMomPct).toBe(12.5);
    });
  });
});
