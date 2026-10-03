import * as fs from 'fs';
import * as path from 'path';
import { Feedback } from './entities/feedback.entity';

describe('Feedback Schema & Migration Verification', () => {
  const migrationPath = path.join(
    __dirname,
    '../../database/migrations/012_create_feedback.sql'
  );

  it('should have migration file 012_create_feedback.sql present', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  describe('PostgreSQL Migration 012 Schema Definition', () => {
    let sql: string;

    beforeAll(() => {
      sql = fs.readFileSync(migrationPath, 'utf-8');
    });

    it('should define feedback table with all required fields per brief', () => {
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS feedback (');
      expect(sql).toContain('id UUID PRIMARY KEY DEFAULT gen_random_uuid()');
      expect(sql).toContain('tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE');
      expect(sql).toContain('assignment_id UUID NOT NULL UNIQUE REFERENCES assignments(id) ON DELETE CASCADE');
      expect(sql).toContain('caregiver_id UUID NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE');
      expect(sql).toContain('customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE');
      expect(sql).toContain('rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5)');
      expect(sql).toContain('comment TEXT');
      expect(sql).toContain("source VARCHAR(32) NOT NULL DEFAULT 'whatsapp'");
      expect(sql).toContain('whatsapp_message_id VARCHAR(128)');
      expect(sql).toContain('created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP');
      expect(sql).toContain('updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP');
    });

    it('should configure performance and tenant isolation indexes on feedback', () => {
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_feedback_tenant_id ON feedback (tenant_id);');
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_feedback_assignment_id ON feedback (assignment_id);');
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_feedback_caregiver_id ON feedback (caregiver_id);');
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_feedback_customer_id ON feedback (customer_id);');
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_feedback_rating ON feedback (rating);');
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_feedback_tenant_created ON feedback (tenant_id, created_at);');
    });

    it('should configure Row-Level Security policies with caregiver self-view isolation', () => {
      expect(sql).toContain('ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;');
      expect(sql).toContain('ALTER TABLE feedback FORCE ROW LEVEL SECURITY;');
      expect(sql).toContain('CREATE POLICY feedback_isolation_policy ON feedback');
      expect(sql).toContain("current_app_user_role() = 'caregiver'");
      expect(sql).toContain('SELECT id FROM caregivers WHERE user_id = current_app_user_id()');
    });
  });

  describe('TypeORM Entity Verification', () => {
    it('should instantiate Feedback entity with proper fields', () => {
      const fb = new Feedback();
      fb.id = 'fb-123';
      fb.tenantId = 'tenant-123';
      fb.assignmentId = 'asgn-123';
      fb.caregiverId = 'cg-123';
      fb.customerId = 'cust-123';
      fb.rating = 5;
      fb.comment = 'Excellent attentive care';
      fb.source = 'whatsapp';

      expect(fb.id).toBe('fb-123');
      expect(fb.tenantId).toBe('tenant-123');
      expect(fb.assignmentId).toBe('asgn-123');
      expect(fb.caregiverId).toBe('cg-123');
      expect(fb.customerId).toBe('cust-123');
      expect(fb.rating).toBe(5);
      expect(fb.comment).toBe('Excellent attentive care');
      expect(fb.source).toBe('whatsapp');
    });
  });
});
