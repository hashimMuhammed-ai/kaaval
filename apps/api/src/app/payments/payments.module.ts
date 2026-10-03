import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { Caregiver } from '../caregivers/entities/caregiver.entity';
import { Assignment } from '../assignments/entities/assignment.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Attendance, Caregiver, Assignment])],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
