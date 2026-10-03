'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../../utils/api';

export interface PaymentRecord {
  id: string;
  tenantId?: string;
  caregiverId: string;
  periodMonth: string;
  totalDaysWorked: number;
  grossAmount: number;
  commissionPercentage: number;
  commissionAmount: number;
  deductions: number;
  netPayout: number;
  status: 'pending' | 'approved' | 'paid' | string;
  paidAt?: string | null;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  notes?: string | null;
  createdAt?: string;
  caregiver?: {
    id: string;
    fullName: string;
    dailyRate?: number;
    commissionPercentage?: number;
  };
}

export interface ShiftBreakdownItem {
  date: string;
  status: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  dayFactor: number;
  dailyRate: number;
  earnedGross: number;
  customerName?: string;
  assignmentId?: string;
}

export interface CaregiverMonthlyBreakdown {
  caregiverId: string;
  caregiverName: string;
  month: string;
  dailyRate: number;
  commissionPercentage: number;
  totalDaysWorked: number;
  grossAmount: number;
  commissionAmount: number;
  deductions: number;
  netPayout: number;
  shifts: ShiftBreakdownItem[];
}

export default function CaregiverSalaryPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [selectedStatement, setSelectedStatement] = useState<PaymentRecord | null>(null);
  const [shiftBreakdown, setShiftBreakdown] = useState<CaregiverMonthlyBreakdown | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState<boolean>(false);
  const [breakdownError, setBreakdownError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Load caregiver profile for daily rate & baseline data
        try {
          const profRes = await apiFetch<any>('/caregivers/me');
          if (profRes) {
            setProfile(profRes.data || profRes);
          }
        } catch {
          // Fallback if profile fails
        }

        // Load salary statements
        const res = await apiFetch<any>('/payments?limit=50');
        if (res?.data) {
          const list = Array.isArray(res.data) ? res.data : [];
          setPayments(list);
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filtered payments list
  const filteredPayments = useMemo(() => {
    if (monthFilter === 'all') return payments;
    return payments.filter((p) => p.periodMonth === monthFilter);
  }, [payments, monthFilter]);

  // Aggregate Lifetime Totals
  const aggregateMetrics = useMemo(() => {
    return payments.reduce(
      (acc, p) => {
        acc.totalEarned += Number(p.netPayout || 0);
        acc.totalGross += Number(p.grossAmount || 0);
        acc.totalDays += Number(p.totalDaysWorked || 0);
        if (p.status === 'paid') {
          acc.totalDisbursed += Number(p.netPayout || 0);
        } else {
          acc.pendingDisbursal += Number(p.netPayout || 0);
        }
        return acc;
      },
      { totalEarned: 0, totalGross: 0, totalDays: 0, totalDisbursed: 0, pendingDisbursal: 0 }
    );
  }, [payments]);

  // Fetch shift-by-shift breakdown when user opens a statement
  const handleOpenBreakdown = async (payment: PaymentRecord) => {
    setSelectedStatement(payment);
    setBreakdownLoading(true);
    setBreakdownError(null);
    setShiftBreakdown(null);

    try {
      const caregiverId = payment.caregiverId || profile?.id || 'me';
      const res = await apiFetch<any>(`/payments/breakdown/${caregiverId}?month=${payment.periodMonth}`);
      if (res?.data) {
        setShiftBreakdown(res.data);
      } else if (res?.shifts) {
        setShiftBreakdown(res);
      } else {
        // Build synthesized shifts fallback if breakdown endpoint returns empty
        setShiftBreakdown({
          caregiverId: payment.caregiverId,
          caregiverName: profile?.fullName || 'Caregiver',
          month: payment.periodMonth,
          dailyRate: payment.caregiver?.dailyRate || profile?.dailyRate || 1000,
          commissionPercentage: payment.commissionPercentage ?? 15,
          totalDaysWorked: payment.totalDaysWorked,
          grossAmount: payment.grossAmount,
          commissionAmount: payment.commissionAmount,
          deductions: payment.deductions,
          netPayout: payment.netPayout,
          shifts: [],
        });
      }
    } catch {
      setBreakdownError('Unable to load itemized shift logs. Verified attendance was used for statement calculation.');
    } finally {
      setBreakdownLoading(false);
    }
  };

  const handleCloseBreakdown = () => {
    setSelectedStatement(null);
    setShiftBreakdown(null);
    setBreakdownError(null);
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'paid') {
      return {
        text: 'PAID',
        bg: '#f0fdf4',
        border: '#bbf7d0',
        color: '#15803D',
        icon: '✓',
      };
    }
    if (s === 'approved') {
      return {
        text: 'APPROVED',
        bg: '#eff6ff',
        border: '#bfdbfe',
        color: '#2563EB',
        icon: '⏳',
      };
    }
    return {
      text: 'PENDING',
      bg: '#fffbeb',
      border: '#fde68a',
      color: '#D97706',
      icon: '🕒',
    };
  };

  const formatMonthTitle = (monthStr: string) => {
    if (!monthStr || !monthStr.includes('-')) return `Period ${monthStr}`;
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '2rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.3rem' }}>💰</span>
            <h1
              id="salary-page-title"
              style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em' }}
            >
              Salary & Payouts
            </h1>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
            Read-only earnings statements computed from your verified attendance records.
          </p>
        </div>

        <Link
          href="/portal"
          id="back-to-home-link"
          style={{
            fontSize: '0.78rem',
            color: 'var(--primary-400)',
            textDecoration: 'none',
            padding: '0.4rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(20, 184, 166, 0.1)',
            border: '1px solid rgba(20, 184, 166, 0.25)',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          &larr; Home
        </Link>
      </div>

      {/* Contract & Daily Rate Configuration Pill */}
      <section
        id="caregiver-rate-banner"
        className="glass-panel"
        style={{
          padding: '0.85rem 1rem',
          background: 'linear-gradient(135deg, #ffffff, #f0fdfa)',
          border: '1px solid #ccfbf1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#f0fdfa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              color: '#0F766E',
            }}
          >
            📋
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#475569', textTransform: 'uppercase' }}>
              Configured Rate
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#172033' }}>
              ₹{profile?.dailyRate || 1000} <span style={{ fontSize: '0.75rem', color: '#475569' }}>/ standard day</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#475569', textTransform: 'uppercase' }}>
              Agency Split
            </div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#475569' }}>
              {profile?.commissionPercentage ?? 15}% commission
            </div>
          </div>
          <div
            style={{
              padding: '0.25rem 0.5rem',
              backgroundColor: '#f0fdf4',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.72rem',
              color: '#15803D',
              fontWeight: 700,
            }}
          >
            Active
          </div>
        </div>
      </section>

      {/* Aggregate Earnings Summary Card */}
      <section
        id="salary-summary-kpis"
        className="glass-panel"
        style={{
          padding: '1.25rem',
          background: 'linear-gradient(135deg, #ffffff, #f0fdfa)',
          border: '1px solid #ccfbf1',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Net Take-Home
            </div>
            <div
              id="total-net-earnings-amount"
              style={{
                fontSize: '1.85rem',
                fontWeight: 800,
                color: '#15803D',
                lineHeight: 1.15,
                marginTop: '0.2rem',
              }}
            >
              ₹{aggregateMetrics.totalEarned.toLocaleString('en-IN')}
            </div>
          </div>

          <div
            style={{
              padding: '0.35rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: '#F8FAFC',
              fontSize: '0.72rem',
              color: '#475569',
              border: '1px solid #e2e8f0',
            }}
          >
            {payments.length} Statement{payments.length === 1 ? '' : 's'}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.5rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid #e2e8f0',
          }}
        >
          <div>
            <div style={{ fontSize: '0.7rem', color: '#475569' }}>Days Worked</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#172033', marginTop: '0.1rem' }}>
              {aggregateMetrics.totalDays} days
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.7rem', color: '#475569' }}>Disbursed</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#15803D', marginTop: '0.1rem' }}>
              ₹{aggregateMetrics.totalDisbursed.toLocaleString('en-IN')}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.7rem', color: '#475569' }}>Pending Payout</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: aggregateMetrics.pendingDisbursal > 0 ? '#D97706' : '#475569', marginTop: '0.1rem' }}>
              ₹{aggregateMetrics.pendingDisbursal.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </section>

      {/* Month Filter Selector (if multiple months exist) */}
      {payments.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          <button
            type="button"
            onClick={() => setMonthFilter('all')}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              border: monthFilter === 'all' ? '1px solid #2563EB' : '1px solid #e2e8f0',
              backgroundColor: monthFilter === 'all' ? '#eff6ff' : '#F8FAFC',
              color: monthFilter === 'all' ? '#2563EB' : '#475569',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            All Cycles
          </button>
          {Array.from(new Set(payments.map((p) => p.periodMonth))).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMonthFilter(m)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                border: monthFilter === m ? '1px solid #2563EB' : '1px solid #e2e8f0',
                backgroundColor: monthFilter === m ? '#eff6ff' : '#F8FAFC',
                color: monthFilter === m ? '#2563EB' : '#475569',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      {/* Statements List Section */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#172033', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Monthly Statements ({filteredPayments.length})
        </h2>

        {loading ? (
          <div
            id="salary-loading-state"
            className="glass-panel"
            style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⌛</div>
            <div style={{ fontSize: '0.85rem' }}>Loading verified earnings records...</div>
          </div>
        ) : filteredPayments.length > 0 ? (
          <div id="salary-statements-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {filteredPayments.map((p) => {
              const badge = getStatusBadge(p.status);
              return (
                <div
                  key={p.id}
                  id={`statement-card-${p.id}`}
                  className="glass-panel"
                  style={{
                    padding: '1.15rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                    border: '1px solid #e2e8f0',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Header: Period & Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      {/* Preserving text for backwards compatibility: 'Period 2026-09' */}
                      <span
                        style={{
                          fontSize: '0.95rem',
                          fontWeight: 700,
                          color: '#172033',
                          display: 'block',
                        }}
                      >
                        Period {p.periodMonth}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#475569' }}>
                        {formatMonthTitle(p.periodMonth)}
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textTransform: 'lowercase',
                        color: badge.color,
                        backgroundColor: badge.bg,
                        border: `1px solid ${badge.border}`,
                        padding: '0.2rem 0.6rem',
                        borderRadius: 'var(--radius-full)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      <span>{badge.icon}</span>
                      {/* Preserving exact lowercase matching for tests: 'approved', 'paid', etc. */}
                      <span>{p.status}</span>
                    </div>
                  </div>

                  {/* Calculations Line: Days Worked, Gross, Net */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.75rem',
                      backgroundColor: '#F8FAFC',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#475569' }}>
                        Days Worked: {p.totalDaysWorked}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.2rem' }}>
                        Gross: ₹{Number(p.grossAmount || 0).toLocaleString('en-IN')}
                      </div>
                      {p.commissionAmount > 0 && (
                        <div style={{ fontSize: '0.72rem', color: '#DC2626' }}>
                          Agency Split: -₹{Number(p.commissionAmount).toLocaleString('en-IN')}
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.72rem', color: '#475569' }}>
                        Net Take-Home
                      </div>
                      <div
                        style={{
                          fontSize: '1.25rem',
                          fontWeight: 800,
                          color: '#15803D',
                          marginTop: '0.1rem',
                        }}
                      >
                        ₹{Number(p.netPayout || 0).toLocaleString('en-IN')}
                      </div>
                      {Number(p.deductions || 0) > 0 && (
                        <div style={{ fontSize: '0.7rem', color: '#D97706' }}>
                          Deductions: -₹{Number(p.deductions).toLocaleString('en-IN')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment Details (if paid) */}
                  {p.status === 'paid' && (
                    <div
                      style={{
                        fontSize: '0.72rem',
                        color: '#475569',
                        backgroundColor: '#f0fdf4',
                        padding: '0.4rem 0.6rem',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>Method: {p.paymentMethod || 'Bank Transfer'}</span>
                      {p.paymentReference && <span>Ref: {p.paymentReference}</span>}
                    </div>
                  )}

                  {/* Shift Breakdown Button */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.25rem' }}>
                    <button
                      type="button"
                      id={`view-shifts-btn-${p.id}`}
                      onClick={() => handleOpenBreakdown(p)}
                      style={{
                        backgroundColor: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        color: '#2563EB',
                        padding: '0.45rem 0.9rem',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <span>🔍</span>
                      <span>View Shift Breakdown</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            id="salary-empty-state"
            className="glass-panel"
            style={{
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              color: '#475569',
              border: '1px dashed #cbd5e1',
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💰</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#172033', marginBottom: '0.35rem' }}>
              No Disbursals in Current Cycle
            </div>
            <p style={{ fontSize: '0.8rem', lineHeight: 1.5, margin: '0 auto', maxWidth: '320px', color: '#475569' }}>
              Monthly statements are generated at month-end based on verified attendance punches. Check in daily to track your shifts!
            </p>
            <div style={{ marginTop: '1.25rem' }}>
              <Link
                href="/portal/attendance"
                style={{
                  display: 'inline-block',
                  backgroundColor: '#2563EB',
                  color: '#ffffff',
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                Go to Shift Punch &rarr;
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Discrepancy & Support Guidance */}
      <section
        id="salary-help-card"
        className="glass-panel"
        style={{
          padding: '1rem',
          backgroundColor: '#F8FAFC',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1rem' }}>ℹ️</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#172033' }}>
            Questions About Your Payout?
          </span>
        </div>
        <p style={{ fontSize: '0.75rem', color: '#475569', lineHeight: 1.4, margin: 0 }}>
          Salary calculations are derived from your daily check-in and check-out logs. If any shift is missing or requires manual time adjustment, please reach out to agency office coordinators.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
          <a
            id="contact-office-btn"
            href="https://wa.me/?text=Hello%20Agency,%20I%20have%20a%20query%20regarding%20my%20attendance%20and%20salary%20statement"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#f0fdfa',
              border: '1px solid #ccfbf1',
              color: '#0F766E',
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.75rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <span>💬</span>
            <span>WhatsApp Coordinator</span>
          </a>
        </div>
      </section>

      {/* Itemized Shift Breakdown Modal / Drawer */}
      {selectedStatement && (
        <div
          id="shifts-breakdown-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="breakdown-modal-title"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              backgroundColor: '#ffffff',
              borderTopLeftRadius: '20px',
              borderTopRightRadius: '20px',
              border: '1px solid #e2e8f0',
              borderBottom: 'none',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.25rem',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '0.72rem', color: '#475569', textTransform: 'uppercase', fontWeight: 600 }}>
                  Itemized Shifts
                </div>
                <h3
                  id="breakdown-modal-title"
                  style={{ fontSize: '1.1rem', fontWeight: 800, color: '#172033', marginTop: '0.1rem' }}
                >
                  {formatMonthTitle(selectedStatement.periodMonth)}
                </h3>
              </div>

              <button
                type="button"
                id="close-breakdown-modal-btn"
                onClick={handleCloseBreakdown}
                aria-label="Close shift breakdown"
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #e2e8f0',
                  color: '#475569',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body / Scrollable Shifts */}
            <div style={{ padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Formula Card */}
              <div
                style={{
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #dbeafe',
                  fontSize: '0.75rem',
                  lineHeight: 1.4,
                  color: '#172033',
                }}
              >
                <div style={{ fontWeight: 700, color: '#2563EB', marginBottom: '0.2rem' }}>
                  Attendance Calculation Formula:
                </div>
                <div>
                  • Full Day (Present) = 1.0 day &bull; Half Day = 0.5 day
                </div>
                <div>
                  • Gross Earnings = Days Worked &times; Daily Rate (₹{selectedStatement.caregiver?.dailyRate || profile?.dailyRate || 1000})
                </div>
                <div>
                  • Take-Home Net = Gross &minus; Agency Split ({selectedStatement.commissionPercentage ?? 15}%) &minus; Deductions
                </div>
              </div>

              {breakdownLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#475569' }}>
                  Loading shift attendance logs...
                </div>
              ) : breakdownError ? (
                <div style={{ padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#DC2626', borderRadius: 'var(--radius-md)', fontSize: '0.78rem' }}>
                  {breakdownError}
                </div>
              ) : shiftBreakdown && shiftBreakdown.shifts && shiftBreakdown.shifts.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Recorded Shifts ({shiftBreakdown.shifts.length})
                  </div>
                  {shiftBreakdown.shifts.map((shift, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#172033' }}>
                          {shift.date}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#475569' }}>
                          {shift.customerName ? `Patient: ${shift.customerName}` : 'Home Care Assignment'}
                        </div>
                        {shift.checkInTime && (
                          <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: '0.15rem' }}>
                            In: {new Date(shift.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            {shift.checkOutTime && ` • Out: ${new Date(shift.checkOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
                          </div>
                        )}
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: shift.dayFactor === 1.0 ? '#15803D' : '#D97706',
                            textTransform: 'uppercase',
                          }}
                        >
                          {shift.status} ({shift.dayFactor}d)
                        </div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#172033', marginTop: '0.1rem' }}>
                          +₹{Number(shift.earnedGross || 0).toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: '#475569', fontSize: '0.8rem' }}>
                  No itemized daily punches found for this period. Total days recorded: {selectedStatement.totalDaysWorked}.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '1rem 1.25rem',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#F8FAFC',
              }}
            >
              <div>
                <span style={{ fontSize: '0.7rem', color: '#475569' }}>Statement Total:</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#15803D', marginLeft: '0.5rem' }}>
                  ₹{Number(selectedStatement.netPayout || 0).toLocaleString('en-IN')}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCloseBreakdown}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#172033',
                  border: '1px solid #e2e8f0',
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
