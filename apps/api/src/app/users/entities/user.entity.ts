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
  Unique,
} from 'typeorm';
import { UserRole } from '../../common/enums/user-role.enum';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Caregiver } from '../../caregivers/entities/caregiver.entity';

@Entity('users')
@Unique('uq_users_tenant_email', ['tenantId', 'email'])
@Index('idx_users_tenant_role', ['tenantId', 'role'])
@Index('idx_users_tenant_is_active', ['tenantId', 'isActive'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_users_tenant_id')
  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId?: string | null;

  @ManyToOne(() => Tenant, (tenant) => tenant.users, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant | null;

  @OneToOne(() => Caregiver, (caregiver) => caregiver.user)
  caregiver?: Caregiver;

  @Column({
    type: 'enum',
    enum: UserRole,
  })
  role: UserRole;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Index('idx_users_email')
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone?: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
