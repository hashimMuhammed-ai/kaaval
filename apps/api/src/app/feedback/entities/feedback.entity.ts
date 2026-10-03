import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Assignment } from '../../assignments/entities/assignment.entity';
import { Caregiver } from '../../caregivers/entities/caregiver.entity';
import { Customer } from '../../customers/entities/customer.entity';

@Entity('feedback')
@Index('idx_feedback_tenant_id', ['tenantId'])
@Index('idx_feedback_assignment_id', ['assignmentId'])
@Index('idx_feedback_caregiver_id', ['caregiverId'])
@Index('idx_feedback_customer_id', ['customerId'])
@Index('idx_feedback_rating', ['rating'])
export class Feedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;

  @Column({ name: 'assignment_id', type: 'uuid', unique: true })
  assignmentId: string;

  @OneToOne(() => Assignment, { onDelete: 'CASCADE' })
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

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment?: string | null;

  @Column({ type: 'varchar', length: 32, default: 'whatsapp' })
  source: string;

  @Column({ name: 'whatsapp_message_id', type: 'varchar', length: 128, nullable: true })
  whatsappMessageId?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
