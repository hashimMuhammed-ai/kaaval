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
import { Assignment } from '../../assignments/entities/assignment.entity';
import { Caregiver } from '../../caregivers/entities/caregiver.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { User } from '../../users/entities/user.entity';
import { AttendanceStatus } from '../../common/enums/attendance-status.enum';

@Entity('attendance')
@Index('idx_attendance_assignment_date', ['assignmentId', 'date'], { unique: true })
@Index('idx_attendance_tenant_id', ['tenantId'])
@Index('idx_attendance_assignment_id', ['assignmentId'])
@Index('idx_attendance_caregiver_id', ['caregiverId'])
@Index('idx_attendance_customer_id', ['customerId'])
@Index('idx_attendance_tenant_date', ['tenantId', 'date'])
@Index('idx_attendance_caregiver_date', ['caregiverId', 'date'])
export class Attendance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;

  @Column({ name: 'assignment_id', type: 'uuid' })
  assignmentId: string;

  @ManyToOne(() => Assignment, (assignment) => assignment.attendanceRecords, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignment_id' })
  assignment?: Assignment;

  @Column({ name: 'caregiver_id', type: 'uuid' })
  caregiverId: string;

  @ManyToOne(() => Caregiver, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'caregiver_id' })
  caregiver?: Caregiver;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer;

  @Column({ type: 'date' })
  date: string;

  @Column({ name: 'check_in_time', type: 'timestamptz', nullable: true })
  checkInTime?: Date | null;

  @Column({ name: 'check_out_time', type: 'timestamptz', nullable: true })
  checkOutTime?: Date | null;

  @Column({
    type: 'enum',
    enum: AttendanceStatus,
    default: AttendanceStatus.PRESENT,
  })
  status: AttendanceStatus;

  @Column({ name: 'check_in_latitude', type: 'double precision', nullable: true })
  checkInLatitude?: number | null;

  @Column({ name: 'check_in_longitude', type: 'double precision', nullable: true })
  checkInLongitude?: number | null;

  @Column({ name: 'check_out_latitude', type: 'double precision', nullable: true })
  checkOutLatitude?: number | null;

  @Column({ name: 'check_out_longitude', type: 'double precision', nullable: true })
  checkOutLongitude?: number | null;

  @Column({ name: 'check_in_notes', type: 'text', nullable: true })
  checkInNotes?: string | null;

  @Column({ name: 'check_out_notes', type: 'text', nullable: true })
  checkOutNotes?: string | null;

  @Column({ type: 'boolean', default: false })
  verified: boolean;

  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verifiedBy?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'verified_by' })
  verifiedByUser?: User | null;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
