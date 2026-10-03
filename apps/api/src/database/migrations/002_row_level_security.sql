-- =============================================================================
-- Migration: 002_row_level_security.sql
-- Description: Row-Level Security (RLS) policies for tenant isolation & caregiver self-view
-- =============================================================================

-- 1. Helper functions to read session context variables safely
CREATE OR REPLACE FUNCTION current_app_tenant_id() RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::uuid;
EXCEPTION
    WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION current_app_user_id() RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_user_id', true), '')::uuid;
EXCEPTION
    WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION current_app_user_role() RETURNS TEXT AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_user_role', true), '');
EXCEPTION
    WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION is_app_super_admin() RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE(current_setting('app.is_super_admin', true) = 'true', false)
        OR current_app_user_role() = 'super_admin';
EXCEPTION
    WHEN OTHERS THEN RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION should_bypass_rls() RETURNS BOOLEAN AS $$
BEGIN
    RETURN is_app_super_admin()
        OR COALESCE(current_setting('app.bypass_rls', true) = 'on', false);
EXCEPTION
    WHEN OTHERS THEN RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Convenience functions for application connection session configuration
CREATE OR REPLACE FUNCTION set_tenant_session(
    p_tenant_id UUID DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_role TEXT DEFAULT NULL
) RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_tenant_id', COALESCE(p_tenant_id::text, ''), false);
    PERFORM set_config('app.current_user_id', COALESCE(p_user_id::text, ''), false);
    PERFORM set_config('app.current_user_role', COALESCE(p_role, ''), false);
    IF p_role = 'super_admin' THEN
        PERFORM set_config('app.is_super_admin', 'true', false);
    ELSE
        PERFORM set_config('app.is_super_admin', 'false', false);
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION clear_tenant_session() RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_tenant_id', '', false);
    PERFORM set_config('app.current_user_id', '', false);
    PERFORM set_config('app.current_user_role', '', false);
    PERFORM set_config('app.is_super_admin', 'false', false);
END;
$$ LANGUAGE plpgsql;

-- 3. Enable and force RLS on all tenant-scoped tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

ALTER TABLE invite_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_tokens FORCE ROW LEVEL SECURITY;

-- 4. RLS Policy for `tenants` table
-- - Super Admin or migration bypass: access all tenants
-- - Tenant Users (Owner, Office Staff, Caregiver): can only view their own agency
DROP POLICY IF EXISTS tenant_isolation_policy ON tenants;
CREATE POLICY tenant_isolation_policy ON tenants
    FOR ALL
    USING (
        should_bypass_rls()
        OR (current_app_tenant_id() IS NOT NULL AND id = current_app_tenant_id())
    )
    WITH CHECK (
        should_bypass_rls()
        OR (current_app_tenant_id() IS NOT NULL AND id = current_app_tenant_id())
    );

-- 5. RLS Policy for `users` table
-- - Super Admin or bypass: access all users
-- - Agency Owner & Office Staff: access all users within their tenant
-- - Caregiver: STRICT SELF-VIEW ONLY — can only view/access their own user row
DROP POLICY IF EXISTS user_isolation_policy ON users;
CREATE POLICY user_isolation_policy ON users
    FOR ALL
    USING (
        should_bypass_rls()
        OR (
            current_app_tenant_id() IS NOT NULL
            AND tenant_id = current_app_tenant_id()
            AND (
                -- Caregivers can ONLY view/access their own user account
                CASE
                    WHEN current_app_user_role() = 'caregiver' THEN
                        id = current_app_user_id()
                    ELSE
                        true
                END
            )
        )
    )
    WITH CHECK (
        should_bypass_rls()
        OR (
            current_app_tenant_id() IS NOT NULL
            AND tenant_id = current_app_tenant_id()
            AND (
                CASE
                    WHEN current_app_user_role() = 'caregiver' THEN
                        id = current_app_user_id()
                    ELSE
                        true
                END
            )
        )
    );

-- 6. RLS Policy for `invite_tokens` table
-- - Super Admin or bypass: access all invite tokens
-- - Agency Owner & Office Staff: access invite tokens for their tenant
-- - Caregiver: NO ACCESS to invite tokens (lowest-privilege role)
DROP POLICY IF EXISTS invite_tokens_isolation_policy ON invite_tokens;
CREATE POLICY invite_tokens_isolation_policy ON invite_tokens
    FOR ALL
    USING (
        should_bypass_rls()
        OR (
            current_app_tenant_id() IS NOT NULL
            AND tenant_id = current_app_tenant_id()
            AND current_app_user_role() <> 'caregiver'
        )
    )
    WITH CHECK (
        should_bypass_rls()
        OR (
            current_app_tenant_id() IS NOT NULL
            AND tenant_id = current_app_tenant_id()
            AND current_app_user_role() <> 'caregiver'
        )
    );
