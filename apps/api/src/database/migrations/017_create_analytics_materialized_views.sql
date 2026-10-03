-- =============================================================================
-- Migration: 017_create_analytics_materialized_views.sql
-- Description: Creates PostgreSQL materialized views for the Owner Analytics Dashboard:
--              1. mv_owner_monthly_analytics (monthly trend for revenue, occupancy, and time-to-fill)
--              2. mv_owner_analytics_overview (current tenant-level KPI summary)
--              Includes unique indexes for concurrent refresh without locking reads.
-- =============================================================================

-- Drop existing materialized views if they exist to allow clean idempotent creation
DROP MATERIALIZED VIEW IF EXISTS mv_owner_monthly_analytics CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_owner_analytics_overview CASCADE;

-- -----------------------------------------------------------------------------
-- 1. Materialized View: mv_owner_monthly_analytics
-- Tracks monthly historical trend per tenant for:
-- - Revenue Trend: gross customer billing, agency commission revenue, caregiver net payouts
-- - Average Time-to-Fill: incoming intake leads, filled requests, avg hours/days to fill
-- - Occupancy Rate: active working caregivers vs total registered agency caregivers
-- -----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW mv_owner_monthly_analytics AS
WITH tenant_months AS (
    -- Combine last 12 rolling months with any months containing payments, requests, or assignments
    SELECT t.id AS tenant_id, m.period_month
    FROM tenants t
    CROSS JOIN (
        SELECT TO_CHAR(d, 'YYYY-MM') AS period_month
        FROM generate_series(
            DATE_TRUNC('month', CURRENT_DATE - INTERVAL '11 months'),
            DATE_TRUNC('month', CURRENT_DATE),
            INTERVAL '1 month'
        ) d
    ) m
    UNION
    SELECT tenant_id, period_month 
    FROM payments 
    WHERE period_month ~ '^\d{4}-\d{2}$'
    UNION
    SELECT tenant_id, TO_CHAR(created_at, 'YYYY-MM') AS period_month 
    FROM requests 
    WHERE created_at IS NOT NULL
    UNION
    SELECT tenant_id, TO_CHAR(start_date, 'YYYY-MM') AS period_month 
    FROM assignments 
    WHERE start_date IS NOT NULL
),
monthly_revenue AS (
    SELECT
        p.tenant_id,
        p.period_month,
        COALESCE(SUM(p.gross_amount), 0)::NUMERIC(12, 2) AS gross_revenue,
        COALESCE(SUM(p.commission_amount), 0)::NUMERIC(12, 2) AS commission_revenue,
        COALESCE(SUM(p.net_payout), 0)::NUMERIC(12, 2) AS caregiver_payouts,
        COALESCE(SUM(p.deductions), 0)::NUMERIC(12, 2) AS total_deductions,
        COALESCE(SUM(p.total_days_worked), 0)::NUMERIC(10, 1) AS total_days_worked,
        COUNT(p.id)::INTEGER AS payments_count,
        COUNT(DISTINCT p.caregiver_id)::INTEGER AS caregivers_paid_count
    FROM payments p
    WHERE p.period_month ~ '^\d{4}-\d{2}$'
    GROUP BY p.tenant_id, p.period_month
),
request_fulfillments AS (
    SELECT
        r.id AS request_id,
        r.tenant_id,
        TO_CHAR(r.created_at, 'YYYY-MM') AS period_month,
        r.status,
        r.created_at,
        COALESCE(
            MIN(a.created_at),
            CASE WHEN r.status IN ('assigned', 'completed') THEN r.updated_at ELSE NULL END
        ) AS fulfilled_at
    FROM requests r
    LEFT JOIN customers c ON (c.request_id = r.id OR r.customer_id = c.id)
    LEFT JOIN assignments a ON a.customer_id = c.id
    GROUP BY r.id, r.tenant_id, r.created_at, r.status, r.updated_at
),
monthly_requests AS (
    SELECT
        rf.tenant_id,
        rf.period_month,
        COUNT(*)::INTEGER AS total_requests,
        COUNT(*) FILTER (WHERE rf.fulfilled_at IS NOT NULL)::INTEGER AS filled_requests,
        COUNT(*) FILTER (WHERE rf.status = 'pending')::INTEGER AS pending_requests,
        ROUND(
            COALESCE(
                AVG(
                    CASE
                        WHEN rf.fulfilled_at IS NOT NULL AND rf.fulfilled_at >= rf.created_at
                        THEN EXTRACT(EPOCH FROM (rf.fulfilled_at - rf.created_at)) / 3600.0
                        ELSE NULL
                    END
                ),
                0.0
            )::NUMERIC,
            2
        ) AS avg_time_to_fill_hours,
        ROUND(
            COALESCE(
                AVG(
                    CASE
                        WHEN rf.fulfilled_at IS NOT NULL AND rf.fulfilled_at >= rf.created_at
                        THEN EXTRACT(EPOCH FROM (rf.fulfilled_at - rf.created_at)) / 86400.0
                        ELSE NULL
                    END
                ),
                0.0
            )::NUMERIC,
            2
        ) AS avg_time_to_fill_days,
        ROUND(
            COALESCE(
                (COUNT(*) FILTER (WHERE rf.fulfilled_at IS NOT NULL)::NUMERIC * 100.0) /
                NULLIF(COUNT(*), 0),
                0.0
            ),
            2
        ) AS fill_rate_pct
    FROM request_fulfillments rf
    GROUP BY rf.tenant_id, rf.period_month
),
monthly_occupancy AS (
    SELECT
        tm.tenant_id,
        tm.period_month,
        -- Total registered caregivers in agency up to the end of that month
        (
            SELECT COUNT(*)::INTEGER
            FROM caregivers c
            WHERE c.tenant_id = tm.tenant_id
              AND c.created_at <= (TO_DATE(tm.period_month || '-01', 'YYYY-MM-DD') + INTERVAL '1 month' - INTERVAL '1 second')
        ) AS total_caregivers,
        -- Active caregivers with at least 1 overlapping active/completed/replaced assignment in that month
        (
            SELECT COUNT(DISTINCT a.caregiver_id)::INTEGER
            FROM assignments a
            WHERE a.tenant_id = tm.tenant_id
              AND a.start_date <= (TO_DATE(tm.period_month || '-01', 'YYYY-MM-DD') + INTERVAL '1 month' - INTERVAL '1 day')::DATE
              AND (a.end_date IS NULL OR a.end_date >= TO_DATE(tm.period_month || '-01', 'YYYY-MM-DD'))
              AND a.status IN ('active', 'completed', 'replaced')
        ) AS active_caregivers,
        -- Total assignments active in that month
        (
            SELECT COUNT(*)::INTEGER
            FROM assignments a
            WHERE a.tenant_id = tm.tenant_id
              AND a.start_date <= (TO_DATE(tm.period_month || '-01', 'YYYY-MM-DD') + INTERVAL '1 month' - INTERVAL '1 day')::DATE
              AND (a.end_date IS NULL OR a.end_date >= TO_DATE(tm.period_month || '-01', 'YYYY-MM-DD'))
              AND a.status IN ('active', 'completed', 'replaced')
        ) AS active_assignments
    FROM tenant_months tm
)
SELECT
    gen_random_uuid() AS id,
    tm.tenant_id,
    tm.period_month,
    -- Revenue trend
    COALESCE(rev.gross_revenue, 0)::NUMERIC(12, 2) AS gross_revenue,
    COALESCE(rev.commission_revenue, 0)::NUMERIC(12, 2) AS commission_revenue,
    COALESCE(rev.caregiver_payouts, 0)::NUMERIC(12, 2) AS caregiver_payouts,
    COALESCE(rev.total_deductions, 0)::NUMERIC(12, 2) AS total_deductions,
    COALESCE(rev.total_days_worked, 0)::NUMERIC(10, 1) AS total_days_worked,
    COALESCE(rev.payments_count, 0)::INTEGER AS payments_count,
    COALESCE(rev.caregivers_paid_count, 0)::INTEGER AS caregivers_paid_count,
    -- Time to fill
    COALESCE(req.total_requests, 0)::INTEGER AS total_requests,
    COALESCE(req.filled_requests, 0)::INTEGER AS filled_requests,
    COALESCE(req.pending_requests, 0)::INTEGER AS pending_requests,
    COALESCE(req.avg_time_to_fill_hours, 0.0)::NUMERIC(10, 2) AS avg_time_to_fill_hours,
    COALESCE(req.avg_time_to_fill_days, 0.0)::NUMERIC(10, 2) AS avg_time_to_fill_days,
    COALESCE(req.fill_rate_pct, 0.0)::NUMERIC(5, 2) AS fill_rate_pct,
    -- Occupancy
    COALESCE(occ.total_caregivers, 0)::INTEGER AS total_caregivers,
    COALESCE(occ.active_caregivers, 0)::INTEGER AS active_caregivers,
    COALESCE(occ.active_assignments, 0)::INTEGER AS active_assignments,
    ROUND(
        COALESCE(
            (COALESCE(occ.active_caregivers, 0)::NUMERIC * 100.0) /
            NULLIF(COALESCE(occ.total_caregivers, 0), 0),
            0.0
        ),
        2
    )::NUMERIC(5, 2) AS occupancy_rate_pct,
    CURRENT_TIMESTAMP AS refreshed_at
