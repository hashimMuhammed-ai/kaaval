'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../../utils/api';

interface OverviewMetrics {
  tenantId: string;
  totalCaregivers: number;
  activeWorkforceCaregivers: number;
  assignedCaregivers: number;
  availableCaregivers: number;
  onLeaveCaregivers: number;
  inactiveCaregivers: number;
  activeAssignmentsCount: number;
  occupancyRatePct: number;
  totalRequests: number;
  filledRequests: number;
  pendingRequests: number;
  avgTimeToFillHours: number;
  avgTimeToFillDays: number;
  fillRatePct: number;
  allTimeGrossRevenue: number;
  allTimeCommissionRevenue: number;
  allTimeNetPayout: number;
  currentMonthGrossRevenue: number;
  currentMonthCommissionRevenue: number;
  currentMonthNetPayout: number;
  previousMonthCommissionRevenue: number;
  revenueGrowthMomPct: number;
  refreshedAt: string;
}

interface MonthlyTrendItem {
  id: string;
  tenantId: string;
  periodMonth: string;
  grossRevenue: number;
  commissionRevenue: number;
  caregiverPayouts: number;
  totalDeductions: number;
  totalDaysWorked: number;
  paymentsCount: number;
  caregiversPaidCount: number;
  totalRequests: number;
  filledRequests: number;
  pendingRequests: number;
  avgTimeToFillHours: number;
  avgTimeToFillDays: number;
  fillRatePct: number;
  totalCaregivers: number;
  activeCaregivers: number;
  activeAssignments: number;
  occupancyRatePct: number;
  refreshedAt: string;
}

