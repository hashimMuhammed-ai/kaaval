'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../../utils/api';
import { KERALA_DISTRICTS } from '../../../constants/kerala';

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  active: {
    label: 'Active Care',
    color: '#059669',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.25)',
    dot: '#10b981',
  },
  pending: {
    label: 'Pending Assignment',
    color: '#d97706',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.25)',
    dot: '#f59e0b',
  },
  paused: {
    label: 'Temporarily Paused',
    color: '#0284c7',
    bg: 'rgba(56, 189, 248, 0.12)',
    border: 'rgba(56, 189, 248, 0.25)',
    dot: '#0284c7',
  },
  discharged: {
    label: 'Discharged',
    color: '#7c3aed',
    bg: 'rgba(167, 139, 250, 0.12)',
    border: 'rgba(167, 139, 250, 0.25)',
    dot: '#7c3aed',
  },
  inactive: {
    label: 'Inactive',
    color: '#64748b',
    bg: 'rgba(148, 163, 184, 0.12)',
    border: 'rgba(148, 163, 184, 0.25)',
    dot: '#64748b',
  },
};

const SERVICE_LABELS: Record<string, string> = {
  elderly_care: 'Elderly Daily Assistance',
  bedridden_care: 'Bedridden & Palliative Care',
  post_op: 'Post-Operative Recovery',
  dementia_care: 'Dementia & Alzheimer’s Care',
  specialized_nursing: 'Specialized Nursing Care',
  mother_baby: 'Mother & Newborn Care',
};

const DURATION_LABELS: Record<string, string> = {
  '24_hours': '24h Live-In',
  '12_day': '12h Day',
  '12_night': '12h Night',
  custom: 'Custom Shift',
};

