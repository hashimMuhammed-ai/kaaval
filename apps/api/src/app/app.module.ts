import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from '../database/database.module';
import { TenantsModule } from './tenants/tenants.module';
import { InvitesModule } from './invites/invites.module';
import { AuthModule } from './auth/auth.module';
import { CaregiversModule } from './caregivers/caregivers.module';
import { StorageModule } from './common/storage/storage.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { RequestsModule } from './requests/requests.module';
import { CustomersModule } from './customers/customers.module';
import { MatchingModule } from './matching/matching.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { AttendanceModule } from './attendance/attendance.module';
import { PaymentsModule } from './payments/payments.module';
import { FeedbackModule } from './feedback/feedback.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AnalyticsModule } from './analytics/analytics.module';

import { APP_INTERCEPTOR } from '@nestjs/core';
import { TenantSessionInterceptor } from './common/interceptors/tenant-session.interceptor';
import { TenantSessionGuard } from './common/guards/tenant-session.guard';
import { TenantResolutionMiddleware } from './common/middleware/tenant-resolution.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.example'],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: parseInt(configService.get<string>('REDIS_PORT', '6379'), 10),
          password: configService.get<string>('REDIS_PASSWORD') || undefined,
          maxRetriesPerRequest: null,
        },
      }),
    }),
    DatabaseModule,
    TenantsModule,
    InvitesModule,
    AuthModule,
    CaregiversModule,
    StorageModule,
    WhatsAppModule,
    RequestsModule,
    CustomersModule,
    MatchingModule,
    AssignmentsModule,
    AttendanceModule,
    PaymentsModule,
    FeedbackModule,
    NotificationsModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    TenantSessionGuard,
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantSessionInterceptor,
    },
  ],
  exports: [TenantSessionGuard],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantResolutionMiddleware).forRoutes('*');
  }
}
