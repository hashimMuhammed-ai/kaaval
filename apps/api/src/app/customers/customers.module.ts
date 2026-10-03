import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from './entities/customer.entity';
import { CaregiverRequest } from '../requests/entities/request.entity';
import { Caregiver } from '../caregivers/entities/caregiver.entity';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, CaregiverRequest, Caregiver]),
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