export default function DashboardCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Tabs: 'all' | 'active' | 'pending' | 'paused' | 'inactive'
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('All Districts');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Quick Onboard Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    patientName: '',
    patientAge: '',
    patientGender: 'female',
    patientCondition: '',
    mobilityStatus: 'assisted',
    medicalEquipment: 'none',
    primaryContactName: '',
    relationship: 'son_daughter',
    phone: '',
    district: 'Ernakulam (Kochi)',
    address: '',
    serviceType: 'elderly_care',
    duration: '24_hours',
    startDate: 'Immediate',
    status: 'pending',
    notes: '',
  });

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    paused: 0,
    inactive: 0,
    discharged: 0,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (selectedDistrict !== 'All Districts') {
        params.append('district', selectedDistrict);
      }
      if (searchQuery.trim()) {
        params.append('q', searchQuery.trim());
      }
      params.append('limit', '100');

      const res = await apiFetch(`/customers?${params.toString()}`);
      if (res?.data) {
        setCustomers(res.data);
        if (res.meta?.stats) {
          setStats(res.meta.stats);
        }
      } else {
        setCustomers([]);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load customers from agency CRM.');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [statusFilter, selectedDistrict]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers();
  };

  // Quick Status Switcher from list table
  const handleQuickStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const res = await apiFetch(`/customers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (res?.data) {
        setCustomers((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
        );
        showToast(`Status updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
        fetchCustomers();
      }
    } catch (err: any) {
      showToast(`Update failed: ${err.message}`);
    }
  };

  // Create new customer
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerForm.patientName || !newCustomerForm.primaryContactName || !newCustomerForm.phone) {
      alert('Please fill in required fields (Patient Name, Contact Person, Phone).');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await apiFetch('/customers', {
        method: 'POST',
        body: JSON.stringify(newCustomerForm),
      });
      if (res?.data) {
        setShowCreateModal(false);
        showToast(`Customer account created: ${res.data.patientName}`);
        setNewCustomerForm({
          patientName: '',
          patientAge: '',
          patientGender: 'female',
          patientCondition: '',
          mobilityStatus: 'assisted',
          medicalEquipment: 'none',
          primaryContactName: '',
          relationship: 'son_daughter',
          phone: '',
          district: 'Ernakulam (Kochi)',
          address: '',
          serviceType: 'elderly_care',
          duration: '24_hours',
          startDate: 'Immediate',
          status: 'pending',
          notes: '',
        });
        fetchCustomers();
      }
    } catch (err: any) {
      showToast(`Creation failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered customers locally in memory as well for fast instant search
  const filteredCustomers = useMemo(() => {
    return customers.filter((cust) => {
      if (statusFilter !== 'all' && cust.status !== statusFilter) {
        return false;
      }
      if (selectedDistrict !== 'All Districts' && !cust.district?.toLowerCase().includes(selectedDistrict.toLowerCase())) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = cust.patientName?.toLowerCase().includes(q);
        const matchContact = cust.primaryContactName?.toLowerCase().includes(q);
        const matchPhone = cust.phone?.includes(q);
        const matchRef = cust.referenceId?.toLowerCase().includes(q);
        return matchName || matchContact || matchPhone || matchRef;
      }
      return true;
    });
  }, [customers, statusFilter, selectedDistrict, searchQuery]);

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '4rem' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: '#0f172a',
            border: '1px solid #14b8a6',
            color: '#f8fafc',
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.9rem',
          }}
        >
          <span style={{ color: '#2dd4bf' }}>●</span>
          {toastMessage}
        </div>
      )}

      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <h1
              id="customers-page-title"
              style={{
                fontSize: 'clamp(1.35rem, 3.5vw, 1.85rem)',
                fontWeight: 800,
                color: 'var(--text-main, #0f172a)',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              Customer Accounts & CRM
            </h1>

            <button
              id="btn-refresh-customers"
              onClick={fetchCustomers}
              title="Refresh Customer Accounts"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.4rem 0.75rem',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-surface, #ffffff)',
                border: '1px solid var(--border-card, #cbd5e1)',
                color: 'var(--text-secondary, #475569)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M23 4v6h-6M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              <span>Refresh</span>
            </button>
          </div>

          <p
            className="hide-on-mobile"
            style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.35rem', margin: 0 }}
          >
            Family contacts, patient profiles, care requirements, and active caregiver assignments.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            id="btn-onboard-customer-modal"
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              backgroundColor: '#0d9488',
              border: 'none',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.825rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 4px 14px rgba(13, 148, 136, 0.3)',
              whiteSpace: 'nowrap',
            }}
          >
            <span>+</span> Onboard New Customer
          </button>
        </div>
      </div>

      {/* KPI Metric Cards (Desktop Only - Mobile uses horizontal status filter tabs below) */}
      <div
        className="hide-on-mobile"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        {/* Total Accounts */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: '12px',
            padding: '1.25rem',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Client Accounts
          </div>
          <div id="stat-total-customers" style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--text-main, #0f172a)', marginTop: '0.35rem' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            All active & onboarded families
          </div>
        </div>

        {/* Active Care (Primary Filter) */}
        <div
          onClick={() => setStatusFilter('active')}
          style={{
            backgroundColor: 'var(--bg-card)',
            border: statusFilter === 'active' ? '1px solid #059669' : '1px solid var(--border-card)',
            borderRadius: '12px',
            padding: '1.25rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              ● Active In-Home Care
            </span>
            <span style={{ fontSize: '0.75rem', color: '#059669', backgroundColor: 'rgba(16, 185, 129, 0.12)', padding: '2px 8px', borderRadius: '10px' }}>
              Primary Filter
            </span>
          </div>
          <div id="stat-active-customers" style={{ fontSize: '1.85rem', fontWeight: 700, color: '#059669', marginTop: '0.35rem' }}>
            {stats.active}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Caregivers currently deployed
          </div>
        </div>

        {/* Pending Assignment (Primary Filter) */}
        <div
          onClick={() => setStatusFilter('pending')}
          style={{
            backgroundColor: 'var(--bg-card)',
            border: statusFilter === 'pending' ? '1px solid #d97706' : '1px solid var(--border-card)',
            borderRadius: '12px',
            padding: '1.25rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              ● Pending Assignment
            </span>
            <span style={{ fontSize: '0.75rem', color: '#d97706', backgroundColor: 'rgba(245, 158, 11, 0.12)', padding: '2px 8px', borderRadius: '10px' }}>
              Action Required
            </span>
          </div>
          <div id="stat-pending-customers" style={{ fontSize: '1.85rem', fontWeight: 700, color: '#d97706', marginTop: '0.35rem' }}>
            {stats.pending}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Awaiting staff matching
          </div>
        </div>

        {/* Paused Accounts */}
        <div
          onClick={() => setStatusFilter('paused')}
          style={{
            backgroundColor: 'var(--bg-card)',
            border: statusFilter === 'paused' ? '1px solid #0284c7' : '1px solid var(--border-card)',
            borderRadius: '12px',
            padding: '1.25rem',
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            ● Temporarily Paused
          </div>
          <div id="stat-paused-customers" style={{ fontSize: '1.85rem', fontWeight: 700, color: '#0284c7', marginTop: '0.35rem' }}>
            {stats.paused}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Hold (hospital / family break)
          </div>
        </div>
      </div>

      {/* Tabs Filter Bar (Active / Pending / All) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: '12px',
          padding: '0.75rem 1rem',
          marginBottom: '1.25rem',
        }}
      >
        {/* Status Filter Tabs */}
        <div className="mobile-scroll-x" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'nowrap', overflowX: 'auto', width: '100%', minWidth: 0, paddingBottom: '0.25rem' }}>
          {[
            { id: 'all', label: 'All Customers', count: stats.total },
            { id: 'active', label: 'Active Care', count: stats.active, color: '#10b981' },
            { id: 'pending', label: 'Pending Assignment', count: stats.pending, color: '#f59e0b' },
            { id: 'paused', label: 'Paused', count: stats.paused, color: '#38bdf8' },
            { id: 'discharged', label: 'Discharged', count: stats.discharged, color: '#a78bfa' },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-status-${tab.id}`}
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  padding: '0.45rem 0.95rem',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  backgroundColor: isActive
                    ? tab.color
                      ? `rgba(${tab.color === '#059669' ? '16, 185, 129' : tab.color === '#d97706' ? '245, 158, 11' : '56, 189, 248'}, 0.15)`
                      : '#f1f5f9'
                    : 'transparent',
                  color: isActive ? (tab.color || 'var(--text-main)') : 'var(--text-secondary)',
                  border: isActive
                    ? `1px solid ${tab.color || 'var(--border-card)'}`
                    : '1px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    backgroundColor: isActive ? 'rgba(0, 0, 0, 0.06)' : 'rgba(0, 0, 0, 0.03)',
                    color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & District Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', width: '100%' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: '180px' }}>
            <input
              id="customer-search-input"
              type="text"
              placeholder="Search patient, contact, phone, ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-surface, #ffffff)',
                border: '1px solid var(--border-card, #e2e8f0)',
                borderRadius: '8px',
                padding: '0.5rem 0.85rem',
                fontSize: '0.85rem',
                color: 'var(--text-main, #0f172a)',
                outline: 'none',
              }}
            />
          </form>

          <select
            id="district-filter-select"
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            style={{
              backgroundColor: 'var(--bg-surface, #ffffff)',
              border: '1px solid var(--border-card, #e2e8f0)',
              borderRadius: '8px',
              padding: '0.5rem 0.85rem',
              fontSize: '0.85rem',
              color: 'var(--text-main, #0f172a)',
              outline: 'none',
              cursor: 'pointer',
              minWidth: '140px',
            }}
          >
            {KERALA_DISTRICTS.map((dist) => (
              <option key={dist} value={dist}>
                {dist}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Customers Table */}
      <div
        id="customers-table-container"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: '14px',
          overflow: 'hidden',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                margin: '0 auto 1rem',
                border: '3px solid rgba(13, 148, 136, 0.2)',
                borderTop: '3px solid #0d9488',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            Loading Customer CRM accounts...
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#dc2626' }}>
            <p>{error}</p>
            <button
              onClick={fetchCustomers}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                backgroundColor: '#0d9488',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>👥</div>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--text-main, #0f172a)', margin: '0 0 0.5rem', fontWeight: 600 }}>
              No Customers Found
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
              {statusFilter === 'active'
                ? 'No clients currently marked as Active Care. Check Pending Assignment to match caregivers.'
                : statusFilter === 'pending'
                ? 'No pending customer records awaiting assignment. All accounts are currently covered.'
                : 'No customer accounts matching your current search or district filters.'}
            </p>
            <button
              onClick={() => {
                setStatusFilter('all');
                setSelectedDistrict('All Districts');
                setSearchQuery('');
              }}
              style={{
                padding: '0.55rem 1.15rem',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-surface, #ffffff)',
                border: '1px solid var(--border-card, #e2e8f0)',
                color: 'var(--text-main, #0f172a)',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <>
            <div className="hide-on-mobile" style={{ overflowX: 'auto' }}>
            <table
              id="customers-table"
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.875rem',
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated, #f8fafc)',
                    borderBottom: '1px solid var(--border-card)',
                    color: 'var(--text-muted)',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  <th style={{ padding: '1rem 1.25rem' }}>Patient & Condition</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Service & Location</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Assigned Caregiver</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Family Contact</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Status</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((cust) => {
                  const statusConf = STATUS_CONFIG[cust.status] || STATUS_CONFIG.pending;
                  const cleanPhone = cust.phone.replace(/[^0-9]/g, '');
                  const whatsappUrl = `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}`;

                  return (
                    <tr
                      key={cust.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      {/* Patient & Condition */}
                      <td style={{ padding: '1.1rem 1.25rem', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Link
                            href={`/dashboard/customers/${cust.id}`}
                            style={{
                              color: 'var(--text-main, #0f172a)',
                              fontWeight: 700,
                              fontSize: '0.95rem',
                              textDecoration: 'none',
                            }}
                          >
                            {cust.patientName}
                          </Link>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontSize: '0.72rem',
                              color: '#0f766e',
                              backgroundColor: 'rgba(13, 148, 136, 0.1)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            {cust.referenceId}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                          {cust.patientAge ? `${cust.patientAge}y, ` : ''}
                          <span style={{ textTransform: 'capitalize' }}>{cust.patientGender || 'Unspecified'}</span>
                          {cust.mobilityStatus ? ` • ${cust.mobilityStatus}` : ''}
                        </div>

                        {cust.patientCondition && (
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-secondary)',
                              marginTop: '4px',
                              maxWidth: '280px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            📋 {cust.patientCondition}
                          </div>
                        )}
                      </td>

                      {/* Service & Location */}
                      <td style={{ padding: '1.1rem 1.25rem', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>
                          {SERVICE_LABELS[cust.serviceType] || cust.serviceType}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {DURATION_LABELS[cust.duration] || cust.duration} • Start: {cust.startDate}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#0f766e', marginTop: '2px' }}>
                          📍 {cust.district}
                        </div>
                      </td>

                      {/* Assigned Caregiver */}
                      <td style={{ padding: '1.1rem 1.25rem', verticalAlign: 'top' }}>
                        {cust.assignedCaregiver ? (
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>
                              👩‍⚕️ {cust.assignedCaregiver.fullName}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              ₹{cust.assignedCaregiver.dailyRate || 950}/day • {cust.assignedCaregiver.phone}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                color: '#d97706',
                                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                                border: '1px solid rgba(245, 158, 11, 0.25)',
                                padding: '3px 8px',
                                borderRadius: '10px',
                                fontWeight: 500,
                              }}
                            >
                              ● Unassigned
                            </span>
                            <div style={{ marginTop: '4px' }}>
                              <Link
                                href={`/dashboard/customers/${cust.id}`}
                                style={{
                                  fontSize: '0.75rem',
                                  color: '#0d9488',
                                  textDecoration: 'underline',
                                }}
                              >
                                + Assign Caregiver
                              </Link>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Family Contact */}
                      <td style={{ padding: '1.1rem 1.25rem', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>
                          {cust.primaryContactName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                          {cust.relationship?.replace(/_/g, ' ') || 'Family'} • {cust.phone}
                        </div>
                        <div style={{ marginTop: '4px' }}>
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              fontSize: '0.75rem',
                              color: '#059669',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            💬 WhatsApp Chat
                          </a>
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '1.1rem 1.25rem', verticalAlign: 'top' }}>
                        <select
                          value={cust.status}
                          onChange={(e) => handleQuickStatusUpdate(cust.id, e.target.value)}
                          style={{
                            backgroundColor: statusConf.bg,
                            color: statusConf.color,
                            border: `1px solid ${statusConf.border}`,
                            padding: '4px 8px',
                            borderRadius: '14px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            outline: 'none',
                          }}
                        >
                          <option value="active">Active Care</option>
                          <option value="pending">Pending</option>
                          <option value="paused">Paused</option>
                          <option value="discharged">Discharged</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '1.1rem 1.25rem', textAlign: 'right', verticalAlign: 'top' }}>
                        <Link
                          id={`btn-view-customer-${cust.id}`}
                          href={`/dashboard/customers/${cust.id}`}
                          style={{
                            display: 'inline-block',
                            padding: '0.45rem 0.85rem',
                            borderRadius: '6px',
                            backgroundColor: 'rgba(13, 148, 136, 0.1)',
                            border: '1px solid rgba(13, 148, 136, 0.25)',
                            color: '#0f766e',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          View Profile & Caregiver →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Touch Cards Feed (show-on-mobile-block) */}
          <div
            className="show-on-mobile-block"
            id="mobile-customers-feed"
            style={{
              display: 'none',
              width: '100%',
              padding: '0.75rem 0.75rem 1rem 0.75rem',
              boxSizing: 'border-box',
            }}
          >
            {filteredCustomers.map((cust) => {
              const statusConf = STATUS_CONFIG[cust.status] || STATUS_CONFIG.pending;
              const cleanPhone = cust.phone ? cust.phone.replace(/[^0-9]/g, '') : '';
              const whatsappUrl = `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}`;
              const initials = cust.patientName
                ? cust.patientName
                    .split(' ')
                    .map((n: string) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()
                : 'PT';

              return (
                <div
                  key={`mobile-cust-${cust.id}`}
                  id={`mobile-customer-card-${cust.id}`}
                  className="glass-card"
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-lg, 12px)',
                    border: `1px solid ${statusConf.border}`,
                    backgroundColor: '#ffffff',
                    marginBottom: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Card Header: Patient Avatar, Name & Reference, Status Pill */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      width: '100%',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(13, 148, 136, 0.12)',
                          border: '1px solid rgba(13, 148, 136, 0.3)',
                          color: '#0f766e',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          flexShrink: 0,
                          marginTop: '1px',
                        }}
                      >
                        {initials}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
                          <Link
                            href={`/dashboard/customers/${cust.id}`}
                            style={{
                              fontWeight: 700,
                              fontSize: '0.975rem',
                              color: 'var(--text-main, #0f172a)',
                              textDecoration: 'none',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              minWidth: 0,
                              display: 'block',
                            }}
                          >
                            {cust.patientName}
                          </Link>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            flexWrap: 'wrap',
                            marginTop: '2px',
                          }}
                        >
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontSize: '0.7rem',
                              color: '#0f766e',
                              backgroundColor: 'rgba(13, 148, 136, 0.1)',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              whiteSpace: 'nowrap',
                              fontWeight: 600,
                            }}
                          >
                            {cust.referenceId}
                          </span>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-muted, #64748b)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            • {cust.patientAge ? `${cust.patientAge}y, ` : ''}
                            <span style={{ textTransform: 'capitalize' }}>{cust.patientGender || 'Unspecified'}</span>
                            {cust.mobilityStatus ? ` • ${cust.mobilityStatus}` : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '9999px',
                        backgroundColor: statusConf.bg,
                        border: `1px solid ${statusConf.border}`,
                        color: statusConf.color,
                        fontSize: '0.725rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: statusConf.dot }} />
                      {statusConf.label}
                    </span>
                  </div>

                  {/* Condition / Note (if present) */}
                  {cust.patientCondition && (
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--text-secondary, #475569)',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '0.45rem 0.65rem',
                        lineHeight: 1.4,
                      }}
                    >
                      📋 {cust.patientCondition}
                    </div>
                  )}

                  {/* Service & Location Badge */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.8rem',
                      color: '#334155',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <strong style={{ color: '#0f172a' }}>{SERVICE_LABELS[cust.serviceType] || cust.serviceType}</strong>
                      <span style={{ color: '#64748b' }}> • {DURATION_LABELS[cust.duration] || cust.duration}</span>
                    </div>
                    <div style={{ color: '#0f766e', fontWeight: 600, fontSize: '0.75rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      📍 {cust.district}
                    </div>
                  </div>

                  {/* Assigned Caregiver Section */}
                  <div
                    style={{
                      padding: '0.65rem 0.75rem',
                      borderRadius: '8px',
                      backgroundColor: cust.assignedCaregiver ? 'rgba(13, 148, 136, 0.06)' : 'rgba(245, 158, 11, 0.08)',
                      border: cust.assignedCaregiver ? '1px solid rgba(13, 148, 136, 0.2)' : '1px solid rgba(245, 158, 11, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                    }}
                  >
                    {cust.assignedCaregiver ? (
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '0.72rem', color: '#0f766e', fontWeight: 600 }}>
                          👩‍⚕️ Assigned Caregiver
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {cust.assignedCaregiver.fullName}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          ₹{cust.assignedCaregiver.dailyRate || 950}/day • {cust.assignedCaregiver.phone}
                        </div>
                      </div>
                    ) : (
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '0.78rem', color: '#d97706', fontWeight: 600 }}>
                          ⚠️ No Caregiver Assigned
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          Awaiting staff matching & assignment
                        </div>
                      </div>
                    )}

                    <div style={{ flexShrink: 0 }}>
                      <Link
                        href={cust.assignedCaregiver ? `/dashboard/customers/${cust.id}` : `/dashboard/matching?customerId=${cust.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0.35rem 0.65rem',
                          borderRadius: '6px',
                          backgroundColor: cust.assignedCaregiver ? '#ffffff' : '#0d9488',
                          border: cust.assignedCaregiver ? '1px solid #cbd5e1' : 'none',
                          color: cust.assignedCaregiver ? '#0f766e' : '#ffffff',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textDecoration: 'none',
                          whiteSpace: 'nowrap',
                          minHeight: '32px',
                        }}
                      >
                        {cust.assignedCaregiver ? 'Change' : '+ Match'}
                      </Link>
                    </div>
                  </div>

                  {/* Family Contact */}
                  <div
                    style={{
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: '0.65rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        👤 {cust.primaryContactName}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {cust.relationship?.replace(/_/g, ' ') || 'Family'} • {cust.phone}
                      </div>
                    </div>
                  </div>

                  {/* 1-Tap Quick Action Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr auto',
                      gap: '0.5rem',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  >
                    <a
                      id={`mobile-call-${cust.id}`}
                      href={`tel:${cleanPhone}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        color: '#0f172a',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                        minHeight: '38px',
                        boxSizing: 'border-box',
                      }}
                    >
                      📞 Call
                    </a>

                    <a
                      id={`mobile-whatsapp-${cust.id}`}
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        backgroundColor: '#10b981',
                        color: '#ffffff',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                        minHeight: '38px',
                        boxSizing: 'border-box',
                      }}
                    >
                      💬 WhatsApp
                    </a>

                    <Link
                      id={`mobile-view-${cust.id}`}
                      href={`/dashboard/customers/${cust.id}`}
                      title="View Details"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.5rem 0.85rem',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(13, 148, 136, 0.12)',
                        border: '1px solid rgba(13, 148, 136, 0.25)',
                        color: '#0f766e',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        minHeight: '38px',
                        boxSizing: 'border-box',
                      }}
                    >
                      →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )}
      </div>

      {/* Quick Onboard Customer Modal */}
      {showCreateModal && (
        <div
          id="modal-onboard-customer"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.5rem',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '640px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.15)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.5rem',
                borderBottom: '1px solid var(--border-card)',
                paddingBottom: '0.75rem',
              }}
            >
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main, #0f172a)', margin: 0 }}>
                Onboard New Client / Patient Account
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomer}>
              {/* Patient Demographics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Patient Full Name *
                  </label>
                  <input
                    required
                    type="text"
                    value={newCustomerForm.patientName}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, patientName: e.target.value })}
                    placeholder="e.g. K. V. Raman"
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--bg-surface, #ffffff)',
                      border: '1px solid var(--border-card, #e2e8f0)',
                      borderRadius: '6px',
                      padding: '0.5rem',
                      color: 'var(--text-main, #0f172a)',
                      marginTop: '4px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Age
                  </label>
                  <input
                    type="text"
                    value={newCustomerForm.patientAge}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, patientAge: e.target.value })}
                    placeholder="75"
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--bg-surface, #ffffff)',
                      border: '1px solid var(--border-card, #e2e8f0)',
                      borderRadius: '6px',
                      padding: '0.5rem',
                      color: 'var(--text-main, #0f172a)',
                      marginTop: '4px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Gender
                  </label>
                  <select
                    value={newCustomerForm.patientGender}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, patientGender: e.target.value })}
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--bg-surface, #ffffff)',
                      border: '1px solid var(--border-card, #e2e8f0)',
                      borderRadius: '6px',
                      padding: '0.5rem',
                      color: 'var(--text-main, #0f172a)',
                      marginTop: '4px',
                    }}
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="unspecified">Unspecified</option>
                  </select>
                </div>
              </div>

              {/* Medical Condition & Mobility */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Medical Condition / Diagnosis
                </label>
                <input
                  type="text"
                  value={newCustomerForm.patientCondition}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, patientCondition: e.target.value })}
                  placeholder="e.g. Post-stroke rehabilitation, catheter care"
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-surface, #ffffff)',
                    border: '1px solid var(--border-card, #e2e8f0)',
                    borderRadius: '6px',
                    padding: '0.5rem',
                    color: 'var(--text-main, #0f172a)',
                    marginTop: '4px',
                  }}
                />
              </div>

              {/* Family Contact */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Contact Person Name *
                  </label>
                  <input
                    required
                    type="text"
                    value={newCustomerForm.primaryContactName}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, primaryContactName: e.target.value })}
                    placeholder="e.g. Dr. Thomas Varghese"
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--bg-surface, #ffffff)',
                      border: '1px solid var(--border-card, #e2e8f0)',
                      borderRadius: '6px',
                      padding: '0.5rem',
                      color: 'var(--text-main, #0f172a)',
                      marginTop: '4px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Relationship
                  </label>
                  <select
                    value={newCustomerForm.relationship}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, relationship: e.target.value })}
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--bg-surface, #ffffff)',
                      border: '1px solid var(--border-card, #e2e8f0)',
                      borderRadius: '6px',
                      padding: '0.5rem',
                      color: 'var(--text-main, #0f172a)',
                      marginTop: '4px',
                    }}
                  >
                    <option value="son_daughter">Son / Daughter</option>
                    <option value="spouse">Spouse</option>
                    <option value="self">Self</option>
                    <option value="other">Guardian / Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Phone Number *
                  </label>
                  <input
                    required
                    type="text"
                    value={newCustomerForm.phone}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                    placeholder="+91 98470 12345"
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--bg-surface, #ffffff)',
                      border: '1px solid var(--border-card, #e2e8f0)',
                      borderRadius: '6px',
                      padding: '0.5rem',
                      color: 'var(--text-main, #0f172a)',
                      marginTop: '4px',
                    }}
                  />
                </div>
              </div>

              {/* Service & Shift */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Service Type
                  </label>
                  <select
                    value={newCustomerForm.serviceType}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, serviceType: e.target.value })}
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--bg-surface, #ffffff)',
                      border: '1px solid var(--border-card, #e2e8f0)',
                      borderRadius: '6px',
                      padding: '0.5rem',
                      color: 'var(--text-main, #0f172a)',
                      marginTop: '4px',
                    }}
                  >
                    <option value="elderly_care">Elderly Daily Assistance</option>
                    <option value="bedridden_care">Bedridden & Palliative</option>
                    <option value="post_op">Post-Operative Recovery</option>
                    <option value="dementia_care">Dementia & Alzheimer’s</option>
                    <option value="specialized_nursing">Specialized Nursing</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Shift Duration
                  </label>
                  <select
                    value={newCustomerForm.duration}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, duration: e.target.value })}
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--bg-surface, #ffffff)',
                      border: '1px solid var(--border-card, #e2e8f0)',
                      borderRadius: '6px',
                      padding: '0.5rem',
                      color: 'var(--text-main, #0f172a)',
                      marginTop: '4px',
                    }}
                  >
                    <option value="24_hours">24 Hours Live-In</option>
                    <option value="12_day">12h Day Shift</option>
                    <option value="12_night">12h Night Shift</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Location District
                  </label>
                  <select
                    value={newCustomerForm.district}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, district: e.target.value })}
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--bg-surface, #ffffff)',
                      border: '1px solid var(--border-card, #e2e8f0)',
                      borderRadius: '6px',
                      padding: '0.5rem',
                      color: 'var(--text-main, #0f172a)',
                      marginTop: '4px',
                    }}
                  >
                    {KERALA_DISTRICTS.filter((d) => d !== 'All Districts').map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Initial Account Status
                </label>
                <select
                  value={newCustomerForm.status}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, status: e.target.value })}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-surface, #ffffff)',
                    border: '1px solid var(--border-card, #e2e8f0)',
                    borderRadius: '6px',
                    padding: '0.5rem',
                    color: 'var(--text-main, #0f172a)',
                    marginTop: '4px',
                  }}
                >
                  <option value="pending">Pending Assignment (Awaiting Caregiver)</option>
                  <option value="active">Active Care</option>
                  <option value="paused">Temporarily Paused</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '0.6rem 1.2rem',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-surface-elevated, #f1f5f9)',
                    border: '1px solid var(--border-card, #e2e8f0)',
                    color: 'var(--text-secondary, #475569)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-create-customer"
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '0.6rem 1.5rem',
                    borderRadius: '8px',
                    backgroundColor: '#0d9488',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: isSubmitting ? 'wait' : 'pointer',
                  }}
                >
                  {isSubmitting ? 'Saving...' : 'Create Customer Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
