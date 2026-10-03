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
import { CaregiverRequest } from '../../requests/entities/request.entity';
import { Caregiver } from '../../caregivers/entities/caregiver.entity';
import { CustomerStatus } from '../../common/enums/customer-status.enum';
import { Assignment } from '../../assignments/entities/assignment.entity';

@Entity('customers')
@Index('idx_customers_tenant_id', ['tenantId'])
@Index('idx_customers_request_id', ['requestId'])
@Index('idx_customers_tenant_status', ['tenantId', 'status'])
@Index('idx_customers_tenant_phone', ['tenantId', 'phone'])
@Index('idx_customers_district', ['tenantId', 'district'])
@Index('idx_customers_created_at', ['tenantId', 'createdAt'])
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;

  @Column({ name: 'request_id', type: 'uuid', nullable: true })
  requestId?: string | null;

  @ManyToOne(() => CaregiverRequest, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'request_id' })
  request?: CaregiverRequest | null;

  @Index('idx_customers_reference_id', { unique: true })
  @Column({ name: 'reference_id', type: 'varchar', length: 32, unique: true })
  referenceId: string;

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

  @Column({ name: 'primary_contact_name', type: 'varchar', length: 255 })
  primaryContactName: string;

  @Column({ type: 'varchar', length: 64, default: 'son_daughter' })
  relationship: string;

  @Column({ type: 'varchar', length: 32 })
  phone: string;

  @Column({ name: 'alternate_phone', type: 'varchar', length: 32, nullable: true })
  alternatePhone?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string | null;

  @Column({ name: 'is_whatsapp', type: 'boolean', default: true })
  isWhatsapp: boolean;

  @Column({ type: 'text', nullable: true })
  address?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  locality?: string | null;

  @Column({ type: 'varchar', length: 100 })
  district: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  pincode?: string | null;

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

  @Column({
    type: 'enum',
    enum: CustomerStatus,
    default: CustomerStatus.PENDING,
  })
  status: CustomerStatus;

  @Column({ name: 'assigned_caregiver_id', type: 'uuid', nullable: true })
  assignedCaregiverId?: string | null;

  @ManyToOne(() => Caregiver, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigned_caregiver_id' })
  assignedCaregiver?: Caregiver | null;

  @OneToMany(() => Assignment, (assignment) => assignment.customer)
  assignments?: Assignment[];

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
