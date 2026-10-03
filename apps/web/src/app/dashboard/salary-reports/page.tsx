'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../../utils/api';

interface PaymentStatement {
  id: string;
  tenantId: string;
  caregiverId: string;
  periodMonth: string;
  daysPresent: number;
  daysHalfDay: number;
  daysAbsent: number;
  daysOnLeave: number;
  totalDaysWorked: number;
  dailyRate: number;
  grossAmount: number;
  commissionPercentage: number;
  commissionAmount: number;
  deductions: number;
  netPayout: number;
  status: 'draft' | 'approved' | 'paid';
  paymentDate?: string | null;
  paymentMethod?: string | null;
  transactionReference?: string | null;
  notes?: string | null;
  computedAt: string;
  caregiver?: {
    id: string;
    fullName: string;
    phone: string;
    district?: string;
    city?: string;
  };
  approvedByUser?: {
    id: string;
    name: string;
  };
}

interface ShiftItem {
  date: string;
  status: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  dayFactor: number;
  dailyRate: number;
  earnedGross: number;
  customerName?: string;
  assignmentId: string;
}

interface ShiftBreakdownData {
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
  shifts: ShiftItem[];
}

const STATUS_THEME: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  draft: {
    label: 'Draft Computation',
    color: '#fbbf24',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.35)',
    dot: '#f59e0b',
  },
  approved: {
    label: 'Approved for Payout',
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.12)',
    border: 'rgba(56, 189, 248, 0.35)',
    dot: '#38bdf8',
  },
  paid: {
    label: 'Paid & Disbursed',
    color: '#34d399',
    bg: 'rgba(16, 185, 129, 0.15)',
    border: 'rgba(16, 185, 129, 0.35)',
    dot: '#10b981',
  },
};

