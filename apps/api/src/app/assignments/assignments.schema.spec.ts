import * as fs from 'fs';
import * as path from 'path';
import { AssignmentStatus } from '../common/enums/assignment-status.enum';
import { AttendanceStatus } from '../common/enums/attendance-status.enum';
import { Assignment } from './entities/assignment.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Caregiver } from '../caregivers/entities/caregiver.entity';

describe('Assignments & Attendance Schema & Migration Verification', () => {
  const migrationPath = path.join(
    __dirname,
    '../../database/migrations/008_create_assignments_and_attendance.sql'
  );

  it('should have migration file 008_create_assignments_and_attendance.sql present', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  describe('PostgreSQL Migration 008 Schema Definition', () => {
    let sql: string;

    beforeAll(() => {
      sql = fs.readFileSync(migrationPath, 'utf-8');
    });

    it('should define assignment_status and attendance_status enums', () => {
      expect(sql).toContain(
        "CREATE TYPE assignment_status AS ENUM (\n        'active',\n        'completed',\n        'cancelled',\n        'replaced'\n    );"
      );
      expect(sql).toContain(
        "CREATE TYPE attendance_status AS ENUM (\n        'present',\n        'half_day',\n        'absent',\n        'on_leave'\n    );"
      );
    });

    it('should define assignments table with all required fields per brief', () => {
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS assignments (');
      expect(sql).toContain('id UUID PRIMARY KEY DEFAULT gen_random_uuid()');
      expect(sql).toContain('tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE');
      expect(sql).toContain('customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE');
      expect(sql).toContain('caregiver_id UUID NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE');
      expect(sql).toContain('start_date DATE NOT NULL');
      expect(sql).toContain('end_date DATE');
      expect(sql).toContain("status assignment_status NOT NULL DEFAULT 'active'");
      expect(sql).toContain('replaced_by_id UUID REFERENCES assignments(id) ON DELETE SET NULL');
      expect(sql).toContain('replacement_reason TEXT');
      expect(sql).toContain('billing_rate NUMERIC(10, 2) NOT NULL DEFAULT 0');
      expect(sql).toContain('caregiver_daily_rate NUMERIC(10, 2) NOT NULL DEFAULT 0');
      expect(sql).toContain('notes TEXT');
      expect(sql).toContain('created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP');
      expect(sql).toContain('updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP');
    });

    it('should define attendance table with check-in/out and verification fields', () => {
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS attendance (');
      expect(sql).toContain('id UUID PRIMARY KEY DEFAULT gen_random_uuid()');
      expect(sql).toContain('tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE');
      expect(sql).toContain('assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE');
      expect(sql).toContain('caregiver_id UUID NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE');
      expect(sql).toContain('customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE');
      expect(sql).toContain('date DATE NOT NULL');
      expect(sql).toContain('check_in_time TIMESTAMPTZ');
      expect(sql).toContain('check_out_time TIMESTAMPTZ');
      expect(sql).toContain("status attendance_status NOT NULL DEFAULT 'present'");
      expect(sql).toContain('check_in_latitude DOUBLE PRECISION');
      expect(sql).toContain('check_in_longitude DOUBLE PRECISION');
      expect(sql).toContain('check_out_latitude DOUBLE PRECISION');
      expect(sql).toContain('check_out_longitude DOUBLE PRECISION');
      expect(sql).toContain('check_in_notes TEXT');
      expect(sql).toContain('check_out_notes TEXT');
      expect(sql).toContain('verified BOOLEAN NOT NULL DEFAULT false');
      expect(sql).toContain('verified_by UUID REFERENCES users(id) ON DELETE SET NULL');
      expect(sql).toContain('verified_at TIMESTAMPTZ');
    });

    it('should enforce unique constraint of exactly one attendance record per assignment per day', () => {
      expect(sql).toContain(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_assignment_date ON attendance (assignment_id, date);'
      );
    });

    it('should configure performance and tenant-isolation indexes on assignments and attendance', () => {
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_assignments_tenant_id ON assignments (tenant_id);');
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_assignments_customer_id ON assignments (customer_id);');
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_assignments_caregiver_id ON assignments (caregiver_id);');
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_assignments_tenant_status ON assignments (tenant_id, status);');
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_assignments_replaced_by_id ON assignments (replaced_by_id);');

      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_attendance_tenant_id ON attendance (tenant_id);');
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_attendance_assignment_id ON attendance (assignment_id);');
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_attendance_caregiver_id ON attendance (caregiver_id);');
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_attendance_customer_id ON attendance (customer_id);');
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_attendance_tenant_date ON attendance (tenant_id, date);');
    });

    it('should configure Row-Level Security policies on assignments and attendance', () => {
      expect(sql).toContain('ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;');
      expect(sql).toContain('ALTER TABLE assignments FORCE ROW LEVEL SECURITY;');
      expect(sql).toContain('CREATE POLICY assignments_isolation_policy ON assignments');

      expect(sql).toContain('ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;');
      expect(sql).toContain('ALTER TABLE attendance FORCE ROW LEVEL SECURITY;');
      expect(sql).toContain('CREATE POLICY attendance_isolation_policy ON attendance');
    });
  });

  describe('TypeORM Entities Verification', () => {
    it('should instantiate Assignment entity with proper fields', () => {
      const assignment = new Assignment();
      assignment.id = 'asgn-123';
      assignment.tenantId = 'tenant-123';
      assignment.customerId = 'cust-123';
      assignment.caregiverId = 'cg-123';
      assignment.startDate = '2026-10-01';
      assignment.status = AssignmentStatus.ACTIVE;
      assignment.billingRate = 1500;
      assignment.caregiverDailyRate = 1200;
      assignment.notes = 'Regular shift';

      expect(assignment.id).toBe('asgn-123');
      expect(assignment.status).toBe(AssignmentStatus.ACTIVE);
      expect(assignment.billingRate).toBe(1500);
      expect(assignment.caregiverDailyRate).toBe(1200);
    });

    it('should model assignment replacement lineage with replaced_by and history tracking', () => {
      const assignment1 = new Assignment();
      assignment1.id = 'asgn-old';
      assignment1.status = AssignmentStatus.REPLACED;
      assignment1.replacementReason = 'Leave / Emergency';

      const assignment2 = new Assignment();
      assignment2.id = 'asgn-new';
      assignment2.status = AssignmentStatus.ACTIVE;

      assignment1.replacedById = assignment2.id;
      assignment1.replacedBy = assignment2;
      assignment2.replacedAssignments = [assignment1];

      const customer = new Customer();
      customer.id = 'cust-1';
      customer.assignments = [assignment1, assignment2];

      const caregiver = new Caregiver();
      caregiver.id = 'cg-1';
      caregiver.assignments = [assignment1];

      expect(assignment1.replacedById).toBe('asgn-new');
      expect(assignment1.replacedBy?.id).toBe('asgn-new');
      expect(assignment2.replacedAssignments).toHaveLength(1);
      expect(assignment2.replacedAssignments?.[0].id).toBe('asgn-old');
      expect(customer.assignments).toHaveLength(2);
      expect(caregiver.assignments).toHaveLength(1);
    });

    it('should instantiate Attendance entity with check-in and check-out fields', () => {
      const attendance = new Attendance();
      attendance.id = 'att-123';
      attendance.tenantId = 'tenant-123';
      attendance.assignmentId = 'asgn-123';
      attendance.caregiverId = 'cg-123';
      attendance.customerId = 'cust-123';
      attendance.date = '2026-10-01';
      attendance.checkInTime = new Date('2026-10-01T08:00:00Z');
      attendance.checkOutTime = new Date('2026-10-01T17:00:00Z');
      attendance.status = AttendanceStatus.PRESENT;
      attendance.verified = true;

      expect(attendance.id).toBe('att-123');
      expect(attendance.status).toBe(AttendanceStatus.PRESENT);
      expect(attendance.date).toBe('2026-10-01');
      expect(attendance.verified).toBe(true);
    });

    it('should support feedback request tracking fields on Assignment entity', () => {
      const assignment = new Assignment();
      assignment.feedbackRequestedAt = new Date('2026-10-02T10:00:00Z');
      assignment.feedbackRequestStatus = 'sent';

      expect(assignment.feedbackRequestedAt).toEqual(new Date('2026-10-02T10:00:00Z'));
      expect(assignment.feedbackRequestStatus).toBe('sent');
    });

    it('should verify migration 011_add_feedback_requested_to_assignments.sql exists and adds feedback columns', () => {
      const mig11Path = path.join(
        __dirname,
        '../../database/migrations/011_add_feedback_requested_to_assignments.sql'
      );
      expect(fs.existsSync(mig11Path)).toBe(true);
      const sql11 = fs.readFileSync(mig11Path, 'utf-8');
      expect(sql11).toContain('feedback_requested_at TIMESTAMPTZ');
      expect(sql11).toContain("feedback_request_status VARCHAR(32) DEFAULT 'pending'");
    });

    it('should support replacement SLA timer and absence tracking fields on Assignment entity', () => {
      const assignment = new Assignment();
      assignment.replacementRequestedAt = new Date('2026-10-02T10:00:00Z');
      assignment.replacementSlaMinutes = 120;
      assignment.replacementSlaEscalatedAt = new Date('2026-10-02T12:00:00Z');
      assignment.replacementSlaStatus = 'escalated';
      assignment.absenceReason = 'leave';
      assignment.absenceNotes = 'Caregiver has high fever';

      expect(assignment.replacementRequestedAt).toEqual(new Date('2026-10-02T10:00:00Z'));
      expect(assignment.replacementSlaMinutes).toBe(120);
      expect(assignment.replacementSlaStatus).toBe('escalated');
      expect(assignment.absenceReason).toBe('leave');
      expect(assignment.absenceNotes).toBe('Caregiver has high fever');
    });

    it('should verify migration 016_add_replacement_sla_to_assignments.sql exists and adds SLA fields', () => {
      const mig16Path = path.join(
        __dirname,
        '../../database/migrations/016_add_replacement_sla_to_assignments.sql'
      );
      expect(fs.existsSync(mig16Path)).toBe(true);
      const sql16 = fs.readFileSync(mig16Path, 'utf-8');
      expect(sql16).toContain('replacement_requested_at TIMESTAMPTZ');
      expect(sql16).toContain('replacement_sla_minutes INTEGER DEFAULT 120');
      expect(sql16).toContain('replacement_sla_escalated_at TIMESTAMPTZ');
      expect(sql16).toContain("replacement_sla_status VARCHAR(32) DEFAULT 'none'");
      expect(sql16).toContain('absence_reason VARCHAR(64)');
      expect(sql16).toContain('absence_notes TEXT');
    });
  });
});
