import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Tenant } from '../app/tenants/entities/tenant.entity';
import { User } from '../app/users/entities/user.entity';
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
        entities: [Tenant, User],
        synchronize: false,
        logging: configService.get<boolean>('database.logging'),
      }),
    }),
    TypeOrmModule.forFeature([Tenant, User]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
