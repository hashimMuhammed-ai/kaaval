'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../../utils/api';
import { KERALA_DISTRICTS } from '../../../constants/kerala';

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  pending: {
    label: 'Pending',
    color: '#fbbf24',
    bg: 'rgba(245, 158, 11, 0.15)',
    border: 'rgba(245, 158, 11, 0.35)',
    dot: '#f59e0b',
  },
  contacted: {
    label: 'Contacted',
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.15)',
    border: 'rgba(56, 189, 248, 0.35)',
    dot: '#38bdf8',
  },
  matched: {
    label: 'Matched',
    color: '#a78bfa',
    bg: 'rgba(167, 139, 250, 0.15)',
    border: 'rgba(167, 139, 250, 0.35)',
    dot: '#a78bfa',
  },
  assigned: {
    label: 'Assigned',
    color: '#34d399',
    bg: 'rgba(16, 185, 129, 0.15)',
    border: 'rgba(16, 185, 129, 0.35)',
    dot: '#10b981',
  },
  cancelled: {
    label: 'Cancelled',
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.15)',
    border: 'rgba(148, 163, 184, 0.35)',
    dot: '#64748b',
  },
  completed: {
    label: 'Completed',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.15)',
    border: 'rgba(16, 185, 129, 0.35)',
    dot: '#10b981',
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
  '24_hours': '24 Hours Live-In',
  '12_day': '12h Day Shift',
  '12_night': '12h Night Shift',
  custom: 'Custom Shift',
};

// Compact display for long reference IDs (e.g. "REQ-2026-894102" -> "#894102")
function formatRefId(refId?: string): string {
  if (!refId) return '';
  const parts = refId.split('-');
  if (parts.length >= 3) {
    return `#${parts[parts.length - 1]}`;
  }
  return refId;
}

// Clean and deduplicate Kerala location (prevents "East Fort, Thrissur, Thrissur")
function formatLocation(locality?: string, district?: string): string {
  const loc = (locality || '').trim();
  const dist = (district || '').trim();
  if (!loc) return dist;
  if (!dist) return loc;

  const SYNONYMS: Record<string, string[]> = {
    thiruvananthapuram: ['trivandrum'],
    ernakulam: ['kochi', 'cochin'],
    kozhikode: ['calicut'],
    alappuzha: ['alleppey'],
    palakkad: ['palghat'],
    kollam: ['quilon'],
    thrissur: ['trichur'],
    kannur: ['cannanore'],
  };

  const locLower = loc.toLowerCase();
  const cleanDistWords = dist.replace(/[()]/g, '').toLowerCase().split(/[\s,]+/);

  const hasDistrict = cleanDistWords.some((word) => {
    if (word.length > 3 && locLower.includes(word)) return true;
    const syns = SYNONYMS[word] || [];
    return syns.some((syn) => locLower.includes(syn));
  });

  if (hasDistrict) {
    return loc;
  }

  return `${loc}, ${dist}`;
}

