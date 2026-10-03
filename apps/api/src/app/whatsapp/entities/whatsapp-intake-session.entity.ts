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
import { CaregiverRequest } from '../../requests/entities/request.entity';

export enum IntakeStep {
  SERVICE = 'service',
  LOCATION = 'location',
  DURATION = 'duration',
  PATIENT_AGE = 'patient_age',
  GENDER_PREFERENCE = 'gender_preference',
  START_DATE = 'start_date',
  CONTACT_NAME = 'contact_name',
  CONFIRMATION = 'confirmation',
  COMPLETED = 'completed',
}

export enum IntakeSessionStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
}

@Entity('whatsapp_intake_sessions')
@Index('idx_intake_sessions_phone', ['phone'])
@Index('idx_intake_sessions_tenant', ['tenantId'])
@Index('idx_intake_sessions_status', ['status'])
@Index('idx_intake_sessions_request_id', ['requestId'])
@Index('idx_intake_sessions_reference_id', ['referenceId'])
export class WhatsAppIntakeSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId?: string | null;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant | null;

  @Column({ name: 'request_id', type: 'uuid', nullable: true })
  requestId?: string | null;

  @ManyToOne(() => CaregiverRequest, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'request_id' })
  request?: CaregiverRequest | null;

  @Column({ name: 'reference_id', type: 'varchar', length: 32, nullable: true })
  referenceId?: string | null;

  @Column({ type: 'varchar', length: 32 })
  phone: string;

  @Column({ name: 'current_step', type: 'varchar', length: 64, default: IntakeStep.SERVICE })
  currentStep: string;

  @Column({ name: 'service_type', type: 'varchar', length: 64, nullable: true })
  serviceType?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  district?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  locality?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  duration?: string | null;

  @Column({ name: 'patient_name', type: 'varchar', length: 255, nullable: true })
  patientName?: string | null;

  @Column({ name: 'patient_age', type: 'varchar', length: 32, nullable: true })
  patientAge?: string | null;

  @Column({ name: 'gender_preference', type: 'varchar', length: 32, default: 'any' })
  genderPreference: string;

  @Column({ name: 'start_date', type: 'varchar', length: 64, nullable: true })
  startDate?: string | null;

  @Column({ name: 'contact_name', type: 'varchar', length: 255, nullable: true })
  contactName?: string | null;

  @Column({ type: 'varchar', length: 32, default: IntakeSessionStatus.IN_PROGRESS })
  status: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @Column({ name: 'last_message_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  lastMessageAt: Date;
}
