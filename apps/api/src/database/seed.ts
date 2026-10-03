import { Pool } from 'pg';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { PasswordHasher } from '../app/common/utils/password-hasher';

// Load environment variables from .env files
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export async function runSeed() {
  const dbUrl = process.env.DATABASE_URL || process.env.DB_URL;
  const pool = new Pool(
    dbUrl
      ? {
          connectionString: dbUrl,
          ssl: { rejectUnauthorized: false },
        }
      : {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          user: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_NAME || 'caregiver_db',
          ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        }
  );

  const client = await pool.connect();
  try {
    console.log('Seeding initial tenant and users...');
    await client.query('BEGIN');

    // Insert demo tenant
    const tenantRes = await client.query(
      `
      INSERT INTO tenants (name, subdomain, tenant_slug, status, phone, email, address, settings)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (subdomain) DO UPDATE SET name = EXCLUDED.name, tenant_slug = EXCLUDED.tenant_slug
      RETURNING id, name, subdomain, tenant_slug;
      `,
      [
        'Kerala Care Agency',
        'keralacare',
        'keralacare',
        'active',
        '+919876543210',
        'contact@keralacare.com',
        'MG Road, Kochi, Kerala',
        JSON.stringify({ currency: 'INR', slaMinutes: 60 }),
      ]
    );

    const tenantId = tenantRes.rows[0].id;
    console.log(`Tenant created/updated: ${tenantRes.rows[0].name} (${tenantId})`);

    // Valid scrypt hash for demo password: "Password123!"
    const passwordHash = PasswordHasher.hash('Password123!');

    // 1. Insert platform-level Super Admin (tenant_id = null)
    const superAdminRes = await client.query(
      `
      INSERT INTO users (tenant_id, role, name, email, password_hash, phone, is_active)
      VALUES (NULL, 'super_admin', 'Platform Super Admin', 'superadmin@caregiverplatform.com', $1, '+919999999999', true)
      ON CONFLICT (LOWER(email)) WHERE tenant_id IS NULL DO UPDATE SET
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        password_hash = EXCLUDED.password_hash
      RETURNING id, name, role;
      `,
      [passwordHash]
    );
    console.log(`Super Admin initialized: ${superAdminRes.rows[0].name} [${superAdminRes.rows[0].role}]`);

    const users = [
      {
        name: 'Rahul Nair (Owner)',
        email: 'owner@keralacare.com',
        role: 'owner',
        phone: '+919876543211',
      },
      {
        name: 'Anjali Menon (Office Staff)',
        email: 'staff@keralacare.com',
        role: 'office_staff',
        phone: '+919876543212',
      },
      {
        name: 'Priya Lakshmi (Caregiver)',
        email: 'caregiver@keralacare.com',
        role: 'caregiver',
        phone: '+919876543213',
      },
    ];

    let caregiverUserId: string | null = null;
    for (const u of users) {
      const userRes = await client.query(
        `
        INSERT INTO users (tenant_id, role, name, email, password_hash, phone, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, true)
        ON CONFLICT (tenant_id, email) DO UPDATE SET
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          phone = EXCLUDED.phone,
          password_hash = EXCLUDED.password_hash
        RETURNING id;
        `,
        [tenantId, u.role, u.name, u.email, passwordHash, u.phone]
      );
      if (u.role === 'caregiver') {
        caregiverUserId = userRes.rows[0].id;
      }
      console.log(`User created/updated: ${u.name} [${u.role}]`);
    }

    // Insert caregiver profile linked to the caregiver user account
    if (caregiverUserId) {
      await client.query(
        `
        INSERT INTO caregivers (
          tenant_id, user_id, full_name, phone, email, gender, date_of_birth,
          address, city, district, state, pincode, latitude, longitude,
          skills, experience_years, status, daily_rate, languages, temporary_access_code, profile_summary
        )
        VALUES (
          $1, $2, 'Priya Lakshmi', '+919876543213', 'caregiver@keralacare.com', 'female', '1992-05-14',
          'Kadavanthra Junction', 'Kochi', 'Ernakulam', 'Kerala', '682020', 9.9674, 76.2999,
          ARRAY['Elderly Care', 'Bedridden Care', 'Palliative Care', 'Vital Signs Monitoring'], 5.0, 'available', 1200.00,
          ARRAY['Malayalam', 'English', 'Tamil'], 'CG-DEMO1', 'Experienced geriatric nurse specializing in post-operative and bedridden care.'
        )
        ON CONFLICT (user_id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          skills = EXCLUDED.skills,
          status = EXCLUDED.status;
        `,
        [tenantId, caregiverUserId]
      );
      console.log('Seeded Caregiver profile for Priya Lakshmi (linked to user account).');
    }

    // Insert sample expiring invite token for office staff onboarding
    const tokenRes = await client.query(
      `
      INSERT INTO invite_tokens (invite_token, tenant_id, role, email, expires_at)
      VALUES ($1, $2, 'office_staff', 'newstaff@keralacare.com', CURRENT_TIMESTAMP + INTERVAL '48 hours')
      ON CONFLICT (invite_token) DO UPDATE SET expires_at = EXCLUDED.expires_at
      RETURNING id, invite_token, role, expires_at;
      `,
      ['demo_staff_invite_token_48h', tenantId]
    );
    console.log(`Demo Invite Token created: ${tokenRes.rows[0].invite_token} [${tokenRes.rows[0].role}]`);

    await client.query('COMMIT');
    console.log('Seed completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed error:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runSeed().catch((err) => {
    console.error('Fatal seed error:', err);
    process.exit(1);
  });
}
