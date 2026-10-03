import { registerAs } from '@nestjs/config';

export default registerAs('database', () => {
  const url = process.env.DATABASE_URL || process.env.DB_URL;
  return {
    url: url || undefined,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'caregiver_db',
    ssl:
      url || process.env.DB_SSL === 'true'
        ? { rejectUnauthorized: false }
        : false,
    synchronize: false, // We use explicit migrations for production safety
    logging: process.env.NODE_ENV === 'development',
  };
});
