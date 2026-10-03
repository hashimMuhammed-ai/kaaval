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
import { UserRole } from '../../common/enums/user-role.enum';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from './user.entity';

@Entity('invite_tokens')
export class InviteToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_invite_tokens_token', { unique: true })
  @Column({ name: 'invite_token', type: 'varchar', length: 255, unique: true })
  inviteToken: string;

  @Index('idx_invite_tokens_tenant_id')
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, (tenant) => tenant.inviteTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Index('idx_invite_tokens_role')
  @Column({
    type: 'enum',
    enum: UserRole,
  })
  role: UserRole;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string | null;

  @Column({ name: 'invited_by', type: 'uuid', nullable: true })
  invitedBy?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'invited_by' })
  inviter?: User | null;

  @Index('idx_invite_tokens_expires_at')
  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
