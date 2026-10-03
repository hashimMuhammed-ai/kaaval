import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Tenant } from '../app/tenants/entities/tenant.entity';
import { User } from '../app/users/entities/user.entity';
import { InviteToken } from '../app/users/entities/invite-token.entity';
import { Caregiver } from '../app/caregivers/entities/caregiver.entity';
import { CaregiverDocument } from '../app/caregivers/entities/document.entity';
import { CaregiverRequest } from '../app/requests/entities/request.entity';
import { Customer } from '../app/customers/entities/customer.entity';
import { Assignment } from '../app/assignments/entities/assignment.entity';
import { Attendance } from '../app/attendance/entities/attendance.entity';
import { Payment } from '../app/payments/entities/payment.entity';
import { Feedback } from '../app/feedback/entities/feedback.entity';
import { WhatsAppIntakeSession } from '../app/whatsapp/entities/whatsapp-intake-session.entity';
import { PushSubscription } from '../app/notifications/entities/push-subscription.entity';
import { AdminNotification } from '../app/notifications/entities/admin-notification.entity';
import { OwnerMonthlyAnalytics } from '../app/analytics/entities/owner-monthly-analytics.entity';
import { OwnerAnalyticsOverview } from '../app/analytics/entities/owner-analytics-overview.entity';
import databaseConfig from './database.config';

@Module({
  imports: [
    ConfigModule.forFeature(databaseConfig),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        ssl: configService.get<boolean | object>('database.ssl'),
        entities: [
          Tenant,
          User,
          InviteToken,
          Caregiver,
          CaregiverDocument,
          CaregiverRequest,
          Customer,
          Assignment,
          Attendance,
          Payment,
          Feedback,
          WhatsAppIntakeSession,
          PushSubscription,
          AdminNotification,
          OwnerMonthlyAnalytics,
          OwnerAnalyticsOverview,
        ],
        synchronize: false,
        logging: configService.get<boolean>('database.logging'),
      }),
    }),
    TypeOrmModule.forFeature([
      Tenant,
      User,
      InviteToken,
      Caregiver,
      CaregiverDocument,
      CaregiverRequest,
      Customer,
      Assignment,
      Attendance,
      Payment,
      Feedback,
      WhatsAppIntakeSession,
      PushSubscription,
      AdminNotification,
      OwnerMonthlyAnalytics,
      OwnerAnalyticsOverview,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
