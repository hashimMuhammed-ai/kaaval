import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Caregiver } from '../caregivers/entities/caregiver.entity';
import { CaregiverRequest } from '../requests/entities/request.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Assignment } from '../assignments/entities/assignment.entity';
import { GeocodingModule } from '../common/geocoding/geocoding.module';
import { MatchingService } from './matching.service';
import { MatchingController } from './matching.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Caregiver, CaregiverRequest, Customer, Assignment]),
    GeocodingModule,
  ],
  controllers: [MatchingController],
  providers: [MatchingService],
  exports: [MatchingService],
})
export class MatchingModule {}
