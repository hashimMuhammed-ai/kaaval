import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Caregiver } from './entities/caregiver.entity';
import { CaregiverDocument } from './entities/document.entity';
import { User } from '../users/entities/user.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Feedback } from '../feedback/entities/feedback.entity';
import { Assignment } from '../assignments/entities/assignment.entity';
import { CaregiversController } from './caregivers.controller';
import { CaregiversService } from './caregivers.service';

import { StorageModule } from '../common/storage/storage.module';
import { GeocodingModule } from '../common/geocoding/geocoding.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Caregiver, CaregiverDocument, User, Tenant, Feedback, Assignment]),
    StorageModule,
    GeocodingModule,
  ],
  controllers: [CaregiversController],
  providers: [CaregiversService],
  exports: [CaregiversService],
})
export class CaregiversModule {}
