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
import { Customer } from '../../customers/entities/customer.entity';
import { RequestStatus } from '../../common/enums/request-status.enum';

@Entity('requests')
@Index('idx_requests_tenant_id', ['tenantId'])
@Index('idx_requests_customer_id', ['customerId'])
@Index('idx_requests_tenant_status', ['tenantId', 'status'])
@Index('idx_requests_tenant_phone', ['tenantId', 'phone'])
@Index('idx_requests_district', ['tenantId', 'district'])
@Index('idx_requests_created_at', ['tenantId', 'createdAt'])
export class CaregiverRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;

  @Index('idx_requests_reference_id', { unique: true })
  @Column({ name: 'reference_id', type: 'varchar', length: 32, unique: true })
  referenceId: string;

  @Column({ name: 'service_type', type: 'varchar', length: 64 })
  serviceType: string;

  @Column({ type: 'varchar', length: 64 })
  duration: string;

  @Column({ name: 'engagement_period', type: 'varchar', length: 64, default: 'ongoing' })
  engagementPeriod: string;

  @Column({ name: 'gender_preference', type: 'varchar', length: 32, default: 'any' })
  genderPreference: string;

  @Column({ name: 'start_date', type: 'varchar', length: 64 })
  startDate: string;

  @Column({ type: 'varchar', length: 100 })
  district: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  locality?: string | null;

  @Column({ type: 'text', nullable: true })
  address?: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  pincode?: string | null;

  @Column({ name: 'patient_name', type: 'varchar', length: 255 })
  patientName: string;

  @Column({ name: 'patient_age', type: 'varchar', length: 32, nullable: true })
  patientAge?: string | null;

  @Column({ name: 'patient_gender', type: 'varchar', length: 32, default: 'unspecified' })
  patientGender: string;

  @Column({ name: 'patient_condition', type: 'text', nullable: true })
  patientCondition?: string | null;

  @Column({ name: 'mobility_status', type: 'varchar', length: 64, default: 'assisted' })
  mobilityStatus: string;

  @Column({ name: 'medical_equipment', type: 'varchar', length: 128, default: 'none' })
  medicalEquipment: string;

  @Column({ name: 'contact_name', type: 'varchar', length: 255 })
  contactName: string;

  @Column({ type: 'varchar', length: 64, default: 'son_daughter' })
  relationship: string;

  @Column({ type: 'varchar', length: 32 })
  phone: string;

  @Column({ name: 'is_whatsapp', type: 'boolean', default: true })
  isWhatsapp: boolean;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({
    type: 'enum',
    enum: RequestStatus,
    default: RequestStatus.PENDING,
  })
  status: RequestStatus;

  @Column({ type: 'varchar', length: 32, default: 'public_form' })
  source: string;

  @Column({ name: 'assigned_caregiver_id', type: 'uuid', nullable: true })
  assignedCaregiverId?: string | null;

  @ManyToOne(() => Caregiver, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigned_caregiver_id' })
  assignedCaregiver?: Caregiver | null;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId?: string | null;

  @ManyToOne(() => Customer, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
