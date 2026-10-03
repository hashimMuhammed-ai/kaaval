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
import { Caregiver } from './caregiver.entity';

@Entity('documents')
export class CaregiverDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_documents_tenant_id')
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Index('idx_documents_caregiver_id')
  @Column({ name: 'caregiver_id', type: 'uuid' })
  caregiverId: string;

  @ManyToOne(() => Caregiver, (caregiver) => caregiver.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'caregiver_id' })
  caregiver: Caregiver;

  @Index('idx_documents_document_type')
  @Column({ name: 'document_type', type: 'varchar', length: 64 })
  documentType: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ name: 'file_url', type: 'text' })
  fileUrl: string;

  @Column({ name: 'file_key', type: 'varchar', length: 255, nullable: true })
  fileKey?: string | null;

  @Column({ name: 'mime_type', type: 'varchar', length: 100, nullable: true })
  mimeType?: string | null;

  @Column({ name: 'file_size', type: 'integer', nullable: true })
  fileSize?: number | null;

  @Index('idx_documents_expiry_date')
  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate?: Date | string | null;

  @Column({ type: 'boolean', default: false })
  verified: boolean;

  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verifiedBy?: string | null;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