FROM tenant_months tm
LEFT JOIN monthly_revenue rev ON rev.tenant_id = tm.tenant_id AND rev.period_month = tm.period_month
LEFT JOIN monthly_requests req ON req.tenant_id = tm.tenant_id AND req.period_month = tm.period_month
LEFT JOIN monthly_occupancy occ ON occ.tenant_id = tm.tenant_id AND occ.period_month = tm.period_month
WITH DATA;

-- Indexes for fast querying and concurrent refresh on mv_owner_monthly_analytics
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_owner_monthly_analytics_unique
    ON mv_owner_monthly_analytics (tenant_id, period_month);

CREATE INDEX IF NOT EXISTS idx_mv_owner_monthly_analytics_tenant
    ON mv_owner_monthly_analytics (tenant_id);

CREATE INDEX IF NOT EXISTS idx_mv_owner_monthly_analytics_month
    ON mv_owner_monthly_analytics (period_month);


-- -----------------------------------------------------------------------------
-- 2. Materialized View: mv_owner_analytics_overview
-- Tracks current single-pane KPI snapshot per tenant for Owner Analytics Dashboard:
-- - Current Occupancy Rate: current available, assigned, on_leave, total workforce
-- - Overall Average Time-to-Fill: all-time and recent pipeline fill rates & avg hours
-- - Financial Summary: all-time gross & commission, current month gross & commission, MoM growth
-- -----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW mv_owner_analytics_overview AS
SELECT
    t.id AS tenant_id,
    -- Current Occupancy Metrics
    COALESCE(cg.total_caregivers, 0)::INTEGER AS total_caregivers,
    COALESCE(cg.active_workforce, 0)::INTEGER AS active_workforce_caregivers,
    COALESCE(cg.assigned_caregivers, 0)::INTEGER AS assigned_caregivers,
    COALESCE(cg.available_caregivers, 0)::INTEGER AS available_caregivers,
    COALESCE(cg.on_leave_caregivers, 0)::INTEGER AS on_leave_caregivers,
    COALESCE(cg.inactive_caregivers, 0)::INTEGER AS inactive_caregivers,
    COALESCE(asgn.active_assignments_count, 0)::INTEGER AS active_assignments_count,
    ROUND(
        COALESCE(
            (COALESCE(cg.assigned_caregivers, 0)::NUMERIC * 100.0) /
            NULLIF(COALESCE(cg.total_caregivers, 0), 0),
            0.0
        ),
        2
    )::NUMERIC(5, 2) AS occupancy_rate_pct,

    -- Overall Time to Fill Metrics
    COALESCE(req.total_requests, 0)::INTEGER AS total_requests,
    COALESCE(req.filled_requests, 0)::INTEGER AS filled_requests,
    COALESCE(req.pending_requests, 0)::INTEGER AS pending_requests,
    COALESCE(req.avg_time_to_fill_hours, 0.0)::NUMERIC(10, 2) AS avg_time_to_fill_hours,
    COALESCE(req.avg_time_to_fill_days, 0.0)::NUMERIC(10, 2) AS avg_time_to_fill_days,
    COALESCE(req.fill_rate_pct, 0.0)::NUMERIC(5, 2) AS fill_rate_pct,

    -- Financial Revenue Totals & Current Month
    COALESCE(rev.all_time_gross_revenue, 0)::NUMERIC(12, 2) AS all_time_gross_revenue,
    COALESCE(rev.all_time_commission_revenue, 0)::NUMERIC(12, 2) AS all_time_commission_revenue,
    COALESCE(rev.all_time_net_payout, 0)::NUMERIC(12, 2) AS all_time_net_payout,
    COALESCE(rev.current_month_gross_revenue, 0)::NUMERIC(12, 2) AS current_month_gross_revenue,
    COALESCE(rev.current_month_commission_revenue, 0)::NUMERIC(12, 2) AS current_month_commission_revenue,
    COALESCE(rev.current_month_net_payout, 0)::NUMERIC(12, 2) AS current_month_net_payout,
    COALESCE(rev.previous_month_commission_revenue, 0)::NUMERIC(12, 2) AS previous_month_commission_revenue,
    ROUND(
        COALESCE(
            CASE
                WHEN rev.previous_month_commission_revenue > 0 THEN
                    ((rev.current_month_commission_revenue - rev.previous_month_commission_revenue) * 100.0) /
                    rev.previous_month_commission_revenue
                ELSE 0.0
            END,
            0.0
        ),
        2
    )::NUMERIC(5, 2) AS revenue_growth_mom_pct,

    CURRENT_TIMESTAMP AS refreshed_at
