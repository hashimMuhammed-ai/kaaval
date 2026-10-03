import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { Caregiver } from '../../caregivers/entities/caregiver.entity';
import { AssignmentStatus } from '../../common/enums/assignment-status.enum';
import { Attendance } from '../../attendance/entities/attendance.entity';

@Entity('assignments')
@Index('idx_assignments_tenant_id', ['tenantId'])
@Index('idx_assignments_customer_id', ['customerId'])
@Index('idx_assignments_caregiver_id', ['caregiverId'])
@Index('idx_assignments_tenant_status', ['tenantId', 'status'])
@Index('idx_assignments_replaced_by_id', ['replacedById'])
export class Assignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @ManyToOne(() => Customer, (customer) => customer.assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer;

  @Column({ name: 'caregiver_id', type: 'uuid' })
  caregiverId: string;

  @ManyToOne(() => Caregiver, (caregiver) => caregiver.assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'caregiver_id' })
  caregiver?: Caregiver;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate?: string | null;

  @Column({
    type: 'enum',
    enum: AssignmentStatus,
    default: AssignmentStatus.ACTIVE,
  })
  status: AssignmentStatus;

  @Column({ name: 'replaced_by_id', type: 'uuid', nullable: true })
  replacedById?: string | null;

  @ManyToOne(() => Assignment, (asgn) => asgn.replacedAssignments, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'replaced_by_id' })
  replacedBy?: Assignment | null;

  @OneToMany(() => Assignment, (asgn) => asgn.replacedBy)
  replacedAssignments?: Assignment[];

  @Column({ name: 'replacement_reason', type: 'text', nullable: true })
  replacementReason?: string | null;

  @Column({
    name: 'billing_rate',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => (value !== null ? parseFloat(value as string) : 0),
    },
  })
  billingRate: number;

  @Column({
    name: 'caregiver_daily_rate',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => (value !== null ? parseFloat(value as string) : 0),
    },
  })
  caregiverDailyRate: number;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ name: 'feedback_requested_at', type: 'timestamptz', nullable: true })
  feedbackRequestedAt?: Date | null;

  @Column({ name: 'feedback_request_status', type: 'varchar', length: 32, default: 'pending' })
  feedbackRequestStatus?: string;

  @Column({ name: 'replacement_requested_at', type: 'timestamptz', nullable: true })
  replacementRequestedAt?: Date | null;

  @Column({ name: 'replacement_sla_minutes', type: 'integer', default: 120 })
  replacementSlaMinutes: number;

  @Column({ name: 'replacement_sla_escalated_at', type: 'timestamptz', nullable: true })
  replacementSlaEscalatedAt?: Date | null;

  @Column({ name: 'replacement_sla_status', type: 'varchar', length: 32, default: 'none' })
  replacementSlaStatus: 'none' | 'pending' | 'escalated' | 'resolved';

  @Column({ name: 'absence_reason', type: 'varchar', length: 64, nullable: true })
  absenceReason?: string | null;

  @Column({ name: 'absence_notes', type: 'text', nullable: true })
  absenceNotes?: string | null;

  @OneToMany(() => Attendance, (att) => att.assignment)
  attendanceRecords?: Attendance[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
