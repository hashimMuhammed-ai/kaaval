import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InviteToken } from '../users/entities/invite-token.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { InvitesService } from './invites.service';
import { InvitesController } from './invites.controller';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([InviteToken, Tenant, User])],
  controllers: [InvitesController],
  providers: [InvitesService, RolesGuard],
  exports: [InvitesService],
})
export class InvitesModule {}
