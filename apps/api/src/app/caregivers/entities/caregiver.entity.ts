import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { CaregiverStatus } from '../../common/enums/caregiver-status.enum';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';
import { CaregiverDocument } from './document.entity';
import { Assignment } from '../../assignments/entities/assignment.entity';

@Entity('caregivers')
@Index('idx_caregivers_tenant_status', ['tenantId', 'status'])
@Index('idx_caregivers_tenant_phone', ['tenantId', 'phone'])
@Index('idx_caregivers_tenant_location', ['tenantId', 'location'], { spatial: true })
@Index('idx_caregivers_tenant_rating', ['tenantId', 'averageRating'])
@Index('idx_caregivers_tenant_jobs', ['tenantId', 'jobsCompleted'])
export class Caregiver {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_caregivers_tenant_id')
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Index('idx_caregivers_user_id', { unique: true })
  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'full_name', type: 'varchar', length: 255 })
  fullName: string;

  @Column({ type: 'varchar', length: 32 })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string | null;

  @Column({ type: 'varchar', length: 32, default: 'unspecified' })
  gender: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth?: Date | string | null;

  @Column({ type: 'text', nullable: true })
  address?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  district?: string | null;

  @Column({ type: 'varchar', length: 100, default: 'Kerala' })
  state: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  pincode?: string | null;

  @Column({ type: 'double precision', nullable: true })
  latitude?: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude?: number | null;

  @Index('idx_caregivers_location', { spatial: true })
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  location?: any;

  @Column({ type: 'text', array: true, default: '{}' })
  skills: string[];

  @Column({
    name: 'experience_years',
    type: 'numeric',
    precision: 4,
    scale: 1,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => (value !== null ? parseFloat(value as string) : 0),
    },
  })
  experienceYears: number;

  @Index('idx_caregivers_status')
  @Column({
    type: 'enum',
    enum: CaregiverStatus,
    default: CaregiverStatus.AVAILABLE,
  })
  status: CaregiverStatus;

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
    name: 'live_in_rate',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => (value !== null ? parseFloat(value as string) : 0),
    },
  })
  liveInRate: number;

  @Column({
    name: 'hourly_rate',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => (value !== null ? parseFloat(value as string) : 0),
    },
  })
  hourlyRate: number;

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

  @Column({ name: 'rate_notes', type: 'text', nullable: true })
  rateNotes?: string | null;

  @Column({ name: 'emergency_contact_name', type: 'varchar', length: 255, nullable: true })
  emergencyContactName?: string | null;

  @Column({ name: 'emergency_contact_phone', type: 'varchar', length: 32, nullable: true })
  emergencyContactPhone?: string | null;

  @Column({ type: 'text', array: true, default: '{"Malayalam"}' })
  languages: string[];

  @Column({ name: 'temporary_access_code', type: 'varchar', length: 64, nullable: true })
  temporaryAccessCode?: string | null;

  @Column({ name: 'profile_summary', type: 'text', nullable: true })
  profileSummary?: string | null;

  @Column({
    name: 'average_rating',
    type: 'numeric',
    precision: 3,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => (value !== null ? parseFloat(value as string) : 0),
    },
  })
  averageRating: number;

  @Column({
    name: 'total_ratings',
    type: 'integer',
    default: 0,
  })
  totalRatings: number;

  @Column({
    name: 'jobs_completed',
    type: 'integer',
    default: 0,
  })
  jobsCompleted: number;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @OneToMany(() => CaregiverDocument, (doc) => doc.caregiver)
  documents?: CaregiverDocument[];

  @OneToMany(() => Assignment, (assignment) => assignment.caregiver)
  assignments?: Assignment[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
