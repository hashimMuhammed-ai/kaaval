import * as fs from 'fs';
import * as path from 'path';

describe('Phase 9 Point 3 — Push Subscriptions and Admin Notifications Schema', () => {
  const migrationPath = path.resolve(
    __dirname,
    '../../database/migrations/015_create_push_subscriptions_and_admin_notifications.sql'
  );

  it('should have migration 015 file present on disk', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  it('should define push_subscriptions table with tenant_id, endpoint, keys, and RLS', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // push_subscriptions table
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS push_subscriptions');
    expect(sql).toContain('tenant_id UUID NOT NULL REFERENCES tenants(id)');
    expect(sql).toContain('user_id UUID REFERENCES users(id)');
    expect(sql).toContain('endpoint TEXT NOT NULL');
    expect(sql).toContain('p256dh TEXT NOT NULL');
    expect(sql).toContain('auth TEXT NOT NULL');
    expect(sql).toContain('user_agent TEXT');
    expect(sql).toContain('CONSTRAINT uq_push_subscriptions_tenant_endpoint UNIQUE (tenant_id, endpoint)');

    // Index & RLS
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_push_subscriptions_tenant_id');
    expect(sql).toContain('ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain("CREATE POLICY tenant_isolation_policy ON push_subscriptions");
  });

  it('should define admin_notifications table with tenant_id, channel, payload, status, and RLS', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // admin_notifications table
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS admin_notifications');
    expect(sql).toContain('tenant_id UUID NOT NULL REFERENCES tenants(id)');
    expect(sql).toContain('user_id UUID REFERENCES users(id)');
    expect(sql).toContain('type VARCHAR(50) NOT NULL');
    expect(sql).toContain("channel VARCHAR(20) NOT NULL DEFAULT 'all'");
    expect(sql).toContain('title VARCHAR(255) NOT NULL');
    expect(sql).toContain('body TEXT NOT NULL');
    expect(sql).toContain("payload JSONB DEFAULT '{}'::jsonb");
    expect(sql).toContain("status VARCHAR(50) NOT NULL DEFAULT 'sent'");
    expect(sql).toContain('read_at TIMESTAMPTZ');

    // Index & RLS
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_admin_notifications_tenant_created');
    expect(sql).toContain('ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain("CREATE POLICY tenant_isolation_policy ON admin_notifications");
  });
});
