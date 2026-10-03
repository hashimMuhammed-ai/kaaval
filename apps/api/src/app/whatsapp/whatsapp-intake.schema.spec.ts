import * as fs from 'fs';
import * as path from 'path';
import {
  WhatsAppIntakeSession,
  IntakeStep,
  IntakeSessionStatus,
} from './entities/whatsapp-intake-session.entity';

describe('WhatsApp Intake Schema & Migration Verification', () => {
  const migrationPath = path.join(
    __dirname,
    '../../database/migrations/014_create_whatsapp_intake_sessions.sql'
  );

  it('should have migration file 014_create_whatsapp_intake_sessions.sql present', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  describe('PostgreSQL Migration 014 Schema Definition', () => {
    let sql: string;

    beforeAll(() => {
      sql = fs.readFileSync(migrationPath, 'utf-8');
    });

    it('should define whatsapp_intake_sessions table with all required fields per brief', () => {
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS whatsapp_intake_sessions (');
      expect(sql).toContain('id UUID PRIMARY KEY DEFAULT gen_random_uuid()');
      expect(sql).toContain('tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE');
      expect(sql).toContain('request_id UUID REFERENCES requests(id) ON DELETE SET NULL');
      expect(sql).toContain('reference_id VARCHAR(32)');
      expect(sql).toContain('phone VARCHAR(32) NOT NULL');
      expect(sql).toContain("current_step VARCHAR(64) NOT NULL DEFAULT 'service'");
      expect(sql).toContain('service_type VARCHAR(64)');
      expect(sql).toContain('district VARCHAR(100)');
      expect(sql).toContain('locality VARCHAR(255)');
      expect(sql).toContain('duration VARCHAR(64)');
      expect(sql).toContain('patient_name VARCHAR(255)');
      expect(sql).toContain('patient_age VARCHAR(32)');
      expect(sql).toContain("gender_preference VARCHAR(32) DEFAULT 'any'");
      expect(sql).toContain('start_date VARCHAR(64)');
      expect(sql).toContain('contact_name VARCHAR(255)');
      expect(sql).toContain("status VARCHAR(32) NOT NULL DEFAULT 'in_progress'");
      expect(sql).toContain("metadata JSONB DEFAULT '{}'");
      expect(sql).toContain('created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP');
      expect(sql).toContain('updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP');
      expect(sql).toContain('last_message_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP');
    });

    it('should configure performance and lookup indexes on whatsapp_intake_sessions', () => {
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_intake_sessions_phone ON whatsapp_intake_sessions (phone);');
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_intake_sessions_tenant ON whatsapp_intake_sessions (tenant_id);');
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_intake_sessions_request_id ON whatsapp_intake_sessions (request_id);');
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_intake_sessions_reference_id ON whatsapp_intake_sessions (reference_id);');
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_intake_sessions_status ON whatsapp_intake_sessions (status);');
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_intake_sessions_last_message ON whatsapp_intake_sessions (last_message_at DESC);');
    });

    it('should configure Row-Level Security policies with tenant isolation', () => {
      expect(sql).toContain('ALTER TABLE whatsapp_intake_sessions ENABLE ROW LEVEL SECURITY;');
      expect(sql).toContain('ALTER TABLE whatsapp_intake_sessions FORCE ROW LEVEL SECURITY;');
      expect(sql).toContain('CREATE POLICY whatsapp_intake_sessions_isolation_policy ON whatsapp_intake_sessions');
      expect(sql).toContain("current_app_user_role() IN ('owner', 'office_staff')");
    });
  });

  describe('TypeORM Entity Verification', () => {
    it('should instantiate WhatsAppIntakeSession entity with proper fields', () => {
      const session = new WhatsAppIntakeSession();
      session.id = 'session-123';
      session.tenantId = 'tenant-123';
      session.requestId = 'req-123';
      session.referenceId = 'REQ-2026-894102';
      session.phone = '919847012345';
      session.currentStep = IntakeStep.SERVICE;
      session.serviceType = 'elderly_care';
      session.district = 'Ernakulam';
      session.locality = 'Kakkanad';
      session.duration = '24_hours';
      session.patientName = 'Mary Varghese';
      session.patientAge = '78';
      session.genderPreference = 'female';
      session.startDate = 'Immediately';
      session.contactName = 'Dr. Thomas';
      session.status = IntakeSessionStatus.IN_PROGRESS;
      session.metadata = {};

      expect(session.id).toBe('session-123');
      expect(session.tenantId).toBe('tenant-123');
      expect(session.requestId).toBe('req-123');
      expect(session.referenceId).toBe('REQ-2026-894102');
      expect(session.phone).toBe('919847012345');
      expect(session.currentStep).toBe(IntakeStep.SERVICE);
      expect(session.serviceType).toBe('elderly_care');
      expect(session.district).toBe('Ernakulam');
      expect(session.locality).toBe('Kakkanad');
      expect(session.duration).toBe('24_hours');
      expect(session.patientName).toBe('Mary Varghese');
      expect(session.patientAge).toBe('78');
      expect(session.genderPreference).toBe('female');
      expect(session.startDate).toBe('Immediately');
      expect(session.contactName).toBe('Dr. Thomas');
      expect(session.status).toBe(IntakeSessionStatus.IN_PROGRESS);
    });
  });
});
