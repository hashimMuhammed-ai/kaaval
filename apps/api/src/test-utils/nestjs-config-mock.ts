import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
  private config: Record<string, any> = {
    ...process.env,
    JWT_SECRET: process.env.JWT_SECRET || 'super-secret-jwt-token-replace-in-production',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
    DB_USERNAME: process.env.DB_USERNAME || 'postgres',
    DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
    DB_NAME: process.env.DB_NAME || 'caregiver_db',
  };

  get<T = any>(propertyPath: string, defaultValue?: T): T {
    if (this.config[propertyPath] !== undefined) {
      return this.config[propertyPath] as T;
    }
    return defaultValue as T;
  }
}

export class ConfigModule {
  static forRoot = jest.fn(() => ({ module: ConfigModule }));
  static forFeature = jest.fn(() => ({ module: ConfigModule }));
}

export function registerAs(token: string, configFactory: () => any) {
  return () => configFactory();
}