FROM tenants t
LEFT JOIN (
    SELECT
        tenant_id,
        COUNT(*)::INTEGER AS total_caregivers,
        COUNT(*) FILTER (WHERE status != 'inactive')::INTEGER AS active_workforce,
        COUNT(*) FILTER (WHERE status = 'assigned')::INTEGER AS assigned_caregivers,
        COUNT(*) FILTER (WHERE status = 'available')::INTEGER AS available_caregivers,
        COUNT(*) FILTER (WHERE status = 'on_leave')::INTEGER AS on_leave_caregivers,
        COUNT(*) FILTER (WHERE status = 'inactive')::INTEGER AS inactive_caregivers
    FROM caregivers
    GROUP BY tenant_id
) cg ON cg.tenant_id = t.id
LEFT JOIN (
    SELECT
        tenant_id,
        COUNT(*)::INTEGER AS active_assignments_count
    FROM assignments
    WHERE status = 'active'
    GROUP BY tenant_id
) asgn ON asgn.tenant_id = t.id
LEFT JOIN (
    SELECT
        rf.tenant_id,
        COUNT(*)::INTEGER AS total_requests,
        COUNT(*) FILTER (WHERE rf.fulfilled_at IS NOT NULL)::INTEGER AS filled_requests,
        COUNT(*) FILTER (WHERE rf.status = 'pending')::INTEGER AS pending_requests,
        ROUND(
            COALESCE(
                AVG(
                    CASE
                        WHEN rf.fulfilled_at IS NOT NULL AND rf.fulfilled_at >= rf.created_at
                        THEN EXTRACT(EPOCH FROM (rf.fulfilled_at - rf.created_at)) / 3600.0
                        ELSE NULL
                    END
                ),
                0.0
            )::NUMERIC,
            2
        ) AS avg_time_to_fill_hours,
        ROUND(
            COALESCE(
                AVG(
                    CASE
                        WHEN rf.fulfilled_at IS NOT NULL AND rf.fulfilled_at >= rf.created_at
                        THEN EXTRACT(EPOCH FROM (rf.fulfilled_at - rf.created_at)) / 86400.0
                        ELSE NULL
                    END
                ),
                0.0
            )::NUMERIC,
            2
        ) AS avg_time_to_fill_days,
        ROUND(
            COALESCE(
                (COUNT(*) FILTER (WHERE rf.fulfilled_at IS NOT NULL)::NUMERIC * 100.0) /
                NULLIF(COUNT(*), 0),
                0.0
            ),
            2
        ) AS fill_rate_pct
    FROM (
        SELECT
            r.id AS request_id,
            r.tenant_id,
            r.status,
            r.created_at,
            COALESCE(
                MIN(a.created_at),
                CASE WHEN r.status IN ('assigned', 'completed') THEN r.updated_at ELSE NULL END
            ) AS fulfilled_at
        FROM requests r
        LEFT JOIN customers c ON (c.request_id = r.id OR r.customer_id = c.id)
        LEFT JOIN assignments a ON a.customer_id = c.id
        GROUP BY r.id, r.tenant_id, r.created_at, r.status, r.updated_at
    ) rf
    GROUP BY rf.tenant_id
) req ON req.tenant_id = t.id
LEFT JOIN (
    SELECT
        p.tenant_id,
        SUM(p.gross_amount)::NUMERIC(12, 2) AS all_time_gross_revenue,
        SUM(p.commission_amount)::NUMERIC(12, 2) AS all_time_commission_revenue,
        SUM(p.net_payout)::NUMERIC(12, 2) AS all_time_net_payout,
        SUM(p.gross_amount) FILTER (WHERE p.period_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM'))::NUMERIC(12, 2) AS current_month_gross_revenue,
        SUM(p.commission_amount) FILTER (WHERE p.period_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM'))::NUMERIC(12, 2) AS current_month_commission_revenue,
        SUM(p.net_payout) FILTER (WHERE p.period_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM'))::NUMERIC(12, 2) AS current_month_net_payout,
        SUM(p.commission_amount) FILTER (WHERE p.period_month = TO_CHAR(CURRENT_DATE - INTERVAL '1 month', 'YYYY-MM'))::NUMERIC(12, 2) AS previous_month_commission_revenue
    FROM payments p
    GROUP BY p.tenant_id
) rev ON rev.tenant_id = t.id
WITH DATA;

-- Indexes for fast querying and concurrent refresh on mv_owner_analytics_overview
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_owner_analytics_overview_tenant
    ON mv_owner_analytics_overview (tenant_id);


-- -----------------------------------------------------------------------------
-- 3. Stored Function: refresh_owner_analytics_views()
-- Executes concurrent refreshes of both materialized views without locking read traffic.
-- Designed to be called by BullMQ scheduled cron job (Phase 11 point 2).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION refresh_owner_analytics_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_owner_analytics_overview;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_owner_monthly_analytics;
END;
$$ LANGUAGE plpgsql;
