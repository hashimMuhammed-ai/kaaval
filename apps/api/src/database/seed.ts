import { Pool } from 'pg';

export async function runSeed() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'caregiver_db',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  const client = await pool.connect();
  try {
    console.log('Seeding initial tenant and users...');
    await client.query('BEGIN');

    // Insert demo tenant
    const tenantRes = await client.query(
      `
      INSERT INTO tenants (name, subdomain, status, phone, email, address, settings)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (subdomain) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, name, subdomain;
      `,
      [
        'Kerala Care Agency',
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

    // Dummy hash for demo password: "Password123!"
    const passwordHash = '$2b$10$wO3oW1uF1v9X0E7YdKZZ..Qo0X/Z1aQjI4Pj4pZ4u5k4I6C/8qf8O';

    const users = [
      {
        name: 'Rahul Nair (Owner)',
        email: 'owner@keralacare.com',
        role: 'owner',
        phone: '+919876543211',
      },
      {
        name: 'Anjali Menon (Staff)',
        email: 'staff@keralacare.com',
        role: 'staff',
        phone: '+919876543212',
      },
      {
        name: 'Suresh Kumar (Coordinator)',
        email: 'coordinator@keralacare.com',
        role: 'coordinator',
        phone: '+919876543213',
      },
    ];

    for (const u of users) {
      await client.query(
        `
        INSERT INTO users (tenant_id, role, name, email, password_hash, phone, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, true)
        ON CONFLICT (tenant_id, email) DO UPDATE SET
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          phone = EXCLUDED.phone;
        `,
        [tenantId, u.role, u.name, u.email, passwordHash, u.phone]
      );
      console.log(`User created/updated: ${u.name} [${u.role}]`);
    }

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
