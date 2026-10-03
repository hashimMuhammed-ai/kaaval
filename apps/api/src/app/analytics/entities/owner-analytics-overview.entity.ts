import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';

@Entity('mv_owner_analytics_overview')
@Index('idx_mv_owner_analytics_overview_tenant', ['tenantId'], { unique: true })
export class OwnerAnalyticsOverview {
  @PrimaryColumn({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;

  // Occupancy Rate Metrics
  @Column({
    name: 'total_caregivers',
    type: 'integer',
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => (v !== null ? parseInt(v as string, 10) : 0),
    },
  })
  totalCaregivers: number;

  @Column({
    name: 'active_workforce_caregivers',
    type: 'integer',
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => (v !== null ? parseInt(v as string, 10) : 0),
    },
  })
  activeWorkforceCaregivers: number;

  @Column({
    name: 'assigned_caregivers',
    type: 'integer',
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => (v !== null ? parseInt(v as string, 10) : 0),
    },
  })
  assignedCaregivers: number;

  @Column({
    name: 'available_caregivers',
    type: 'integer',
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => (v !== null ? parseInt(v as string, 10) : 0),
    },
  })
  availableCaregivers: number;

  @Column({
    name: 'on_leave_caregivers',
    type: 'integer',
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => (v !== null ? parseInt(v as string, 10) : 0),
    },
  })
  onLeaveCaregivers: number;

  @Column({
    name: 'inactive_caregivers',
    type: 'integer',
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => (v !== null ? parseInt(v as string, 10) : 0),
    },
  })
  inactiveCaregivers: number;

  @Column({
    name: 'active_assignments_count',
    type: 'integer',
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => (v !== null ? parseInt(v as string, 10) : 0),
    },
  })
  activeAssignmentsCount: number;

  @Column({
    name: 'occupancy_rate_pct',
    type: 'numeric',
    precision: 5,
    scale: 2,
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => (v !== null ? parseFloat(v as string) : 0),
    },
  })
  occupancyRatePct: number;

  // Time-to-Fill Metrics
  @Column({
    name: 'total_requests',
    type: 'integer',
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => (v !== null ? parseInt(v as string, 10) : 0),
    },
  })
  totalRequests: number;

  @Column({
    name: 'filled_requests',
    type: 'integer',
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => (v !== null ? parseInt(v as string, 10) : 0),
    },
  })
  filledRequests: number;

  @Column({
    name: 'pending_requests',
    type: 'integer',
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => (v !== null ? parseInt(v as string, 10) : 0),
    },
  })
  pendingRequests: number;

  @Column({
    name: 'avg_time_to_fill_hours',
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => (v !== null ? parseFloat(v as string) : 0),
    },
  })
  avgTimeToFillHours: number;

  @Column({
    name: 'avg_time_to_fill_days',
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => (v !== null ? parseFloat(v as string) : 0),
    },
  })
  avgTimeToFillDays: number;

  @Column({
    name: 'fill_rate_pct',
    type: 'numeric',
    precision: 5,
    scale: 2,
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => (v !== null ? parseFloat(v as string) : 0),
    },
  })
  fillRatePct: number;

  // Revenue Totals & Trend Snapshot
  @Column({
    name: 'all_time_gross_revenue',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => (v !== null ? parseFloat(v as string) : 0),
    },
  })
  allTimeGrossRevenue: number;

  @Column({
    name: 'all_time_commission_revenue',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => (v !== null ? parseFloat(v as string) : 0),
    },
  })
  allTimeCommissionRevenue: number;

  @Column({
    name: 'all_time_net_payout',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => (v !== null ? parseFloat(v as string) : 0),
    },
  })
  allTimeNetPayout: number;

  @Column({
    name: 'current_month_gross_revenue',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => (v !== null ? parseFloat(v as string) : 0),
    },
  })
  currentMonthGrossRevenue: number;

  @Column({
    name: 'current_month_commission_revenue',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => (v !== null ? parseFloat(v as string) : 0),
    },
  })
  currentMonthCommissionRevenue: number;

  @Column({
    name: 'current_month_net_payout',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => (v !== null ? parseFloat(v as string) : 0),
    },
  })
  currentMonthNetPayout: number;

  @Column({
    name: 'previous_month_commission_revenue',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => (v !== null ? parseFloat(v as string) : 0),
    },
  })
  previousMonthCommissionRevenue: number;

  @Column({
    name: 'revenue_growth_mom_pct',
    type: 'numeric',
    precision: 5,
    scale: 2,
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => (v !== null ? parseFloat(v as string) : 0),
    },
  })
  revenueGrowthMomPct: number;

  @Column({ name: 'refreshed_at', type: 'timestamptz' })
  refreshedAt: Date;
}
