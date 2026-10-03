import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';

export enum NotificationType {
  NEW_AUTO_CAPTURED_LEAD = 'NEW_AUTO_CAPTURED_LEAD',
  NEW_ENQUIRY = 'NEW_ENQUIRY',
  REPLACEMENT_SLA_ALERT = 'REPLACEMENT_SLA_ALERT',
  GENERAL = 'GENERAL',
}

export enum NotificationChannel {
  WHATSAPP = 'whatsapp',
  PUSH = 'push',
  IN_APP = 'in_app',
  ALL = 'all',
}

@Entity('admin_notifications')
@Index('idx_admin_notifications_tenant_created', ['tenantId', 'createdAt'])
@Index('idx_admin_notifications_status', ['tenantId', 'status'])
@Index('idx_admin_notifications_user_id', ['userId'])
export class AdminNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;

  @Column({ type: 'varchar', length: 50 })
  type: string;

  @Column({ type: 'varchar', length: 20, default: NotificationChannel.ALL })
  channel: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'jsonb', default: {} })
  payload: Record<string, any>;

  @Column({ type: 'varchar', length: 50, default: 'sent' })
  status: string;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
