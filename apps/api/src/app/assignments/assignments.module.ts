import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assignment } from './entities/assignment.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Caregiver } from '../caregivers/entities/caregiver.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AssignmentsService } from './assignments.service';
import { AssignmentsController } from './assignments.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Assignment, Customer, Caregiver, Tenant]),
    WhatsAppModule,
    NotificationsModule,
  ],
  controllers: [AssignmentsController],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