export default function OwnerAnalyticsDashboardPage() {
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [trends, setTrends] = useState<MonthlyTrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'6' | '12'>('6');
  const [activeTab, setActiveTab] = useState<'all' | 'revenue' | 'occupancy' | 'fill-time'>('all');
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

  // Fetch metrics on mount and when timeframe changes
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [overviewRes, trendRes] = await Promise.all([
        apiFetch<{ success: boolean; data: OverviewMetrics }>('/analytics/overview'),
        apiFetch<{ success: boolean; data: MonthlyTrendItem[] }>(`/analytics/monthly-trend?limit=${timeframe}`),
      ]);

      if (overviewRes?.data) {
        setOverview(overviewRes.data);
      }
      if (trendRes?.data) {
        setTrends(trendRes.data);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load analytics dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [timeframe]);

  // Handle Refresh Action
  const handleRefresh = async (asyncMode = false) => {
    try {
      setRefreshing(true);
      setNotice(null);

      const res = await apiFetch<{ success: boolean; message: string }>(
        `/analytics/refresh${asyncMode ? '?async=true' : ''}`,
        { method: 'POST' }
      );

      setNotice(res.message || 'Analytics metrics refreshed successfully.');
      await fetchDashboardData();
    } catch (err: any) {
      setError(err?.message || 'Failed to refresh analytics materialized views.');
    } finally {
      setRefreshing(false);
    }
  };

  // Handle Clear Cache Action
  const handleClearCache = async () => {
    try {
      setClearingCache(true);
      setNotice(null);

      const res = await apiFetch<{ success: boolean; message: string }>('/analytics/cache', {
        method: 'POST',
      });

      setNotice(res.message || 'Redis analytics cache cleared.');
      await fetchDashboardData();
    } catch (err: any) {
      setError(err?.message || 'Failed to clear analytics cache.');
    } finally {
      setClearingCache(false);
    }
  };

  // Currency Formatter (INR)
  const formatINR = (val: number | undefined) => {
    if (val === undefined || val === null || isNaN(val)) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Month label formatter ('2026-09' -> 'Sep 26')
  const formatMonthLabel = (m: string) => {
    if (!m) return '';
    const [year, month] = m.split('-');
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  // Max value calculations for SVG chart scaling
  const maxRevenue = useMemo(() => {
    const values = trends.map((t) => Number(t.grossRevenue) || 0);
    const max = Math.max(...values, 50000);
    return Math.ceil(max * 1.15);
  }, [trends]);

  const maxHours = useMemo(() => {
    const values = trends.map((t) => Number(t.avgTimeToFillHours) || 0);
    const max = Math.max(...values, 10);
    return Math.ceil(max * 1.25);
  }, [trends]);

  return (
    <div style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto', color: '#ffffff' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(20, 184, 166, 0.15)',
                color: '#2dd4bf',
                border: '1px solid rgba(20, 184, 166, 0.3)',
              }}
            >
              Phase 11 — Analytics Intelligence
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  boxShadow: '0 0 8px #10b981',
                }}
              />
              Redis Cache Active (300s TTL)
            </span>
          </div>

          <h1
            style={{
              fontSize: '1.875rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '0.35rem',
            }}
          >
            Agency Performance & Owner Analytics
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Operational occupancy rates, time-to-fill speed, and monthly revenue trends backed by PostgreSQL materialized views.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
          {/* Timeframe switcher */}
          <div
            style={{
              display: 'flex',
              backgroundColor: 'rgba(15, 23, 42, 0.8)',
              borderRadius: 'var(--radius-md)',
              padding: '3px',
              border: '1px solid var(--border-card)',
            }}
          >
            <button
              id="timeframe-6m"
              onClick={() => setTimeframe('6')}
              style={{
                padding: '0.4rem 0.75rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: timeframe === '6' ? '#0d9488' : 'transparent',
                color: timeframe === '6' ? '#ffffff' : 'var(--text-secondary)',
                transition: 'all 0.15s ease',
              }}
            >
              6 Months
            </button>
            <button
              id="timeframe-12m"
              onClick={() => setTimeframe('12')}
              style={{
                padding: '0.4rem 0.75rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: timeframe === '12' ? '#0d9488' : 'transparent',
                color: timeframe === '12' ? '#ffffff' : 'var(--text-secondary)',
                transition: 'all 0.15s ease',
              }}
            >
              12 Months
            </button>
          </div>

          {/* Clear Cache Button */}
          <button
            id="btn-clear-cache"
            onClick={handleClearCache}
            disabled={clearingCache}
            title="Clear Redis cache for this agency"
            style={{
              padding: '0.5rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.825rem',
              fontWeight: 600,
              backgroundColor: 'rgba(30, 41, 59, 0.7)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-card)',
              cursor: clearingCache ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              transition: 'all 0.2s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>{clearingCache ? 'Clearing...' : 'Clear Cache'}</span>
          </button>

          {/* Refresh Materialized View Button */}
          <button
            id="btn-refresh-analytics"
            onClick={() => handleRefresh(false)}
            disabled={refreshing}
            style={{
              padding: '0.5rem 1.15rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
              color: '#ffffff',
              border: 'none',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(20, 184, 166, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'transform 0.15s ease',
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              style={{
                transform: refreshing ? 'rotate(360deg)' : 'none',
                transition: refreshing ? 'transform 1s linear infinite' : 'none',
              }}
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 11-.57-8.38l5.67-5.67" />
            </svg>
            <span>{refreshing ? 'Refreshing Views...' : 'Refresh Metrics'}</span>
          </button>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {notice && (
        <div
          style={{
            padding: '0.75rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            color: '#34d399',
            fontSize: '0.875rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>✓ {notice}</span>
          <button
            onClick={() => setNotice(null)}
            style={{ background: 'none', border: 'none', color: '#34d399', cursor: 'pointer', fontSize: '1rem' }}
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '0.75rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#f87171',
            fontSize: '0.875rem',
            marginBottom: '1.5rem',
          }}
        >
          ⚠ {error}
        </div>
      )}

      {/* Top 4 KPI Metrics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        {/* Metric 1: Occupancy Rate */}
        <div
          id="kpi-occupancy-rate"
          style={{
            backgroundColor: 'rgba(19, 26, 43, 0.85)',
            backdropFilter: 'blur(16px)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-card)',
            padding: '1.5rem',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '120px',
              height: '120px',
              background: 'radial-gradient(circle, rgba(20, 184, 166, 0.18) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Workforce Occupancy Rate
            </span>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0.15rem 0.5rem',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(20, 184, 166, 0.2)',
                color: '#2dd4bf',
              }}
            >
              Live Utilization
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '2.25rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
              {overview ? `${overview.occupancyRatePct}%` : '0%'}
            </span>
            <span style={{ fontSize: '0.85rem', color: '#2dd4bf', fontWeight: 600 }}>
              {overview ? `${overview.assignedCaregivers} / ${overview.totalCaregivers}` : '0 / 0'} deployed
            </span>
          </div>

          {/* Visual progress bar */}
          <div
            style={{
              width: '100%',
              height: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '999px',
              overflow: 'hidden',
              marginBottom: '0.85rem',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.min(overview?.occupancyRatePct || 0, 100)}%`,
                background: 'linear-gradient(90deg, #0d9488, #2dd4bf)',
                borderRadius: '999px',
                transition: 'width 0.8s ease',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
            }}
          >
            <span>Available: <b style={{ color: '#ffffff' }}>{overview?.availableCaregivers ?? 0}</b></span>
            <span>On Leave: <b style={{ color: '#ffffff' }}>{overview?.onLeaveCaregivers ?? 0}</b></span>
            <span>Inactive: <b style={{ color: 'var(--text-muted)' }}>{overview?.inactiveCaregivers ?? 0}</b></span>
          </div>
        </div>

        {/* Metric 2: Average Time-to-Fill */}
        <div
          id="kpi-time-to-fill"
          style={{
            backgroundColor: 'rgba(19, 26, 43, 0.85)',
            backdropFilter: 'blur(16px)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-card)',
            padding: '1.5rem',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '120px',
              height: '120px',
              background: 'radial-gradient(circle, rgba(59, 130, 246, 0.18) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Avg Time-to-Fill (TAT)
            </span>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0.15rem 0.5rem',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                color: '#60a5fa',
              }}
            >
              Intake to Assigned
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '2.25rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
              {overview ? `${overview.avgTimeToFillHours}h` : '0h'}
            </span>
            <span style={{ fontSize: '0.85rem', color: '#93c5fd', fontWeight: 600 }}>
              {overview ? `(${overview.avgTimeToFillDays} days)` : ''}
            </span>
          </div>

          {/* Fill rate progress bar */}
          <div
            style={{
              width: '100%',
              height: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '999px',
              overflow: 'hidden',
              marginBottom: '0.85rem',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.min(overview?.fillRatePct || 0, 100)}%`,
                background: 'linear-gradient(90deg, #2563eb, #60a5fa)',
                borderRadius: '999px',
                transition: 'width 0.8s ease',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
            }}
          >
            <span>Filled: <b style={{ color: '#ffffff' }}>{overview?.filledRequests ?? 0}</b></span>
            <span>Pending: <b style={{ color: '#f59e0b' }}>{overview?.pendingRequests ?? 0}</b></span>
            <span>Fill Rate: <b style={{ color: '#60a5fa' }}>{overview?.fillRatePct ?? 0}%</b></span>
          </div>
        </div>

        {/* Metric 3: Current Month Gross Revenue */}
        <div
          id="kpi-gross-revenue"
          style={{
            backgroundColor: 'rgba(19, 26, 43, 0.85)',
            backdropFilter: 'blur(16px)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-card)',
            padding: '1.5rem',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '120px',
              height: '120px',
              background: 'radial-gradient(circle, rgba(16, 185, 129, 0.18) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Current Month Billing
            </span>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0.15rem 0.5rem',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                color: '#34d399',
              }}
            >
              Gross Customer Volume
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '2.25rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
              {formatINR(overview?.currentMonthGrossRevenue)}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.8rem',
              color: '#34d399',
              fontWeight: 600,
              marginBottom: '0.85rem',
            }}
          >
            <span>↑ {overview?.revenueGrowthMomPct ?? 0}%</span>
            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>vs previous month</span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
            }}
          >
            <span>All-Time Gross: <b style={{ color: '#ffffff' }}>{formatINR(overview?.allTimeGrossRevenue)}</b></span>
          </div>
        </div>

        {/* Metric 4: Agency Net Commission */}
        <div
          id="kpi-commission-revenue"
          style={{
            backgroundColor: 'rgba(19, 26, 43, 0.85)',
            backdropFilter: 'blur(16px)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-card)',
            padding: '1.5rem',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '120px',
              height: '120px',
              background: 'radial-gradient(circle, rgba(168, 85, 247, 0.18) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Agency Commission (Net)
            </span>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0.15rem 0.5rem',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(168, 85, 247, 0.2)',
                color: '#c084fc',
              }}
            >
              Agency Take
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '2.25rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
              {formatINR(overview?.currentMonthCommissionRevenue)}
            </span>
          </div>

          <div
            style={{
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              marginBottom: '0.85rem',
            }}
          >
            Caregiver Payout: <b style={{ color: '#ffffff' }}>{formatINR(overview?.currentMonthNetPayout)}</b>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
            }}
          >
            <span>All-Time Commission: <b style={{ color: '#c084fc' }}>{formatINR(overview?.allTimeCommissionRevenue)}</b></span>
          </div>
        </div>
      </div>

      {/* Chart View Switcher Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          borderBottom: '1px solid var(--border-card)',
          paddingBottom: '0.75rem',
          marginBottom: '1.75rem',
        }}
      >
        {[
          { id: 'all', label: 'All Charts' },
          { id: 'revenue', label: 'Revenue Trend' },
          { id: 'occupancy', label: 'Occupancy Trend' },
          { id: 'fill-time', label: 'Time-to-Fill Speed' },
        ].map((tab) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              fontWeight: activeTab === tab.id ? 700 : 500,
              backgroundColor: activeTab === tab.id ? 'rgba(20, 184, 166, 0.18)' : 'transparent',
              color: activeTab === tab.id ? '#2dd4bf' : 'var(--text-secondary)',
              border: activeTab === tab.id ? '1px solid rgba(20, 184, 166, 0.35)' : '1px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* CHARTS CONTAINER */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '2.5rem' }}>
        {/* CHART 1: REVENUE TREND */}
        {(activeTab === 'all' || activeTab === 'revenue') && (
          <div
            id="chart-revenue-trend"
            style={{
              backgroundColor: 'rgba(19, 26, 43, 0.85)',
              backdropFilter: 'blur(16px)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-card)',
              padding: '1.75rem',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: '#ffffff' }}>
                  Monthly Revenue Trend (Customer Billing vs Agency Commission)
                </h2>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Gross volume charged to clients alongside net agency commission split.
                </p>
              </div>

              {/* Chart Legend */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.8rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#2dd4bf' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#14b8a6' }} />
                  Gross Billing
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#a855f7' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#a855f7' }} />
                  Agency Commission
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#475569' }} />
                  Caregiver Payout
                </span>
              </div>
            </div>

            {/* SVG Multi-Series Bar Chart */}
            <div style={{ position: 'relative', width: '100%', height: '280px' }}>
              {trends.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                  No revenue history available for this timeframe.
                </div>
              ) : (
                <svg
                  viewBox={`0 0 ${trends.length * 120} 240`}
                  style={{ width: '100%', height: '100%', overflow: 'visible' }}
                >
                  <defs>
                    <linearGradient id="grossBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2dd4bf" />
                      <stop offset="100%" stopColor="#0f766e" />
                    </linearGradient>
                    <linearGradient id="commBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#c084fc" />
                      <stop offset="100%" stopColor="#7e22ce" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal gridlines */}
                  {[0.25, 0.5, 0.75, 1].map((pct) => (
                    <line
                      key={pct}
                      x1="0"
                      y1={200 - pct * 180}
                      x2={trends.length * 120}
                      y2={200 - pct * 180}
                      stroke="rgba(255, 255, 255, 0.06)"
                      strokeDasharray="4 4"
                    />
                  ))}

                  {/* Bars per month */}
                  {trends.map((t, idx) => {
                    const x = idx * 120 + 20;
                    const grossHeight = Math.min((t.grossRevenue / maxRevenue) * 180, 180);
                    const commHeight = Math.min((t.commissionRevenue / maxRevenue) * 180, 180);
                    const payoutHeight = Math.min((t.caregiverPayouts / maxRevenue) * 180, 180);

                    const isHovered = hoveredMonth === t.periodMonth;

                    return (
                      <g
                        key={t.periodMonth}
                        onMouseEnter={() => setHoveredMonth(t.periodMonth)}
                        onMouseLeave={() => setHoveredMonth(null)}
                        style={{ cursor: 'pointer' }}
                      >
                        {/* Background highlight on hover */}
                        {isHovered && (
                          <rect
                            x={x - 10}
                            y="10"
                            width="90"
                            height="195"
                            fill="rgba(255, 255, 255, 0.04)"
                            rx="8"
                          />
                        )}

                        {/* Gross Billing Bar */}
                        <rect
                          x={x}
                          y={200 - grossHeight}
                          width="20"
                          height={grossHeight}
                          fill="url(#grossBarGrad)"
                          rx="4"
                          style={{ transition: 'all 0.3s ease' }}
                        />

                        {/* Agency Commission Bar */}
                        <rect
                          x={x + 24}
                          y={200 - commHeight}
                          width="20"
                          height={commHeight}
                          fill="url(#commBarGrad)"
                          rx="4"
                          style={{ transition: 'all 0.3s ease' }}
                        />

                        {/* Caregiver Payout Bar */}
                        <rect
                          x={x + 48}
                          y={200 - payoutHeight}
                          width="20"
                          height={payoutHeight}
                          fill="#475569"
                          rx="4"
                          style={{ transition: 'all 0.3s ease' }}
                        />

                        {/* X-axis Month Label */}
                        <text
                          x={x + 34}
                          y="225"
                          textAnchor="middle"
                          fill={isHovered ? '#ffffff' : 'var(--text-secondary)'}
                          fontSize="11"
                          fontWeight={isHovered ? '700' : '500'}
                        >
                          {formatMonthLabel(t.periodMonth)}
                        </text>

                        {/* Hover Tooltip Value */}
                        {isHovered && (
                          <g>
                            <rect
                              x={x - 30}
                              y={Math.max(200 - grossHeight - 50, 0)}
                              width="130"
                              height="44"
                              rx="6"
                              fill="#0b1120"
                              stroke="rgba(45, 212, 191, 0.4)"
                            />
                            <text
                              x={x + 35}
                              y={Math.max(200 - grossHeight - 32, 18)}
                              textAnchor="middle"
                              fill="#2dd4bf"
                              fontSize="11"
                              fontWeight="700"
                            >
                              Gross: {formatINR(t.grossRevenue)}
                            </text>
                            <text
                              x={x + 35}
                              y={Math.max(200 - grossHeight - 16, 34)}
                              textAnchor="middle"
                              fill="#c084fc"
                              fontSize="10"
                              fontWeight="600"
                            >
                              Take: {formatINR(t.commissionRevenue)}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
          </div>
        )}

        {/* CHART 2: WORKFORCE OCCUPANCY TREND */}
        {(activeTab === 'all' || activeTab === 'occupancy') && (
          <div
            id="chart-occupancy-trend"
            style={{
              backgroundColor: 'rgba(19, 26, 43, 0.85)',
              backdropFilter: 'blur(16px)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-card)',
              padding: '1.75rem',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: '#ffffff' }}>
                  Caregiver Occupancy & Utilization Trend
                </h2>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Proportion of active, working caregivers deployed on assignments per month.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#38bdf8' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#0284c7' }} />
                  Occupancy %
                </span>
                <span style={{ color: 'var(--text-muted)' }}>Target: 75% +</span>
              </div>
            </div>

            {/* SVG Line / Area Chart for Occupancy */}
            <div style={{ position: 'relative', width: '100%', height: '240px' }}>
              {trends.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                  No occupancy trend records available.
                </div>
              ) : (
                <svg
                  viewBox={`0 0 ${trends.length * 120} 200`}
                  style={{ width: '100%', height: '100%', overflow: 'visible' }}
                >
                  <defs>
                    <linearGradient id="occupancyAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(56, 189, 248, 0.35)" />
                      <stop offset="100%" stopColor="rgba(56, 189, 248, 0.0)" />
                    </linearGradient>
                  </defs>

                  {/* Benchmark 75% target line */}
                  <line
                    x1="0"
                    y1={170 - 0.75 * 140}
                    x2={trends.length * 120}
                    y2={170 - 0.75 * 140}
                    stroke="rgba(20, 184, 166, 0.4)"
                    strokeDasharray="6 4"
                  />
                  <text
                    x={trends.length * 120 - 60}
                    y={165 - 0.75 * 140}
                    fill="#2dd4bf"
                    fontSize="9"
                    fontWeight="700"
                  >
                    75% Target
                  </text>

                  {/* Filled Area */}
                  {trends.length > 1 && (
                    <polygon
                      points={`
                        ${20 + 0 * 120},${170 - ((trends[0]?.occupancyRatePct || 0) / 100) * 140}
                        ${trends
                          .map((t, i) => `${20 + i * 120},${170 - ((t.occupancyRatePct || 0) / 100) * 140}`)
                          .join(' ')}
                        ${20 + (trends.length - 1) * 120},170
                        ${20},170
                      `}
                      fill="url(#occupancyAreaGrad)"
                    />
                  )}

                  {/* Polyline Path */}
                  <polyline
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={trends
                      .map((t, i) => `${20 + i * 120},${170 - ((t.occupancyRatePct || 0) / 100) * 140}`)
                      .join(' ')}
                  />

                  {/* Data Points */}
                  {trends.map((t, i) => {
                    const cx = 20 + i * 120;
                    const cy = 170 - ((t.occupancyRatePct || 0) / 100) * 140;
                    const isHovered = hoveredMonth === t.periodMonth;

                    return (
                      <g key={t.periodMonth} onMouseEnter={() => setHoveredMonth(t.periodMonth)} onMouseLeave={() => setHoveredMonth(null)}>
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isHovered ? 7 : 5}
                          fill="#0284c7"
                          stroke="#ffffff"
                          strokeWidth="2.5"
                          style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
                        />
                        <text
                          x={cx}
                          y={cy - 12}
                          textAnchor="middle"
                          fill="#38bdf8"
                          fontSize="11"
                          fontWeight="700"
                        >
                          {t.occupancyRatePct}%
                        </text>
                        <text
                          x={cx}
                          y="190"
                          textAnchor="middle"
                          fill={isHovered ? '#ffffff' : 'var(--text-secondary)'}
                          fontSize="10"
                        >
                          {formatMonthLabel(t.periodMonth)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
          </div>
        )}

        {/* CHART 3: TIME-TO-FILL SPEED */}
        {(activeTab === 'all' || activeTab === 'fill-time') && (
          <div
            id="chart-time-to-fill-trend"
            style={{
              backgroundColor: 'rgba(19, 26, 43, 0.85)',
              backdropFilter: 'blur(16px)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-card)',
              padding: '1.75rem',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: '#ffffff' }}>
                  Average Time-to-Fill (TAT) & Fulfillment Pipeline
                </h2>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Turnaround hours from customer intake to confirmed caregiver placement.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fbbf24' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                  Avg TAT (Hours)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#34d399' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#10b981' }} />
                  Filled Leads
                </span>
              </div>
            </div>

            {/* SVG Time-to-Fill Visual */}
            <div style={{ position: 'relative', width: '100%', height: '240px' }}>
              {trends.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                  No time-to-fill trend records available.
                </div>
              ) : (
                <svg
                  viewBox={`0 0 ${trends.length * 120} 200`}
                  style={{ width: '100%', height: '100%', overflow: 'visible' }}
                >
                  {/* Bars for leads filled */}
                  {trends.map((t, idx) => {
                    const x = idx * 120 + 35;
                    const barHeight = Math.min((t.filledRequests / 50) * 120, 120);
                    const tatY = 160 - Math.min((t.avgTimeToFillHours / maxHours) * 140, 140);
                    const isHovered = hoveredMonth === t.periodMonth;

                    return (
                      <g key={t.periodMonth} onMouseEnter={() => setHoveredMonth(t.periodMonth)} onMouseLeave={() => setHoveredMonth(null)}>
                        {/* Filled leads bar */}
                        <rect
                          x={x}
                          y={160 - barHeight}
                          width="30"
                          height={barHeight}
                          fill="rgba(16, 185, 129, 0.4)"
                          stroke="#10b981"
                          strokeWidth="1.5"
                          rx="4"
                        />
                        <text
                          x={x + 15}
                          y={155 - barHeight}
                          textAnchor="middle"
                          fill="#34d399"
                          fontSize="9"
                          fontWeight="600"
                        >
                          {t.filledRequests}
                        </text>

                        {/* Month label */}
                        <text
                          x={x + 15}
                          y="185"
                          textAnchor="middle"
                          fill={isHovered ? '#ffffff' : 'var(--text-secondary)'}
                          fontSize="10"
                        >
                          {formatMonthLabel(t.periodMonth)}
                        </text>

                        {/* TAT Hour Marker */}
                        <circle
                          cx={x + 15}
                          cy={tatY}
                          r="5"
                          fill="#f59e0b"
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                        <text
                          x={x + 15}
                          y={tatY - 8}
                          textAnchor="middle"
                          fill="#fbbf24"
                          fontSize="10"
                          fontWeight="700"
                        >
                          {t.avgTimeToFillHours}h
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MONTHLY LEDGER BREAKDOWN TABLE */}
      <div
        style={{
          backgroundColor: 'rgba(19, 26, 43, 0.85)',
          backdropFilter: 'blur(16px)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-card)',
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
        }}
      >
        <div
          style={{
            padding: '1.25rem 1.75rem',
            borderBottom: '1px solid var(--border-card)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
              Historical Performance Ledger
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
              Tabulated financial, operational, and fulfillment records per billing cycle.
            </p>
          </div>
          <Link
            href="/dashboard/salary-reports"
            style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#2dd4bf',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <span>View Salary & Payments →</span>
          </Link>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', borderBottom: '1px solid var(--border-card)' }}>
                <th style={{ padding: '0.85rem 1.25rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Month</th>
                <th style={{ padding: '0.85rem 1.25rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Gross Billing</th>
                <th style={{ padding: '0.85rem 1.25rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Agency Commission</th>
                <th style={{ padding: '0.85rem 1.25rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Caregiver Payout</th>
                <th style={{ padding: '0.85rem 1.25rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Days Worked</th>
                <th style={{ padding: '0.85rem 1.25rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Occupancy</th>
                <th style={{ padding: '0.85rem 1.25rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Avg TAT</th>
                <th style={{ padding: '0.85rem 1.25rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Fill Rate</th>
              </tr>
            </thead>
            <tbody>
              {trends.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No historical data available.
                  </td>
                </tr>
              ) : (
                trends.map((t) => (
                  <tr
                    key={t.periodMonth}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      transition: 'background-color 0.15s',
                    }}
                  >
                    <td style={{ padding: '0.85rem 1.25rem', fontWeight: 700, color: '#ffffff' }}>
                      {formatMonthLabel(t.periodMonth)}
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                        ({t.periodMonth})
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', color: '#2dd4bf', fontWeight: 600 }}>
                      {formatINR(t.grossRevenue)}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', color: '#c084fc', fontWeight: 700 }}>
                      {formatINR(t.commissionRevenue)}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', color: '#cbd5e1' }}>
                      {formatINR(t.caregiverPayouts)}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', color: 'var(--text-secondary)' }}>
                      {t.totalDaysWorked} days
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor:
                            t.occupancyRatePct >= 75 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          color: t.occupancyRatePct >= 75 ? '#34d399' : '#fbbf24',
                        }}
                      >
                        {t.occupancyRatePct}%
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', color: '#fbbf24', fontWeight: 600 }}>
                      {t.avgTimeToFillHours}h
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', color: '#60a5fa', fontWeight: 600 }}>
                      {t.fillRatePct}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
