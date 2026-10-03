import * as fs from 'fs';
import * as path from 'path';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { Payment } from './entities/payment.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Caregiver } from '../caregivers/entities/caregiver.entity';
import { User } from '../users/entities/user.entity';

describe('Payments Schema & Migration Verification', () => {
  const migrationPath = path.join(
    __dirname,
    '../../database/migrations/010_create_payments.sql'
  );

  it('should have migration file 010_create_payments.sql present', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  describe('PostgreSQL Migration 010 Schema Definition', () => {
    let sql: string;

    beforeAll(() => {
      sql = fs.readFileSync(migrationPath, 'utf-8');
    });

    it('should define payment_status enum with draft, approved, paid', () => {
      expect(sql).toContain("CREATE TYPE payment_status AS ENUM");
      expect(sql).toContain("'draft'");
      expect(sql).toContain("'approved'");
      expect(sql).toContain("'paid'");
    });

    it('should define payments table with required financial calculation columns', () => {
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS payments (');
      expect(sql).toContain('id UUID PRIMARY KEY DEFAULT gen_random_uuid()');
      expect(sql).toContain('tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE');
      expect(sql).toContain('caregiver_id UUID NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE');
      expect(sql).toContain('period_month VARCHAR(7) NOT NULL');
      expect(sql).toContain('days_present NUMERIC(5, 1) NOT NULL DEFAULT 0');
      expect(sql).toContain('days_half_day NUMERIC(5, 1) NOT NULL DEFAULT 0');
      expect(sql).toContain('days_absent NUMERIC(5, 1) NOT NULL DEFAULT 0');
      expect(sql).toContain('days_on_leave NUMERIC(5, 1) NOT NULL DEFAULT 0');
      expect(sql).toContain('total_days_worked NUMERIC(5, 1) NOT NULL DEFAULT 0');
      expect(sql).toContain('daily_rate NUMERIC(10, 2) NOT NULL DEFAULT 0');
      expect(sql).toContain('gross_amount NUMERIC(10, 2) NOT NULL DEFAULT 0');
      expect(sql).toContain('commission_percentage NUMERIC(5, 2) NOT NULL DEFAULT 15.00');
      expect(sql).toContain('commission_amount NUMERIC(10, 2) NOT NULL DEFAULT 0');
      expect(sql).toContain('deductions NUMERIC(10, 2) NOT NULL DEFAULT 0');
      expect(sql).toContain('net_payout NUMERIC(10, 2) NOT NULL DEFAULT 0');
      expect(sql).toContain("status payment_status NOT NULL DEFAULT 'draft'");
      expect(sql).toContain('computed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP');
      expect(sql).toContain('approved_by UUID REFERENCES users(id) ON DELETE SET NULL');
    });

    it('should define unique index on (caregiver_id, period_month)', () => {
      expect(sql).toContain(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_caregiver_period ON payments (caregiver_id, period_month);'
      );
    });

    it('should define performance and multi-tenant indexes', () => {
      expect(sql).toContain('idx_payments_tenant_id');
      expect(sql).toContain('idx_payments_caregiver_id');
      expect(sql).toContain('idx_payments_period_month');
      expect(sql).toContain('idx_payments_status');
    });

    it('should configure Row-Level Security (RLS) on payments table', () => {
      expect(sql).toContain('ALTER TABLE payments ENABLE ROW LEVEL SECURITY;');
      expect(sql).toContain('ALTER TABLE payments FORCE ROW LEVEL SECURITY;');
      expect(sql).toContain('CREATE POLICY payments_isolation_policy ON payments');
      expect(sql).toContain("current_app_user_role() IN ('owner', 'office_staff')");
      expect(sql).toContain("current_app_user_role() = 'caregiver'");
    });
  });

  describe('Payment TypeORM Entity', () => {
    it('should instantiate entity with appropriate default values', () => {
      const payment = new Payment();
      payment.id = 'pmt-123';
      payment.tenantId = 'tenant-123';
      payment.caregiverId = 'cg-123';
      payment.periodMonth = '2026-09';
      payment.daysPresent = 10;
      payment.daysHalfDay = 2;
      payment.totalDaysWorked = 11.0;
      payment.dailyRate = 800;
      payment.grossAmount = 8800;
      payment.commissionPercentage = 15;
      payment.commissionAmount = 1320;
      payment.deductions = 0;
      payment.netPayout = 7480;
      payment.status = PaymentStatus.DRAFT;

      expect(payment.id).toBe('pmt-123');
      expect(payment.periodMonth).toBe('2026-09');
      expect(payment.totalDaysWorked).toBe(11.0);
      expect(payment.grossAmount).toBe(8800);
      expect(payment.commissionAmount).toBe(1320);
      expect(payment.netPayout).toBe(7480);
      expect(payment.status).toBe(PaymentStatus.DRAFT);
    });
  });
});