export default function SalaryReportsPage() {
  const currentMonthStr = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [payments, setPayments] = useState<PaymentStatement[]>([]);
  const [stats, setStats] = useState({
    totalCaregivers: 0,
    totalDaysWorked: 0,
    totalGross: 0,
    totalCommission: 0,
    totalNetPayout: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Breakdown modal state
  const [activeBreakdownCaregiver, setActiveBreakdownCaregiver] = useState<{ id: string; name: string } | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [breakdownData, setBreakdownData] = useState<ShiftBreakdownData | null>(null);

  // Quick Action Modal (Approval / Mark Paid)
  const [actionPayment, setActionPayment] = useState<PaymentStatement | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'pay' | 'deduction' | null>(null);
  const [actionDeduction, setActionDeduction] = useState<number>(0);
  const [actionTxRef, setActionTxRef] = useState<string>('');
  const [actionNotes, setActionNotes] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Show Toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch Payments for selected month & status
  const fetchPayments = async () => {
    setLoading(true);
    try {
      let endpoint = `/payments?month=${selectedMonth}&limit=100`;
      if (statusFilter !== 'all') {
        endpoint += `&status=${statusFilter}`;
      }
      const res = await apiFetch(endpoint);
      if (res && res.data) {
        setPayments(res.data);
        if (res.meta && res.meta.stats) {
          setStats(res.meta.stats);
        }
      }
    } catch (err: any) {
      console.error('Failed to load salary statements:', err);
      showToast(err.message || 'Error fetching monthly payment records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [selectedMonth, statusFilter]);

  // Recalculate monthly payroll
  const handleRecalculate = async () => {
    setIsCalculating(true);
    try {
      const res = await apiFetch('/payments/calculate', {
        method: 'POST',
        body: JSON.stringify({ month: selectedMonth }),
      });
      showToast(res.message || `Recalculated salary statements for ${selectedMonth}`);
      await fetchPayments();
    } catch (err: any) {
      console.error('Recalculate error:', err);
      showToast(err.message || 'Failed to recalculate salary statements');
    } finally {
      setIsCalculating(false);
    }
  };

  // Export CSV Report
  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      let url = `/api/payments/export?month=${selectedMonth}&format=csv`;
      if (statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }

      const res = await fetch(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error(`Export failed with HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `salary-report-${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      showToast(`Exported monthly salary report for ${selectedMonth} (CSV)`);
    } catch (err: any) {
      console.error('Export CSV error:', err);
      // Fallback: Generate client-side CSV from current payments
      generateClientCsv();
    } finally {
      setIsExporting(false);
    }
  };

  // Client-side fallback CSV generator if direct file streaming is blocked
  const generateClientCsv = () => {
    try {
      const headers = [
        'Caregiver ID',
        'Caregiver Name',
        'Phone',
        'District',
        'Period Month',
        'Daily Rate (INR)',
        'Present Days',
        'Half Days',
        'Absent Days',
        'Total Days Worked',
        'Gross Amount (INR)',
        'Commission %',
        'Agency Commission (INR)',
        'Deductions (INR)',
        'Net Payout (INR)',
        'Status',
        'Payment Date',
        'Transaction Ref',
        'Notes',
      ];

      const escapeCell = (val: any) => {
        const str = String(val ?? '');
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      };

      const rows = payments.map((p) => [
        p.caregiverId,
        p.caregiver?.fullName || '',
        p.caregiver?.phone || '',
        p.caregiver?.district || '',
        p.periodMonth,
        Number(p.dailyRate).toFixed(2),
        Number(p.daysPresent).toFixed(1),
        Number(p.daysHalfDay).toFixed(1),
        Number(p.daysAbsent).toFixed(1),
        Number(p.totalDaysWorked).toFixed(1),
        Number(p.grossAmount).toFixed(2),
        Number(p.commissionPercentage).toFixed(2),
        Number(p.commissionAmount).toFixed(2),
        Number(p.deductions).toFixed(2),
        Number(p.netPayout).toFixed(2),
        p.status,
        p.paymentDate || '',
        p.transactionReference || '',
        p.notes || '',
      ]);

      const csvRows = [
        headers.map(escapeCell).join(','),
        ...rows.map((r) => r.map(escapeCell).join(',')),
        [
          'TOTAL / SUMMARY',
          `${payments.length} Caregivers`,
          '',
          '',
          selectedMonth,
          '',
          '',
          '',
          '',
          stats.totalDaysWorked.toFixed(1),
          stats.totalGross.toFixed(2),
          '',
          stats.totalCommission.toFixed(2),
          '',
          stats.totalNetPayout.toFixed(2),
          '',
          '',
          '',
          '',
        ]
          .map(escapeCell)
          .join(','),
      ];

      const blob = new Blob([csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `salary-report-${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      showToast(`Exported ${payments.length} caregiver statements (CSV)`);
    } catch (e: any) {
      showToast('Export failed: ' + e.message);
    }
  };

  // Export JSON Report
  const handleExportJson = () => {
    try {
      const exportPayload = {
        agencyPayrollMonth: selectedMonth,
        exportedAt: new Date().toISOString(),
        summaryTotals: stats,
        statements: payments,
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
      const link = document.createElement('a');
      link.setAttribute('href', dataStr);
      link.setAttribute('download', `salary-report-${selectedMonth}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      showToast(`Exported monthly payroll JSON for ${selectedMonth}`);
    } catch (e: any) {
      showToast('Export JSON failed: ' + e.message);
    }
  };

  // Open shift breakdown modal
  const openShiftBreakdown = async (caregiverId: string, caregiverName: string) => {
    setActiveBreakdownCaregiver({ id: caregiverId, name: caregiverName });
    setBreakdownLoading(true);
    setBreakdownData(null);
    try {
      const res = await apiFetch(`/payments/breakdown/${caregiverId}?month=${selectedMonth}`);
      if (res && res.data) {
        setBreakdownData(res.data);
      }
    } catch (err: any) {
      console.error('Breakdown error:', err);
      showToast(err.message || 'Failed to fetch shift breakdown');
    } finally {
      setBreakdownLoading(false);
    }
  };

  // Update Payment Status (Approve / Mark Paid / Deductions)
  const submitPaymentUpdate = async () => {
    if (!actionPayment) return;
    setIsUpdating(true);
    try {
      const body: any = {};
      if (actionType === 'approve') {
        body.status = 'approved';
      } else if (actionType === 'pay') {
        body.status = 'paid';
        body.paymentDate = new Date().toISOString().split('T')[0];
        if (actionTxRef) body.transactionReference = actionTxRef;
        if (actionNotes) body.notes = actionNotes;
      } else if (actionType === 'deduction') {
        body.deductions = actionDeduction;
        if (actionNotes) body.notes = actionNotes;
      }

      await apiFetch(`/payments/${actionPayment.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });

      showToast(`Updated statement for ${actionPayment.caregiver?.fullName || 'Caregiver'}`);
      setActionPayment(null);
      setActionType(null);
      await fetchPayments();
    } catch (err: any) {
      console.error('Update error:', err);
      showToast(err.message || 'Failed to update statement');
    } finally {
      setIsUpdating(false);
    }
  };

  // Filtered Payments by search query
  const filteredPayments = useMemo(() => {
    if (!searchQuery.trim()) return payments;
    const q = searchQuery.toLowerCase();
    return payments.filter(
      (p) =>
        p.caregiver?.fullName?.toLowerCase().includes(q) ||
        p.caregiver?.phone?.includes(q) ||
        p.caregiver?.district?.toLowerCase().includes(q)
    );
  }, [payments, searchQuery]);

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '2rem 1.5rem', minHeight: '100vh' }}>
      {/* Toast Alert */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid #14b8a6',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.9rem',
            animation: 'fadeIn 0.2s ease-in-out',
          }}
        >
          <span style={{ color: '#2dd4bf' }}>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumb & Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
        <Link href="/dashboard" style={{ color: 'var(--text-muted)' }}>
          Dashboard
        </Link>
        <span style={{ color: 'var(--text-muted)' }}>/</span>
        <span style={{ color: '#38bdf8', fontWeight: 600 }}>Monthly Salary & Payroll Reports</span>
      </div>

      {/* Top Header & Action Controls */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              margin: '0 0 0.4rem 0',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <span>Monthly Salary & Payout Reports</span>
            <span
              style={{
                fontSize: '0.75rem',
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(20, 184, 166, 0.2)',
                color: '#2dd4bf',
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}
            >
              PHASE 6
            </span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
            Automated payroll calculated directly from daily shift attendance, daily rates, commission splits, and net payouts.
          </p>
        </div>

        {/* Action Buttons: Recalculate, Export CSV, Export JSON */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            id="btn-recalculate-payroll"
            onClick={handleRecalculate}
            disabled={isCalculating}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              color: '#38bdf8',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: isCalculating ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <span style={{ fontSize: '1rem' }}>{isCalculating ? '⏳' : '🔄'}</span>
            <span>{isCalculating ? 'Computing Shifts...' : 'Recalculate Month'}</span>
          </button>

          <button
            id="btn-export-json"
            onClick={handleExportJson}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-card)',
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <span>{'{ }'}</span>
            <span>Export JSON</span>
          </button>

          <button
            id="btn-export-csv"
            onClick={handleExportCsv}
            disabled={isExporting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
              border: '1px solid rgba(20, 184, 166, 0.4)',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: isExporting ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(20, 184, 166, 0.35)',
              transition: 'all 0.2s',
            }}
          >
            <span>{isExporting ? '⏳' : '⬇'}</span>
            <span>{isExporting ? 'Exporting...' : 'Export CSV Report'}</span>
          </button>
        </div>
      </div>

      {/* Month Selector Bar & Filter Tabs */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid var(--border-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.25rem',
          marginBottom: '2rem',
        }}
      >
        {/* Month Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            Payroll Period:
          </label>
          <input
            id="input-payroll-month"
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{
              backgroundColor: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(20, 184, 166, 0.4)',
              borderRadius: 'var(--radius-md)',
              color: '#ffffff',
              padding: '0.45rem 0.85rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              outline: 'none',
            }}
          />

          <button
            onClick={() => {
              const d = new Date(selectedMonth + '-01');
              d.setMonth(d.getMonth() - 1);
              setSelectedMonth(d.toISOString().slice(0, 7));
            }}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-card)',
              color: 'var(--text-secondary)',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            ◀ Prev
          </button>

          <button
            onClick={() => setSelectedMonth(currentMonthStr)}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: selectedMonth === currentMonthStr ? 'rgba(20, 184, 166, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              border: selectedMonth === currentMonthStr ? '1px solid #14b8a6' : '1px solid var(--border-card)',
              color: selectedMonth === currentMonthStr ? '#2dd4bf' : 'var(--text-secondary)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Current Month
          </button>
        </div>

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['all', 'approved', 'paid', 'draft'].map((tab) => {
            const isActive = statusFilter === tab;
            return (
              <button
                key={tab}
                id={`filter-tab-${tab}`}
                onClick={() => setStatusFilter(tab)}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  cursor: 'pointer',
                  backgroundColor: isActive ? 'rgba(20, 184, 166, 0.2)' : 'transparent',
                  border: isActive ? '1px solid #14b8a6' : '1px solid transparent',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab === 'all' ? 'All Statements' : tab}
              </button>
            );
          })}
        </div>

        {/* Search Caregiver Input */}
        <div style={{ position: 'relative', minWidth: '220px' }}>
          <input
            id="input-search-caregiver"
            type="text"
            placeholder="Search caregiver, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: 'rgba(30, 41, 59, 0.7)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-md)',
              padding: '0.45rem 0.85rem',
              color: '#ffffff',
              fontSize: '0.85rem',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Executive Financial Summary Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        {/* Card 1: Total Gross Payroll */}
        <div
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            Total Gross Payroll
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            ₹{stats.totalGross.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#38bdf8', marginTop: '0.4rem' }}>
            Earned across {stats.totalDaysWorked} shifts
          </div>
          <div
            style={{
              position: 'absolute',
              top: '-15px',
              right: '-15px',
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, transparent 70%)',
            }}
          />
        </div>

        {/* Card 2: Agency Commission Retained */}
        <div
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(20, 184, 166, 0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2dd4bf', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            Agency Retained Split
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#2dd4bf', letterSpacing: '-0.02em' }}>
            ₹{stats.totalCommission.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
            Avg. 15% agency margin revenue
          </div>
          <div
            style={{
              position: 'absolute',
              top: '-15px',
              right: '-15px',
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(20, 184, 166, 0.25) 0%, transparent 70%)',
            }}
          />
        </div>

        {/* Card 3: Net Caregiver Disbursal */}
        <div
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(52, 211, 153, 0.35)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            Net Caregiver Disbursal
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34d399', letterSpacing: '-0.02em' }}>
            ₹{stats.totalNetPayout.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
            Take-home earnings for workforce
          </div>
          <div
            style={{
              position: 'absolute',
              top: '-15px',
              right: '-15px',
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(52, 211, 153, 0.2) 0%, transparent 70%)',
            }}
          />
        </div>

        {/* Card 4: Workforce Statements */}
        <div
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            Workforce In Period
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            {stats.totalCaregivers} <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Caregivers</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
            {stats.totalDaysWorked} total working days logged
          </div>
        </div>
      </div>

      {/* Main Payment Statements Table */}
      <div
        style={{
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid var(--border-card)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
              Itemized Caregiver Statements — {selectedMonth}
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Showing {filteredPayments.length} of {payments.length} statements in {selectedMonth}
            </span>
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2dd4bf' }} />
            <span>RLS Enforced: Agency isolated data</span>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏳</div>
            <div>Loading monthly payment statements...</div>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📋</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.4rem' }}>
              No Salary Statements Found for {selectedMonth}
            </div>
            <p style={{ maxWidth: '420px', margin: '0 auto 1.5rem auto', fontSize: '0.875rem' }}>
              No attendance shifts have been calculated for this period yet, or no records match the filter.
            </p>
            <button
              onClick={handleRecalculate}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(20, 184, 166, 0.2)',
                border: '1px solid #14b8a6',
                color: '#2dd4bf',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              🔄 Compute Payroll from Attendance
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: 'rgba(30, 41, 59, 0.5)',
                    borderBottom: '1px solid var(--border-card)',
                    color: 'var(--text-muted)',
                    fontSize: '0.775rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  <th style={{ padding: '0.9rem 1.25rem' }}>Caregiver</th>
                  <th style={{ padding: '0.9rem 1rem' }}>Days Breakdown</th>
                  <th style={{ padding: '0.9rem 1rem' }}>Total Days</th>
                  <th style={{ padding: '0.9rem 1rem' }}>Daily Rate</th>
                  <th style={{ padding: '0.9rem 1rem' }}>Gross (₹)</th>
                  <th style={{ padding: '0.9rem 1rem' }}>Commission Split</th>
                  <th style={{ padding: '0.9rem 1rem' }}>Deductions</th>
                  <th style={{ padding: '0.9rem 1rem', color: '#34d399' }}>Net Payout (₹)</th>
                  <th style={{ padding: '0.9rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((p) => {
                  const theme = STATUS_THEME[p.status] || STATUS_THEME.draft;
                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      {/* Caregiver Name & District */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: 600, color: '#ffffff' }}>
                          {p.caregiver?.fullName || 'Caregiver'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          {p.caregiver?.phone} • {p.caregiver?.district || 'Kerala'}
                        </div>
                      </td>

                      {/* Days Breakdown */}
                      <td style={{ padding: '1rem 1rem' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', fontSize: '0.75rem' }}>
                          <span title="Full Days Present" style={{ padding: '0.15rem 0.4rem', borderRadius: '4px', backgroundColor: 'rgba(52, 211, 153, 0.15)', color: '#34d399' }}>
                            {p.daysPresent}P
                          </span>
                          <span title="Half Days" style={{ padding: '0.15rem 0.4rem', borderRadius: '4px', backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                            {p.daysHalfDay}H
                          </span>
                          {p.daysAbsent > 0 && (
                            <span title="Absent" style={{ padding: '0.15rem 0.4rem', borderRadius: '4px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                              {p.daysAbsent}A
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Total Days Worked */}
                      <td style={{ padding: '1rem 1rem', fontWeight: 600, color: '#ffffff' }}>
                        {p.totalDaysWorked} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>days</span>
                      </td>

                      {/* Daily Rate */}
                      <td style={{ padding: '1rem 1rem', color: 'var(--text-secondary)' }}>
                        ₹{Number(p.dailyRate).toFixed(0)}/day
                      </td>

                      {/* Gross Amount */}
                      <td style={{ padding: '1rem 1rem', fontWeight: 600, color: '#ffffff' }}>
                        ₹{Number(p.grossAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Commission Split */}
                      <td style={{ padding: '1rem 1rem' }}>
                        <div style={{ color: '#2dd4bf', fontWeight: 600 }}>
                          ₹{Number(p.commissionAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {p.commissionPercentage}% Agency Split
                        </div>
                      </td>

                      {/* Deductions */}
                      <td style={{ padding: '1rem 1rem', color: p.deductions > 0 ? '#f87171' : 'var(--text-muted)' }}>
                        {p.deductions > 0 ? `₹${Number(p.deductions).toFixed(2)}` : '—'}
                      </td>

                      {/* Net Payout */}
                      <td style={{ padding: '1rem 1rem' }}>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#34d399' }}>
                          ₹{Number(p.netPayout).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        {p.paymentDate && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            Disbursed: {p.paymentDate}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '1rem 1rem' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.25rem 0.65rem',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: theme.bg,
                            border: `1px solid ${theme.border}`,
                            color: theme.color,
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: theme.dot,
                            }}
                          />
                          <span>{p.status}</span>
                        </span>
                      </td>

                      {/* Quick Actions */}
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.45rem' }}>
                          {/* Shift Itemization */}
                          <button
                            id={`btn-breakdown-${p.caregiverId}`}
                            onClick={() => openShiftBreakdown(p.caregiverId, p.caregiver?.fullName || 'Caregiver')}
                            title="Inspect itemized daily shifts"
                            style={{
                              padding: '0.35rem 0.65rem',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: 'rgba(255, 255, 255, 0.06)',
                              border: '1px solid var(--border-card)',
                              color: '#38bdf8',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Shifts
                          </button>

                          {/* Approve (if draft) */}
                          {p.status === 'draft' && (
                            <button
                              id={`btn-approve-${p.id}`}
                              onClick={() => {
                                setActionPayment(p);
                                setActionType('approve');
                              }}
                              style={{
                                padding: '0.35rem 0.65rem',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                                border: '1px solid rgba(56, 189, 248, 0.4)',
                                color: '#38bdf8',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Approve
                            </button>
                          )}

                          {/* Mark Paid (if approved) */}
                          {p.status === 'approved' && (
                            <button
                              id={`btn-pay-${p.id}`}
                              onClick={() => {
                                setActionPayment(p);
                                setActionType('pay');
                                setActionTxRef(p.transactionReference || '');
                              }}
                              style={{
                                padding: '0.35rem 0.65rem',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: 'rgba(52, 211, 153, 0.15)',
                                border: '1px solid rgba(52, 211, 153, 0.4)',
                                color: '#34d399',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Mark Paid
                            </button>
                          )}

                          {/* Edit Deductions */}
                          <button
                            id={`btn-deduction-${p.id}`}
                            onClick={() => {
                              setActionPayment(p);
                              setActionType('deduction');
                              setActionDeduction(p.deductions || 0);
                            }}
                            title="Add/adjust deduction"
                            style={{
                              padding: '0.35rem 0.55rem',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid var(--border-card)',
                              color: 'var(--text-muted)',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                            }}
                          >
                            ₹±
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Shift-by-Shift Daily Breakdown */}
      {activeBreakdownCaregiver && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 90,
            padding: '1.5rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid rgba(20, 184, 166, 0.4)',
              borderRadius: 'var(--radius-xl)',
              maxWidth: '750px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
              padding: '1.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#ffffff' }}>
                  Daily Shift Breakdown
                </h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {activeBreakdownCaregiver.name} • {selectedMonth}
                </span>
              </div>
              <button
                onClick={() => setActiveBreakdownCaregiver(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {breakdownLoading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                ⏳ Loading daily shift logs...
              </div>
            ) : !breakdownData || breakdownData.shifts.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No daily check-in shifts recorded for this caregiver in {selectedMonth}.
              </div>
            ) : (
              <div>
                {/* Financial Summary banner inside modal */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '0.75rem',
                    backgroundColor: 'rgba(30, 41, 59, 0.6)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.9rem',
                    marginBottom: '1.25rem',
                    textAlign: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Days Worked</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
                      {breakdownData.totalDaysWorked}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Gross</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
                      ₹{breakdownData.grossAmount}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Agency Split ({breakdownData.commissionPercentage}%)</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2dd4bf' }}>
                      ₹{breakdownData.commissionAmount}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Net Payout</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#34d399' }}>
                      ₹{breakdownData.netPayout}
                    </div>
                  </div>
                </div>

                {/* Shift Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-card)', color: 'var(--text-muted)', textAlign: 'left', fontSize: '0.75rem' }}>
                      <th style={{ padding: '0.6rem 0.5rem' }}>Date</th>
                      <th style={{ padding: '0.6rem 0.5rem' }}>Patient / Customer</th>
                      <th style={{ padding: '0.6rem 0.5rem' }}>Status</th>
                      <th style={{ padding: '0.6rem 0.5rem' }}>Check In / Out</th>
                      <th style={{ padding: '0.6rem 0.5rem' }}>Rate</th>
                      <th style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>Earned Gross</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdownData.shifts.map((s, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '0.65rem 0.5rem', fontWeight: 600, color: '#ffffff' }}>{s.date}</td>
                        <td style={{ padding: '0.65rem 0.5rem', color: 'var(--text-secondary)' }}>{s.customerName || '—'}</td>
                        <td style={{ padding: '0.65rem 0.5rem' }}>
                          <span
                            style={{
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              backgroundColor: s.status === 'present' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                              color: s.status === 'present' ? '#34d399' : '#38bdf8',
                              fontWeight: 600,
                            }}
                          >
                            {s.status} ({s.dayFactor}x)
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {s.checkInTime ? new Date(s.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                          {' → '}
                          {s.checkOutTime ? new Date(s.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem', color: 'var(--text-secondary)' }}>₹{s.dailyRate}</td>
                        <td style={{ padding: '0.65rem 0.5rem', fontWeight: 700, color: '#ffffff', textAlign: 'right' }}>
                          ₹{s.earnedGross}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Update Payment Action (Approve / Pay / Deductions) */}
      {actionPayment && actionType && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 90,
            padding: '1.5rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid rgba(20, 184, 166, 0.4)',
              borderRadius: 'var(--radius-xl)',
              maxWidth: '480px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
              {actionType === 'approve'
                ? 'Approve Salary Statement'
                : actionType === 'pay'
                ? 'Record Disbursal & Mark Paid'
                : 'Adjust Statement Deductions'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Caregiver: <strong style={{ color: '#ffffff' }}>{actionPayment.caregiver?.fullName}</strong> ({actionPayment.periodMonth})
            </p>

            {actionType === 'approve' && (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Approving this statement locks the calculated net payout of{' '}
                <strong style={{ color: '#34d399' }}>₹{actionPayment.netPayout}</strong> and designates it as ready for bank disbursal.
              </p>
            )}

            {actionType === 'pay' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                    Transaction Reference / UTR
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR20260929987654"
                    value={actionTxRef}
                    onChange={(e) => setActionTxRef(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.8rem',
                      backgroundColor: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid var(--border-card)',
                      borderRadius: 'var(--radius-md)',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                    Payment Notes / Disbursal Method
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. NEFT transfer to SBI A/c"
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.8rem',
                      backgroundColor: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid var(--border-card)',
                      borderRadius: 'var(--radius-md)',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            )}

            {actionType === 'deduction' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                    Deduction Amount (INR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={actionDeduction}
                    onChange={(e) => setActionDeduction(parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.8rem',
                      backgroundColor: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid var(--border-card)',
                      borderRadius: 'var(--radius-md)',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.8rem', color: '#38bdf8' }}>
                  Updated Net Payout will be:{' '}
                  <strong>
                    ₹{Math.max(0, actionPayment.grossAmount - actionPayment.commissionAmount - actionDeduction).toFixed(2)}
                  </strong>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => {
                  setActionPayment(null);
                  setActionType(null);
                }}
                style={{
                  padding: '0.55rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--border-card)',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                id="btn-confirm-payment-action"
                onClick={submitPaymentUpdate}
                disabled={isUpdating}
                style={{
                  padding: '0.55rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                }}
              >
                {isUpdating ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
