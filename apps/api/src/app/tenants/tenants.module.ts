import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { InviteToken } from '../users/entities/invite-token.entity';
import { TenantsService } from './tenants.service';
import { TenantResolverService } from './tenant-resolver.service';
import { TenantsController } from './tenants.controller';
import { TenantResolutionController } from './tenant-resolution.controller';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, User, InviteToken])],
  controllers: [TenantsController, TenantResolutionController],
  providers: [TenantsService, TenantResolverService, SuperAdminGuard],
  exports: [TenantsService, TenantResolverService],
})
export class TenantsModule {}

