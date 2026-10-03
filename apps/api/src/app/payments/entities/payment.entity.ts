import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Caregiver } from '../../caregivers/entities/caregiver.entity';
import { User } from '../../users/entities/user.entity';
import { PaymentStatus } from '../../common/enums/payment-status.enum';

@Entity('payments')
@Index('idx_payments_caregiver_period', ['caregiverId', 'periodMonth'], { unique: true })
@Index('idx_payments_tenant_id', ['tenantId'])
@Index('idx_payments_caregiver_id', ['caregiverId'])
@Index('idx_payments_period_month', ['tenantId', 'periodMonth'])
@Index('idx_payments_status', ['tenantId', 'status'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;

  @Column({ name: 'caregiver_id', type: 'uuid' })
  caregiverId: string;

  @ManyToOne(() => Caregiver, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'caregiver_id' })
  caregiver?: Caregiver;

  @Column({ name: 'period_month', type: 'varchar', length: 7 })
  periodMonth: string; // 'YYYY-MM'

  @Column({
    name: 'days_present',
    type: 'numeric',
    precision: 5,
    scale: 1,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => (value !== null ? parseFloat(value as string) : 0),
    },
  })
  daysPresent: number;

  @Column({
    name: 'days_half_day',
    type: 'numeric',
    precision: 5,
    scale: 1,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => (value !== null ? parseFloat(value as string) : 0),
    },
  })
  daysHalfDay: number;

  @Column({
    name: 'days_absent',
    type: 'numeric',
    precision: 5,
    scale: 1,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => (value !== null ? parseFloat(value as string) : 0),
    },
  })
  daysAbsent: number;

  @Column({
    name: 'days_on_leave',
    type: 'numeric',
    precision: 5,
    scale: 1,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => (value !== null ? parseFloat(value as string) : 0),
    },
  })
  daysOnLeave: number;

  @Column({
    name: 'total_days_worked',
    type: 'numeric',
    precision: 5,
    scale: 1,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => (value !== null ? parseFloat(value as string) : 0),
    },
  })
  totalDaysWorked: number;

  @Column({
    name: 'daily_rate',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => (value !== null ? parseFloat(value as string) : 0),
    },
  })
  dailyRate: number;

  @Column({
    name: 'gross_amount',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => (value !== null ? parseFloat(value as string) : 0),
    },
  })
  grossAmount: number;

  @Column({
    name: 'commission_percentage',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 15.0,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => (value !== null ? parseFloat(value as string) : 15.0),
    },
  })
  commissionPercentage: number;

  @Column({
    name: 'commission_amount',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => (value !== null ? parseFloat(value as string) : 0),
    },
  })
  commissionAmount: number;

  @Column({
    name: 'deductions',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => (value !== null ? parseFloat(value as string) : 0),
    },
  })
  deductions: number;

  @Column({
    name: 'net_payout',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => (value !== null ? parseFloat(value as string) : 0),
    },
  })
  netPayout: number;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.DRAFT,
  })
  status: PaymentStatus;

  @Column({ name: 'payment_date', type: 'date', nullable: true })
  paymentDate?: string | null;

  @Column({ name: 'payment_method', type: 'varchar', length: 64, nullable: true })
  paymentMethod?: string | null;

  @Column({ name: 'transaction_reference', type: 'varchar', length: 128, nullable: true })
  transactionReference?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ name: 'computed_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  computedAt: Date;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approvedByUser?: User | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