// Format bystander relationship cleanly (e.g. "son" -> "Son", "son_daughter" -> "Son / Daughter")
function formatRelationship(rel?: string): string {
  if (!rel) return 'Family';
  const map: Record<string, string> = {
    son: 'Son',
    daughter: 'Daughter',
    son_daughter: 'Son / Daughter',
    spouse: 'Spouse',
    brother: 'Brother',
    sister: 'Sister',
    sibling: 'Brother / Sister',
    parent: 'Parent',
    relative: 'Relative',
    self: 'Self (Patient)',
  };
  const key = rel.toLowerCase().trim();
  if (map[key]) return map[key];
  return rel.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function DashboardRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('All Districts');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    contacted: 0,
    matched: 0,
    assigned: 0,
    completed: 0,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/requests');
      if (res?.data) {
        setRequests(res.data);
        if (res.meta?.stats) {
          setStats(res.meta.stats);
        }
      }
    } catch (err: any) {
      const isAuthError = err?.status === 401 || err?.status === 403;
      const msg = isAuthError
        ? 'Your login session is invalid or expired. Please log in again to view live requests.'
        : (err?.message || 'Unable to connect to care requests service.');
      setError(msg);
      // In standalone frontend or local test mode without running backend, load fallback requests
      const demoRequests = [
        {
          id: 'demo-req-1',
          referenceId: 'REQ-2026-894102',
          patientName: 'Mary Varghese',
          patientAge: '78',
          patientGender: 'female',
          patientCondition: 'Bedridden following hip fracture; needs 2-hourly turning and sponge bath.',
          mobilityStatus: 'bedridden',
          medicalEquipment: 'catheter',
          serviceType: 'bedridden_care',
          duration: '24_hours',
          engagementPeriod: 'ongoing',
          genderPreference: 'female',
          startDate: 'immediate',
          district: 'Ernakulam (Kochi)',
          locality: 'Kaloor, Kochi',
          contactName: 'Dr. Thomas Varghese',
          relationship: 'son',
          phone: '+919847012345',
          isWhatsapp: true,
          status: 'pending',
          source: 'public_form',
          createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        },
        {
          id: 'demo-req-2',
          referenceId: 'REQ-2026-512093',
          patientName: 'K. Ramanathan',
          patientAge: '82',
          patientGender: 'male',
          patientCondition: 'Mild Alzheimer’s; assistance required for mobility and medication compliance.',
          mobilityStatus: 'assisted',
          medicalEquipment: 'none',
          serviceType: 'dementia_care',
          duration: '12_day',
          engagementPeriod: 'ongoing',
          genderPreference: 'male',
          startDate: 'immediate',
          district: 'Thrissur',
          locality: 'East Fort, Thrissur',
          contactName: 'Suresh Kumar',
          relationship: 'son',
          phone: '+919847198765',
          isWhatsapp: true,
          status: 'contacted',
          source: 'public_form',
          createdAt: new Date(Date.now() - 140 * 60 * 1000).toISOString(),
        },
        {
          id: 'demo-req-3',
          referenceId: 'REQ-2026-304819',
          patientName: 'Lathika Pillai',
          patientAge: '69',
          patientGender: 'female',
          patientCondition: 'Post knee replacement recovery; physical therapy exercises and personal care.',
          mobilityStatus: 'assisted',
          medicalEquipment: 'none',
          serviceType: 'post_op',
          duration: '24_hours',
          engagementPeriod: '1_month',
          genderPreference: 'female',
          startDate: 'within_week',
          district: 'Thiruvananthapuram',
          locality: 'Pattom, Trivandrum',
          contactName: 'Anil Pillai',
          relationship: 'spouse',
          phone: '+919895012345',
          isWhatsapp: true,
          status: 'matched',
          source: 'public_form',
          createdAt: new Date(Date.now() - 480 * 60 * 1000).toISOString(),
        },
      ];

      setRequests(demoRequests);
      setStats({
        total: demoRequests.length,
        pending: demoRequests.filter((r) => r.status === 'pending').length,
        contacted: demoRequests.filter((r) => r.status === 'contacted').length,
        matched: demoRequests.filter((r) => r.status === 'matched').length,
        assigned: 0,
        completed: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleUpdateStatus = async (requestId: string, newStatus: string) => {
    setUpdatingId(requestId);
    try {
      await apiFetch(`/requests/${requestId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      showToast(`Request status updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      fetchRequests();
      if (selectedRequest && selectedRequest.id === requestId) {
        setSelectedRequest((prev: any) => ({ ...prev, status: newStatus }));
      }
    } catch {
      // Local fallback state update
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: newStatus } : r))
      );
      showToast(`Status updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      if (selectedRequest && selectedRequest.id === requestId) {
        setSelectedRequest((prev: any) => ({ ...prev, status: newStatus }));
      }
    } finally {
      setUpdatingId(null);
    }
  };

  // Filtered requests list
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      // Tab filter
      if (activeTab !== 'all' && req.status !== activeTab) {
        return false;
      }
      // District filter
      if (selectedDistrict !== 'All Districts' && !req.district.includes(selectedDistrict)) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = req.patientName?.toLowerCase().includes(q);
        const matchesContact = req.contactName?.toLowerCase().includes(q);
        const matchesPhone = req.phone?.includes(q);
        const matchesRef = req.referenceId?.toLowerCase().includes(q);
        const matchesDistrict = req.district?.toLowerCase().includes(q);
        if (!matchesName && !matchesContact && !matchesPhone && !matchesRef && !matchesDistrict) {
          return false;
        }
      }
      return true;
    });
  }, [requests, activeTab, selectedDistrict, searchQuery]);

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 'calc(75px + env(safe-area-inset-bottom, 0px))',
            right: '1rem',
            zIndex: 999,
            backgroundColor: '#0f766e',
            color: '#ffffff',
            padding: '0.75rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            border: '1px solid #14b8a6',
            fontSize: '0.85rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            maxWidth: 'calc(100vw - 2rem)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.85rem',
          marginBottom: '1.25rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
            <h1 style={{ fontSize: 'clamp(1.35rem, 3.5vw, 1.85rem)', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', margin: 0 }}>
              Care Requests
            </h1>
          </div>
          <p className="desktop-only" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Public website submissions and WhatsApp leads automatically synchronized with instant owner alerts.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            onClick={fetchRequests}
            className="btn-secondary"
            id="refresh-requests-btn"
            style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            title="Refresh requests"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>Refresh</span>
          </button>

          <Link
            href="/#request-form"
            target="_blank"
            className="btn-primary desktop-only"
            id="open-public-form-btn"
            style={{ padding: '0.55rem 1rem', fontSize: '0.825rem', gap: '0.45rem', whiteSpace: 'nowrap' }}
          >
            <span>Open Public Form</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Error Alert Banner */}
      {error && (
        <div
          role="alert"
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem 1.25rem',
            marginBottom: '1.25rem',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            fontSize: '0.875rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <span style={{ fontWeight: 600 }}>Notice: </span>
              <span>{error}</span>
            </div>
          </div>
          <button
            onClick={fetchRequests}
            className="btn-secondary"
            style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Stats Cards - Visible on desktop, hidden on mobile to prioritize incoming requests */}
      <div
        className="desktop-only"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        <div className="glass-card" style={{ padding: '1.25rem', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.825rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            Total Intake Enquiries
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Across all 14 Kerala districts
          </div>
        </div>

        <div
          className="glass-card"
          style={{
            padding: '1.25rem',
            borderLeft: '4px solid #f59e0b',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), #ffffff)',
            borderTop: '1px solid #e2e8f0',
            borderRight: '1px solid #e2e8f0',
            borderBottom: '1px solid #e2e8f0',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#b45309', fontSize: '0.825rem', fontWeight: 700, textTransform: 'uppercase' }}>
              Pending Coordinator Review
            </span>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#f59e0b',
                boxShadow: '0 0 8px rgba(245, 158, 11, 0.4)',
                display: 'inline-block',
              }}
            />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.25rem' }}>
            {stats.pending}
          </div>
          <div style={{ fontSize: '0.775rem', color: '#b45309', fontWeight: 600, marginTop: '0.25rem' }}>
            Awaiting staff review & matching
          </div>
        </div>

        <div
          className="glass-card"
          style={{
            padding: '1.25rem',
            borderLeft: '4px solid #0284c7',
            background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08), #ffffff)',
            borderTop: '1px solid #e2e8f0',
            borderRight: '1px solid #e2e8f0',
            borderBottom: '1px solid #e2e8f0',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div style={{ color: '#0369a1', fontSize: '0.825rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            Contacted & Discussing
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {stats.contacted}
          </div>
          <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            WhatsApp / Call initiated
          </div>
        </div>

        <div
          className="glass-card"
          style={{
            padding: '1.25rem',
            borderLeft: '4px solid #059669',
            background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.08), #ffffff)',
            borderTop: '1px solid #e2e8f0',
            borderRight: '1px solid #e2e8f0',
            borderBottom: '1px solid #e2e8f0',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div style={{ color: '#047857', fontSize: '0.825rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            Caregiver Matched & Active
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {stats.matched + stats.assigned}
          </div>
          <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Care requirements filled
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div
        className="glass-panel"
        style={{
          padding: '0.85rem 1rem',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        {/* Status Tabs */}
        <div
          className="mobile-scroll-x"
          style={{
            display: 'flex',
            flexWrap: 'nowrap',
            gap: '0.45rem',
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: '0.65rem',
          }}
        >
          {[
            { id: 'all', label: 'All Requests', count: stats.total },
            { id: 'pending', label: 'Pending', count: stats.pending },
            { id: 'contacted', label: 'Contacted', count: stats.contacted },
            { id: 'matched', label: 'Matched', count: stats.matched },
            { id: 'assigned', label: 'Assigned', count: stats.assigned },
            { id: 'completed', label: 'Completed', count: stats.completed },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                id={`filter-tab-${tab.id}`}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: isActive ? '1px solid #0d9488' : '1px solid #cbd5e1',
                  backgroundColor: isActive ? 'rgba(13, 148, 136, 0.12)' : '#ffffff',
                  color: isActive ? '#0f766e' : '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    padding: '0.1rem 0.45rem',
                    borderRadius: '9999px',
                    fontSize: '0.7rem',
                    backgroundColor: isActive ? '#0d9488' : '#f1f5f9',
                    color: isActive ? '#ffffff' : '#64748b',
                    fontWeight: 700,
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Location Select */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', alignItems: 'center', justifyContent: 'space-between', width: '100%', minWidth: 0 }}>
          <div style={{ position: 'relative', flex: '2 1 200px', minWidth: '150px' }}>
            <input
              type="text"
              id="search-requests-input"
              className="form-input"
              placeholder="Search Patient, Phone or Code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.3rem', fontSize: '0.825rem', width: '100%', boxSizing: 'border-box', height: '38px' }}
            />
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth="2"
              style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)' }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: '1 1 140px', minWidth: '130px' }}>
            <select
              id="district-filter-select"
              className="form-select"
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              style={{ width: '100%', fontSize: '0.825rem', padding: '0.45rem 0.65rem', height: '38px' }}
            >
              {KERALA_DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div
        className="glass-panel"
        style={{
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          border: '1px solid var(--border-card)',
        }}
      >
        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Loading intake requests...</div>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
            <h3 style={{ fontSize: '1.25rem', color: '#0f172a', marginBottom: '0.4rem' }}>
              No Care Requests Found
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
              {searchQuery || selectedDistrict !== 'All Districts' || activeTab !== 'all'
                ? 'No requests match your current filters. Try resetting search or status tab.'
                : 'No intake requests received yet. Submit a test inquiry via the public form.'}
            </p>
            <Link href="/#request-form" target="_blank" className="btn-primary" style={{ padding: '0.6rem 1.25rem' }}>
              Submit New Request Form
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="desktop-only" style={{ overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    color: 'var(--text-muted)',
                    fontSize: '0.775rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  <th style={{ padding: '0.9rem 1.25rem' }}>Ref Code</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Patient & Condition</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Service & Duration</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Location (Kerala)</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Family Contact</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Status</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req) => {
                  const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                  const timeAgoMinutes = Math.floor(
                    (Date.now() - new Date(req.createdAt).getTime()) / (1000 * 60)
                  );

                  return (
                    <tr
                      key={req.id}
                      id={`request-row-${req.referenceId}`}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        transition: 'background-color 0.2s ease',
                      }}
                      className="table-row-hover"
                    >
                      {/* Ref Code */}
                      <td style={{ padding: '1rem 1.25rem', verticalAlign: 'top' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color: 'var(--primary-400)',
                            fontSize: '0.85rem',
                            display: 'block',
                            marginBottom: '0.2rem',
                          }}
                        >
                          {req.referenceId}
                        </span>
                        <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                          {timeAgoMinutes < 60
                            ? `${timeAgoMinutes}m ago`
                            : `${Math.floor(timeAgoMinutes / 60)}h ago`}
                        </span>
                      </td>

                      {/* Patient Details */}
                      <td style={{ padding: '1rem 1.25rem', verticalAlign: 'top', maxWidth: '240px' }}>
                        <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.95rem' }}>
                          {req.patientName}
                          {req.patientAge ? (
                            <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.8rem', marginLeft: '0.4rem' }}>
                              ({req.patientAge} yrs, {req.patientGender})
                            </span>
                          ) : null}
                        </div>
                        <div style={{ marginTop: '0.3rem', display: 'flex', gap: '0.35rem' }}>
                          <span
                            style={{
                              fontSize: '0.675rem',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(255, 255, 255, 0.06)',
                              color: 'var(--text-secondary)',
                              textTransform: 'capitalize',
                            }}
                          >
                            {req.mobilityStatus}
                          </span>
                          {req.medicalEquipment && req.medicalEquipment !== 'none' && (
                            <span
                              style={{
                                fontSize: '0.675rem',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '4px',
                                backgroundColor: 'rgba(244, 63, 94, 0.1)',
                                color: '#fb7185',
                                border: '1px solid rgba(244, 63, 94, 0.25)',
                              }}
                            >
                              {req.medicalEquipment}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Service & Duration */}
                      <td style={{ padding: '1rem 1.25rem', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 500, color: '#ffffff' }}>
                          {SERVICE_LABELS[req.serviceType] || req.serviceType}
                        </div>
                        <div style={{ color: 'var(--primary-400)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                          {DURATION_LABELS[req.duration] || req.duration}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          Prefers: {req.genderPreference} caregiver
                        </div>
                      </td>

                      {/* Location */}
                      <td style={{ padding: '1rem 1.25rem', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 500, color: '#0f172a' }}>
                          {formatLocation(req.locality, req.district)}
                        </div>
                      </td>

                      {/* Family Contact */}
                      <td style={{ padding: '1rem 1.25rem', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 500, color: '#0f172a' }}>
                          {req.contactName} ({formatRelationship(req.relationship)})
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                          {req.phone}
                        </div>
                        <div style={{ marginTop: '0.4rem' }}>
                          <a
                            href={`https://wa.me/${req.phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(
                              req.contactName
                            )}%2C%20this%20is%20the%20Nurse%20Coordinator%20regarding%20your%20care%20request%20(${
                              req.referenceId
                            }).`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-whatsapp"
                            style={{
                              padding: '0.25rem 0.6rem',
                              fontSize: '0.75rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.969.585 1.761.895 2.796.896h.005c3.181 0 5.767-2.586 5.768-5.766.001-1.54-.597-2.988-1.686-4.077-1.089-1.089-2.537-1.688-4.077-1.688zm0-1.872c4.218 0 7.64 3.422 7.64 7.638 0 2.042-.796 3.962-2.242 5.408s-3.366 2.23-5.398 2.23h-.006c-1.31 0-2.597-.34-3.729-.984l-4.148 1.088 1.107-4.045c-.71-1.222-1.085-2.614-1.085-4.041 0-4.216 3.422-7.638 7.64-7.638zm-3.295 4.398c-.183-.406-.375-.414-.548-.422-.142-.006-.304-.006-.467-.006s-.427.061-.65.305c-.223.244-.853.833-.853 2.032 0 1.199.873 2.358.995 2.521.122.163 1.685 2.688 4.144 3.655 2.044.804 2.459.644 2.906.604.447-.041 1.442-.589 1.645-1.159.203-.569.203-1.057.142-1.159-.061-.102-.223-.163-.467-.285-.244-.122-1.442-.711-1.666-.793-.223-.081-.386-.122-.548.122-.163.244-.63 1.159-.772 1.321-.142.163-.284.183-.528.061-.244-.122-1.03-.38-1.963-1.211-.726-.648-1.216-1.449-1.358-1.693-.142-.244-.015-.376.107-.498.11-.11.244-.285.366-.427.122-.142.163-.244.244-.406.081-.163.041-.305-.02-.427-.061-.122-.534-1.322-.743-1.782z" />
                            </svg>
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '1rem 1.25rem', verticalAlign: 'top' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.3rem 0.7rem',
                            borderRadius: '9999px',
                            backgroundColor: cfg.bg,
                            border: `1px solid ${cfg.border}`,
                            color: cfg.color,
                            fontSize: '0.775rem',
                            fontWeight: 600,
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: cfg.dot,
                            }}
                          />
                          {cfg.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '1rem 1.25rem', verticalAlign: 'top', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-end' }}>
                          <button
                            onClick={() => setSelectedRequest(req)}
                            className="btn-secondary"
                            id={`view-details-${req.referenceId}`}
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.775rem' }}
                          >
                            Details & Notes
                          </button>

                          {req.status === 'pending' && (
                            <button
                              onClick={() => handleUpdateStatus(req.id, 'contacted')}
                              disabled={updatingId === req.id}
                              className="btn-primary"
                              id={`mark-contacted-${req.referenceId}`}
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                            >
                              Mark Contacted
                            </button>
                          )}

                          {req.status === 'contacted' && (
                            <button
                              onClick={() => handleUpdateStatus(req.id, 'matched')}
                              disabled={updatingId === req.id}
                              className="btn-primary"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                            >
                              Mark Matched
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Touch Cards Feed */}
          <div
            className="show-on-mobile-block"
            id="mobile-requests-feed"
            style={{ padding: '0.85rem 0.85rem 5.5rem 0.85rem', width: '100%', minWidth: 0, boxSizing: 'border-box' }}
          >
            {filteredRequests.map((req) => {
              const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG['pending'];
              const timeAgoMinutes = Math.floor(
                (Date.now() - new Date(req.createdAt).getTime()) / (1000 * 60)
              );
              return (
                <div
                  key={`mobile-${req.id}`}
                  id={`mobile-request-card-${req.referenceId}`}
                  className="glass-card"
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-lg)',
                    border: `1px solid ${cfg.border}`,
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
                  {/* Header: Ref ID, Timestamp & Status pill */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0, overflow: 'hidden' }}>
                      <span
                        style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0d9488', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                        title={req.referenceId}
                      >
                        {formatRefId(req.referenceId)}
                      </span>
                      <span style={{ fontSize: '0.725rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        • {timeAgoMinutes < 60
                          ? `${timeAgoMinutes}m ago`
                          : `${Math.floor(timeAgoMinutes / 60)}h ago`}
                      </span>
                    </div>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '9999px',
                        backgroundColor: cfg.bg,
                        border: `1px solid ${cfg.border}`,
                        color: cfg.color,
                        fontSize: '0.725rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: cfg.dot }} />
                      {cfg.label}
                    </span>
                  </div>

                  {/* Patient & Care Need */}
                  <div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                      {req.patientName} {req.patientAge ? `(${req.patientAge}y, ${req.patientGender})` : ''}
                    </div>
                    <div style={{ fontSize: '0.825rem', color: '#0f766e', marginTop: '0.2rem', fontWeight: 600 }}>
                      {(SERVICE_LABELS[req.serviceType] || req.serviceType)} • {(DURATION_LABELS[req.duration] || req.duration)}
                    </div>
                  </div>

                  {/* Location & Contact Info */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                      fontSize: '0.8rem',
                      color: '#475569',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      padding: '0.6rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span>📍</span>
                      <span style={{ color: '#0f172a', fontWeight: 600 }}>{formatLocation(req.locality, req.district)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span>👤</span>
                      <span>{req.contactName} ({formatRelationship(req.relationship)}) • {req.phone}</span>
                    </div>
                  </div>

                  {/* 1-Tap Action Buttons: Direct Phone Call & WhatsApp */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <a
                      href={`tel:${req.phone.replace(/[^0-9+]/g, '')}`}
                      id={`mobile-call-${req.referenceId}`}
                      style={{
                        padding: '0.55rem',
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        color: '#0369a1',
                        backgroundColor: 'rgba(2, 132, 199, 0.12)',
                        border: '1px solid rgba(2, 132, 199, 0.35)',
                        borderRadius: 'var(--radius-md)',
                        textDecoration: 'none',
                        minHeight: '44px',
                      }}
                    >
                      <span>📞 Call Contact</span>
                    </a>

                    <a
                      href={`https://wa.me/${req.phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(
                        req.contactName
                      )}%2C%20this%20is%20the%20Nurse%20Coordinator%20regarding%20your%20care%20request%20(${
                        req.referenceId
                      }).`}
                      target="_blank"
                      rel="noreferrer"
                      id={`mobile-wa-${req.referenceId}`}
                      style={{
                        padding: '0.55rem',
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        color: '#ffffff',
                        backgroundColor: '#16a34a',
                        border: '1px solid #22c55e',
                        borderRadius: 'var(--radius-md)',
                        textDecoration: 'none',
                        minHeight: '44px',
                        boxShadow: '0 2px 8px rgba(34, 197, 94, 0.25)',
                      }}
                    >
                      <span>💬 Chat on WhatsApp</span>
                    </a>
                  </div>

                  {/* Secondary Actions: Details & Matching */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => setSelectedRequest(req)}
                      id={`mobile-details-${req.referenceId}`}
                      className="btn-secondary"
                      style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', minHeight: '40px' }}
                    >
                      View Details & History
                    </button>

                    {req.status === 'pending' && (
                      <button
                        onClick={() => handleUpdateStatus(req.id, 'contacted')}
                        disabled={updatingId === req.id}
                        className="btn-primary"
                        id={`mobile-contacted-${req.referenceId}`}
                        style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', minHeight: '40px' }}
                      >
                        Mark Contacted
                      </button>
                    )}

                    {(req.status === 'contacted' || req.status === 'matched') && (
                      <Link
                        href={`/dashboard/matching?requestId=${req.id}&service=${req.serviceType}&district=${encodeURIComponent(
                          req.district
                        )}`}
                        className="btn-primary"
                        style={{
                          flex: 1,
                          padding: '0.5rem',
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.3rem',
                          minHeight: '40px',
                          textDecoration: 'none',
                        }}
                      >
                        <span>⚡ Match Nurse</span>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      </div>

      {/* Details Slide-over Drawer */}
      {selectedRequest && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 100,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setSelectedRequest(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '540px',
              height: '100%',
              backgroundColor: '#ffffff',
              borderLeft: '1px solid #e2e8f0',
              padding: '2rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              boxShadow: '-10px 0 30px rgba(15, 23, 42, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
            className="animate-fade-in"
          >
            {/* Drawer Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
              <div>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary-600)', fontSize: '0.9rem' }}>
                  {selectedRequest.referenceId}
                </span>
                <h2 style={{ fontSize: '1.4rem', color: '#0f172a', marginTop: '0.2rem' }}>
                  {selectedRequest.patientName}
                </h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Intake received: {new Date(selectedRequest.createdAt).toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  color: 'var(--text-muted)',
                  fontSize: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                &times;
              </button>
            </div>

            {/* Quick Status Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</div>
                <div style={{ fontWeight: 600, color: STATUS_CONFIG[selectedRequest.status]?.color || '#0f172a' }}>
                  {STATUS_CONFIG[selectedRequest.status]?.label || selectedRequest.status}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {selectedRequest.status !== 'contacted' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedRequest.id, 'contacted')}
                    className="btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                  >
                    Mark Contacted
                  </button>
                )}
                {selectedRequest.status !== 'matched' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedRequest.id, 'matched')}
                    className="btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                  >
                    Mark Matched
                  </button>
                )}
              </div>
            </div>

            {/* Clinical & Care Requirements */}
            <div>
              <h4 style={{ fontSize: '0.9rem', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
                Care Program & Requirements
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Service:</span>
                  <strong style={{ color: '#0f172a' }}>{SERVICE_LABELS[selectedRequest.serviceType] || selectedRequest.serviceType}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Shift / Schedule:</span>
                  <strong style={{ color: 'var(--primary-600)' }}>{DURATION_LABELS[selectedRequest.duration] || selectedRequest.duration}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Start Date:</span>
                  <span style={{ color: '#0f172a' }}>{selectedRequest.startDate}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Gender Preference:</span>
                  <span style={{ color: '#0f172a', textTransform: 'capitalize' }}>{selectedRequest.genderPreference}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Mobility Status:</span>
                  <span style={{ color: '#0f172a', textTransform: 'capitalize' }}>{selectedRequest.mobilityStatus}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Medical Equipment:</span>
                  <span style={{ color: selectedRequest.medicalEquipment !== 'none' ? '#dc2626' : 'var(--text-secondary)' }}>
                    {selectedRequest.medicalEquipment || 'None'}
                  </span>
                </div>
              </div>
            </div>

            {/* Clinical Condition Notes */}
            {selectedRequest.patientCondition && (
              <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.775rem', color: '#0d9488', marginBottom: '0.35rem', fontWeight: 700 }}>
                  PATIENT CONDITION & DIAGNOSIS
                </div>
                <p style={{ color: '#334155', fontSize: '0.875rem', lineHeight: 1.5, margin: 0 }}>
                  {selectedRequest.patientCondition}
                </p>
              </div>
            )}

            {/* Special Instructions Notes */}
            {selectedRequest.notes && (
              <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.775rem', color: '#0d9488', marginBottom: '0.35rem', fontWeight: 700 }}>
                  SPECIAL CARE INSTRUCTIONS
                </div>
                <p style={{ color: '#334155', fontSize: '0.875rem', lineHeight: 1.5, margin: 0 }}>
                  {selectedRequest.notes}
                </p>
              </div>
            )}

            {/* Family Contact & WhatsApp */}
            <div>
              <h4 style={{ fontSize: '0.9rem', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
                Primary Family Contact
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.875rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Name:</span>
                  <strong style={{ color: '#0f172a' }}>{selectedRequest.contactName} ({formatRelationship(selectedRequest.relationship)})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Phone / Mobile:</span>
                  <strong style={{ color: 'var(--primary-600)' }}>{selectedRequest.phone}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Location:</span>
                  <span style={{ color: '#0f172a' }}>{formatLocation(selectedRequest.locality, selectedRequest.district)}</span>
                </div>
              </div>

              <a
                href={`https://wa.me/${selectedRequest.phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(
                  selectedRequest.contactName
                )}%2C%20this%20is%20the%20Nurse%20Coordinator%20regarding%20your%20care%20request%20(${
                  selectedRequest.referenceId
                }).`}
                target="_blank"
                rel="noreferrer"
                className="btn-whatsapp"
                style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
              >
                <span>Direct WhatsApp Chat with Family</span>
              </a>
            </div>

            {/* Customer CRM Integration */}
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Customer CRM Record
              </div>
              {selectedRequest.customerId || selectedRequest.customer?.id ? (
                <Link
                  id="btn-view-customer-crm"
                  href={`/dashboard/customers/${selectedRequest.customerId || selectedRequest.customer?.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    backgroundColor: 'rgba(13, 148, 136, 0.12)',
                    border: '1px solid rgba(13, 148, 136, 0.35)',
                    color: '#0f766e',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  <span>👤</span> View Full Customer Detail & Caregiver Assignment
                </Link>
              ) : (
                <button
                  id="btn-convert-to-customer"
                  onClick={async () => {
                    try {
                      const res = await apiFetch(`/customers/from-request/${selectedRequest.id}`, { method: 'POST' });
                      if (res?.data?.id) {
                        window.location.href = `/dashboard/customers/${res.data.id}`;
                      }
                    } catch (e: any) {
                      showToast(`Conversion failed: ${e.message}`);
                    }
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    backgroundColor: 'rgba(2, 132, 199, 0.1)',
                    border: '1px solid rgba(2, 132, 199, 0.3)',
                    color: '#0284c7',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <span>➕</span> Onboard as Active Customer CRM Account
                </button>
              )}
            </div>

            {/* Smart Matching Engine CTA */}
            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'rgba(20, 184, 166, 0.08)',
                border: '1px solid rgba(20, 184, 166, 0.25)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                Ready to Match a Caregiver?
              </div>
              <p style={{ color: '#475569', fontSize: '0.825rem', marginBottom: '1rem' }}>
                Run spatial proximity matching to find certified attendants in {selectedRequest.district}.
              </p>
              <Link
                href={`/dashboard/matching?requestId=${selectedRequest.id}`}
                id="btn-match-caregiver"
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '0.65rem' }}
              >
                🎯 Match Available Caregivers (Smart Engine)
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
