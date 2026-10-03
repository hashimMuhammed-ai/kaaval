import * as fs from 'fs';
import * as path from 'path';
import { CaregiverStatus } from '../common/enums/caregiver-status.enum';
import { Caregiver } from './entities/caregiver.entity';
import { CaregiverDocument } from './entities/document.entity';
import { User } from '../users/entities/user.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { UserRole } from '../common/enums/user-role.enum';

describe('Caregivers Table & Schema Verification', () => {
  const migrationPath = path.join(
    __dirname,
    '../../database/migrations/003_create_caregivers.sql'
  );

  it('should have migration file 003_create_caregivers.sql present', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  describe('PostgreSQL Migration 003 Schema Definition', () => {
    let sql: string;

    beforeAll(() => {
      sql = fs.readFileSync(migrationPath, 'utf-8');
    });

    it('should define caregiver_status enum with all 4 operational states', () => {
      expect(sql).toContain(
        "CREATE TYPE caregiver_status AS ENUM ('available', 'assigned', 'on_leave', 'inactive')"
      );
    });

    it('should define caregivers table with all required profile fields per brief', () => {
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS caregivers (');
      expect(sql).toContain('id UUID PRIMARY KEY DEFAULT gen_random_uuid()');
      expect(sql).toContain('tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE');
      expect(sql).toContain('user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE');
      expect(sql).toContain('full_name VARCHAR(255) NOT NULL');
      expect(sql).toContain('phone VARCHAR(32) NOT NULL');
      expect(sql).toContain('email VARCHAR(255)');
      expect(sql).toContain("gender VARCHAR(32) NOT NULL DEFAULT 'unspecified'");
      expect(sql).toContain('date_of_birth DATE');
      expect(sql).toContain('address TEXT');
      expect(sql).toContain('city VARCHAR(100)');
      expect(sql).toContain('district VARCHAR(100)');
      expect(sql).toContain("state VARCHAR(100) NOT NULL DEFAULT 'Kerala'");
      expect(sql).toContain('pincode VARCHAR(20)');
      expect(sql).toContain('latitude DOUBLE PRECISION');
      expect(sql).toContain('longitude DOUBLE PRECISION');
      expect(sql).toContain('location GEOMETRY(Point, 4326)');
      expect(sql).toContain("skills TEXT[] NOT NULL DEFAULT '{}'");
      expect(sql).toContain('experience_years NUMERIC(4, 1) NOT NULL DEFAULT 0');
      expect(sql).toContain("status caregiver_status NOT NULL DEFAULT 'available'");
      expect(sql).toContain('daily_rate NUMERIC(10, 2) NOT NULL DEFAULT 0');
      expect(sql).toContain('emergency_contact_name VARCHAR(255)');
      expect(sql).toContain('emergency_contact_phone VARCHAR(32)');
      expect(sql).toContain("languages TEXT[] NOT NULL DEFAULT '{\"Malayalam\"}'");
      expect(sql).toContain('temporary_access_code VARCHAR(64)');
      expect(sql).toContain('profile_summary TEXT');
      expect(sql).toContain('notes TEXT');
      expect(sql).toContain('created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP');
      expect(sql).toContain('updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP');
    });

    it('should configure PostGIS GiST spatial index on location for distance-aware matching', () => {
      expect(sql).toContain(
        'CREATE INDEX IF NOT EXISTS idx_caregivers_location ON caregivers USING GIST (location)'
      );
    });

    it('should configure performance and isolation indexes on caregivers table', () => {
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_caregivers_tenant_id ON caregivers (tenant_id)');
      expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS idx_caregivers_user_id ON caregivers (user_id)');
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_caregivers_status ON caregivers (status)');
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_caregivers_tenant_status ON caregivers (tenant_id, status)');
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_caregivers_tenant_phone ON caregivers (tenant_id, phone)');
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_caregivers_district ON caregivers (tenant_id, district)');
    });

    it('should define automatic PostGIS location sync function and trigger from lat/lng', () => {
      expect(sql).toContain('CREATE OR REPLACE FUNCTION sync_caregiver_location()');
      expect(sql).toContain('ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)');
      expect(sql).toContain('CREATE TRIGGER trg_caregivers_location');
      expect(sql).toContain('BEFORE INSERT OR UPDATE OF latitude, longitude ON caregivers');
    });

    it('should define documents table linked to caregivers with expiry tracking', () => {
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS documents (');
      expect(sql).toContain('caregiver_id UUID NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE');
      expect(sql).toContain('document_type VARCHAR(64) NOT NULL');
      expect(sql).toContain('expiry_date DATE');
      expect(sql).toContain('verified BOOLEAN NOT NULL DEFAULT false');
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_documents_caregiver_id ON documents (caregiver_id)');
    });

    it('should enforce Row-Level Security policies on caregivers and documents', () => {
      expect(sql).toContain('ALTER TABLE caregivers ENABLE ROW LEVEL SECURITY;');
      expect(sql).toContain('ALTER TABLE caregivers FORCE ROW LEVEL SECURITY;');
      expect(sql).toContain('CREATE POLICY caregivers_isolation_policy ON caregivers');
      expect(sql).toContain("WHEN current_app_user_role() = 'caregiver' THEN");
      expect(sql).toContain('user_id = current_app_user_id()');

      expect(sql).toContain('ALTER TABLE documents ENABLE ROW LEVEL SECURITY;');
      expect(sql).toContain('ALTER TABLE documents FORCE ROW LEVEL SECURITY;');
      expect(sql).toContain('CREATE POLICY documents_isolation_policy ON documents');
    });
  });

  describe('TypeORM Caregiver Entity Implementation', () => {
    it('should instantiate Caregiver entity with full profile fields and defaults', () => {
      const caregiver = new Caregiver();
      caregiver.id = '11111111-1111-1111-1111-111111111111';
      caregiver.tenantId = 'tenant-123';
      caregiver.userId = 'user-456';
      caregiver.fullName = 'Priya Lakshmi';
      caregiver.phone = '+919876543213';
      caregiver.email = 'priya@example.com';
      caregiver.gender = 'female';
      caregiver.dateOfBirth = '1992-05-14';
      caregiver.address = 'Kadavanthra Junction';
      caregiver.city = 'Kochi';
      caregiver.district = 'Ernakulam';
      caregiver.state = 'Kerala';
      caregiver.pincode = '682020';
      caregiver.latitude = 9.9674;
      caregiver.longitude = 76.2999;
      caregiver.skills = ['Elderly Care', 'Bedridden Care', 'Palliative Care'];
      caregiver.experienceYears = 5.0;
      caregiver.status = CaregiverStatus.AVAILABLE;
      caregiver.dailyRate = 1200.0;
      caregiver.emergencyContactName = 'Ramesh';
      caregiver.emergencyContactPhone = '+919876543299';
      caregiver.languages = ['Malayalam', 'English', 'Tamil'];
      caregiver.temporaryAccessCode = 'CG-DEMO1';
      caregiver.profileSummary = 'Experienced geriatric nurse.';

      expect(caregiver.fullName).toBe('Priya Lakshmi');
      expect(caregiver.phone).toBe('+919876543213');
      expect(caregiver.district).toBe('Ernakulam');
      expect(caregiver.skills).toContain('Palliative Care');
      expect(caregiver.status).toBe('available');
      expect(caregiver.dailyRate).toBe(1200);
      expect(caregiver.experienceYears).toBe(5.0);
    });

    it('should properly link Caregiver to User account and Tenant', () => {
      const user = new User();
      user.id = 'user-456';
      user.name = 'Priya Lakshmi';
      user.role = UserRole.CAREGIVER;

      const tenant = new Tenant();
      tenant.id = 'tenant-123';
      tenant.name = 'Kerala Care Agency';

      const caregiver = new Caregiver();
      caregiver.user = user;
      caregiver.userId = user.id;
      caregiver.tenant = tenant;
      caregiver.tenantId = tenant.id;

      expect(caregiver.user.role).toBe('caregiver');
      expect(caregiver.tenant.name).toBe('Kerala Care Agency');
      expect(caregiver.userId).toBe(user.id);
      expect(caregiver.tenantId).toBe(tenant.id);
    });

    it('should properly link Caregiver to CaregiverDocument', () => {
      const caregiver = new Caregiver();
      caregiver.id = 'cg-123';

      const doc = new CaregiverDocument();
      doc.id = 'doc-1';
      doc.caregiverId = caregiver.id;
      doc.documentType = 'nursing_certificate';
      doc.title = 'BSc Nursing Certificate';
      doc.fileUrl = 'https://storage.agency.com/cert.pdf';
      doc.verified = true;

      caregiver.documents = [doc];

      expect(caregiver.documents.length).toBe(1);
      expect(caregiver.documents[0].documentType).toBe('nursing_certificate');
      expect(caregiver.documents[0].verified).toBe(true);
    });
  });

  describe('PostgreSQL Migration 006 - PostGIS Extension & Spatial Setup', () => {
    const migration006Path = path.join(
      __dirname,
      '../../database/migrations/006_enable_postgis_and_geocoding.sql'
    );

    it('should have migration file 006_enable_postgis_and_geocoding.sql present', () => {
      expect(fs.existsSync(migration006Path)).toBe(true);
    });

    it('should explicitly enable postgis extension in migration 006', () => {
      const sql006 = fs.readFileSync(migration006Path, 'utf-8');
      expect(sql006).toContain('CREATE EXTENSION IF NOT EXISTS "postgis"');
    });

    it('should ensure caregivers location column exists with Point SRID 4326', () => {
      const sql006 = fs.readFileSync(migration006Path, 'utf-8');
      expect(sql006).toContain('ALTER TABLE caregivers ADD COLUMN location GEOMETRY(Point, 4326)');
    });

    it('should configure GiST spatial index on caregivers location', () => {
      const sql006 = fs.readFileSync(migration006Path, 'utf-8');
      expect(sql006).toContain(
        'CREATE INDEX IF NOT EXISTS idx_caregivers_location ON caregivers USING GIST (location)'
      );
    });

    it('should maintain automatic PostGIS location sync trigger on coordinate insert/update', () => {
      const sql006 = fs.readFileSync(migration006Path, 'utf-8');
      expect(sql006).toContain('CREATE OR REPLACE FUNCTION sync_caregiver_location()');
      expect(sql006).toContain('BEFORE INSERT OR UPDATE OF latitude, longitude ON caregivers');
    });

    it('should backfill geometry points for existing caregivers with lat/lng', () => {
      const sql006 = fs.readFileSync(migration006Path, 'utf-8');
      expect(sql006).toContain('UPDATE caregivers');
      expect(sql006).toContain('SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)');
    });
  });

  describe('PostgreSQL Migration 007 - GiST Spatial Index & Multi-Tenant Optimization', () => {
    const migration007Path = path.join(
      __dirname,
      '../../database/migrations/007_gist_spatial_index.sql'
    );

    it('should have migration file 007_gist_spatial_index.sql present', () => {
      expect(fs.existsSync(migration007Path)).toBe(true);
    });

    it('should enable btree_gist extension for composite multi-tenant spatial indexing', () => {
      const sql007 = fs.readFileSync(migration007Path, 'utf-8');
      expect(sql007).toContain('CREATE EXTENSION IF NOT EXISTS "btree_gist"');
    });

    it('should configure primary GiST index on caregivers location', () => {
      const sql007 = fs.readFileSync(migration007Path, 'utf-8');
      expect(sql007).toContain(
        'CREATE INDEX IF NOT EXISTS idx_caregivers_location ON caregivers USING GIST (location)'
      );
    });

    it('should configure composite GiST index on (tenant_id, location) for multi-tenant isolation', () => {
      const sql007 = fs.readFileSync(migration007Path, 'utf-8');
      expect(sql007).toContain(
        'CREATE INDEX IF NOT EXISTS idx_caregivers_tenant_location ON caregivers USING GIST (tenant_id, location)'
      );
    });

    it('should configure functional GiST index on CAST(location AS geography) for meter-based queries', () => {
      const sql007 = fs.readFileSync(migration007Path, 'utf-8');
      expect(sql007).toContain(
        'CREATE INDEX IF NOT EXISTS idx_caregivers_location_geog ON caregivers USING GIST (CAST(location AS geography))'
      );
    });
  });

  describe('PostgreSQL Migration 009 - Daily Rate & Compensation Configuration', () => {
    const migration009Path = path.join(
      __dirname,
      '../../database/migrations/009_caregiver_rate_configuration.sql'
    );

    it('should have migration file 009_caregiver_rate_configuration.sql present', () => {
      expect(fs.existsSync(migration009Path)).toBe(true);
    });

    it('should add live_in_rate, hourly_rate, commission_percentage, and rate_notes columns', () => {
      const sql009 = fs.readFileSync(migration009Path, 'utf-8');
      expect(sql009).toContain('ALTER TABLE caregivers');
      expect(sql009).toContain('ADD COLUMN IF NOT EXISTS live_in_rate NUMERIC(10, 2) NOT NULL DEFAULT 0');
      expect(sql009).toContain('ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 0');
      expect(sql009).toContain('ADD COLUMN IF NOT EXISTS commission_percentage NUMERIC(5, 2) NOT NULL DEFAULT 15.00');
      expect(sql009).toContain('ADD COLUMN IF NOT EXISTS rate_notes TEXT');
    });

    it('should instantiate Caregiver with rate configuration fields', () => {
      const caregiver = new Caregiver();
      caregiver.dailyRate = 1200;
      caregiver.liveInRate = 1800;
      caregiver.hourlyRate = 150;
      caregiver.commissionPercentage = 20;
      caregiver.rateNotes = 'Specialized geriatric care rate';

      expect(caregiver.dailyRate).toBe(1200);
      expect(caregiver.liveInRate).toBe(1800);
      expect(caregiver.hourlyRate).toBe(150);
      expect(caregiver.commissionPercentage).toBe(20);
      expect(caregiver.rateNotes).toBe('Specialized geriatric care rate');
    });
  });
});


