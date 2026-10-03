import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { TenantStatus } from '../../common/enums/tenant-status.enum';
import { User } from '../../users/entities/user.entity';
import { InviteToken } from '../../users/entities/invite-token.entity';
import { Caregiver } from '../../caregivers/entities/caregiver.entity';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 63, unique: true })
  subdomain: string;

  @Index({ unique: true })
  @Column({ name: 'tenant_slug', type: 'varchar', length: 63, unique: true, default: '' })
  tenantSlug: string;

  @Index({ unique: true })
  @Column({ name: 'custom_domain', type: 'varchar', length: 255, nullable: true, unique: true })
  customDomain?: string | null;

  @Column({
    type: 'enum',
    enum: TenantStatus,
    default: TenantStatus.ACTIVE,
  })
  status: TenantStatus;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string | null;

  @Column({ type: 'text', nullable: true })
  address?: string | null;

  @Column({ type: 'jsonb', default: {} })
  settings: Record<string, any>;

  @OneToMany(() => User, (user) => user.tenant)
  users?: User[];

  @OneToMany(() => InviteToken, (token) => token.tenant)
  inviteTokens?: InviteToken[];

  @OneToMany(() => Caregiver, (caregiver) => caregiver.tenant)
  caregivers?: Caregiver[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
