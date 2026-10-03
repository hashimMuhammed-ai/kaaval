import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CaregiverRequest } from './entities/request.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { RequestsService } from './requests.service';
import { RequestsController } from './requests.controller';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CaregiverRequest, Tenant]),
    forwardRef(() => WhatsAppModule),
  ],
  controllers: [RequestsController],
  providers: [RequestsService],
  exports: [RequestsService],
})
export class RequestsModule {}
