import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppConfigService } from './whatsapp-config.service';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { FeedbackModule } from '../feedback/feedback.module';
import { WhatsAppIntakeSession } from './entities/whatsapp-intake-session.entity';
import { WhatsAppIntakeService } from './intake/whatsapp-intake.service';
import { CaregiverRequest } from '../requests/entities/request.entity';
import { RequestsModule } from '../requests/requests.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Tenant, User, WhatsAppIntakeSession, CaregiverRequest]),
    forwardRef(() => FeedbackModule),
    forwardRef(() => RequestsModule),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [WhatsAppWebhookController],
  providers: [WhatsAppService, WhatsAppConfigService, WhatsAppIntakeService],
  exports: [WhatsAppService, WhatsAppConfigService, WhatsAppIntakeService],
})
export class WhatsAppModule {}
