import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';

@Entity('mv_owner_monthly_analytics')
@Index('idx_mv_owner_monthly_analytics_unique', ['tenantId', 'periodMonth'], { unique: true })
@Index('idx_mv_owner_monthly_analytics_tenant', ['tenantId'])
@Index('idx_mv_owner_monthly_analytics_month', ['periodMonth'])
export class OwnerMonthlyAnalytics {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;

  @Column({ name: 'period_month', type: 'varchar', length: 7 })
  periodMonth: string; // 'YYYY-MM'

  // Revenue Trend Metrics
  @Column({
    name: 'gross_revenue',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => (v !== null ? parseFloat(v as string) : 0),
    },
  })
  grossRevenue: number;

  @Column({
    name: 'commission_revenue',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => (v !== null ? parseFloat(v as string) : 0),
    },
  })
  commissionRevenue: number;

  @Column({
    name: 'caregiver_payouts',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => (v !== null ? parseFloat(v as string) : 0),
    },
  })
  caregiverPayouts: number;

  @Column({
    name: 'total_deductions',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => (v !== null ? parseFloat(v as string) : 0),
    },
  })
  totalDeductions: number;

  @Column({
    name: 'total_days_worked',
    type: 'numeric',
    precision: 10,
    scale: 1,
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => (v !== null ? parseFloat(v as string) : 0),
    },
  })
  totalDaysWorked: number;

  @Column({
    name: 'payments_count',
    type: 'integer',
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => (v !== null ? parseInt(v as string, 10) : 0),
    },
  })
  paymentsCount: number;

  @Column({
    name: 'caregivers_paid_count',
    type: 'integer',
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => (v !== null ? parseInt(v as string, 10) : 0),
    },
  })
  caregiversPaidCount: number;

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
    name: 'active_caregivers',
    type: 'integer',
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => (v !== null ? parseInt(v as string, 10) : 0),
    },
  })
  activeCaregivers: number;

  @Column({
    name: 'active_assignments',
    type: 'integer',
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => (v !== null ? parseInt(v as string, 10) : 0),
    },
  })
  activeAssignments: number;

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

  @Column({ name: 'refreshed_at', type: 'timestamptz' })
  refreshedAt: Date;
}
