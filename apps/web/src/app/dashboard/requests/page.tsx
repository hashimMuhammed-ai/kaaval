'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../../utils/api';

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  pending: {
    label: 'Pending Review',
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
    label: 'Caregiver Matched',
    color: '#a78bfa',
    bg: 'rgba(167, 139, 250, 0.15)',
    border: 'rgba(167, 139, 250, 0.35)',
    dot: '#a78bfa',
  },
  assigned: {
    label: 'Assigned / Active',
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

const KERALA_DISTRICTS = [
  'All Districts',
  'Ernakulam (Kochi)',
  'Thiruvananthapuram',
  'Thrissur',
  'Kozhikode',
  'Kottayam',
  'Kollam',
  'Palakkad',
  'Malappuram',
  'Alappuzha',
  'Kannur',
  'Pathanamthitta',
  'Idukki',
  'Kasaragod',
  'Wayanad',
];

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
    } catch {
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
          relationship: 'son_daughter',
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
          relationship: 'son_daughter',
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
            bottom: '2rem',
            right: '2rem',
            zIndex: 999,
            backgroundColor: '#0f766e',
            color: '#ffffff',
            padding: '0.85rem 1.4rem',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            border: '1px solid #14b8a6',
            fontSize: '0.9rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
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
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', margin: 0 }}>
              Client Care Requests & Intake
            </h1>
            <span className="badge badge-teal" style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}>
              60-Min SLA Active
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
            Public website submissions and WhatsApp leads automatically synchronized with instant owner alerts.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <button
            onClick={fetchRequests}
            className="btn-secondary"
            id="refresh-requests-btn"
            style={{ padding: '0.6rem 1rem', fontSize: '0.875rem' }}
            title="Refresh requests"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>Refresh</span>
          </button>

          <Link
            href="/#request-form"
            target="_blank"
            className="btn-primary"
            id="open-public-form-btn"
            style={{ padding: '0.6rem 1.15rem', fontSize: '0.875rem', gap: '0.5rem' }}
          >
            <span>Open Public Form</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.825rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            Total Intake Enquiries
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>
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
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(11, 17, 32, 0.6))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#fbbf24', fontSize: '0.825rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Pending Coordinator Review
            </span>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#f59e0b',
                boxShadow: '0 0 8px #f59e0b',
                display: 'inline-block',
              }}
            />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', marginTop: '0.25rem' }}>
            {stats.pending}
          </div>
          <div style={{ fontSize: '0.775rem', color: '#fbbf24', marginTop: '0.25rem' }}>
            Needs caregiver matching within 60 mins
          </div>
        </div>

        <div
          className="glass-card"
          style={{
            padding: '1.25rem',
            borderLeft: '4px solid #38bdf8',
            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.08), rgba(11, 17, 32, 0.6))',
          }}
        >
          <div style={{ color: '#38bdf8', fontSize: '0.825rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            Contacted & Discussing
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>
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
            borderLeft: '4px solid #10b981',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(11, 17, 32, 0.6))',
          }}
        >
          <div style={{ color: '#34d399', fontSize: '0.825rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            Caregiver Matched & Active
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>
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
          padding: '1.25rem',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {/* Status Tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.85rem' }}>
          {[
            { id: 'all', label: 'All Requests', count: stats.total },
            { id: 'pending', label: 'Pending Review', count: stats.pending },
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
                  padding: '0.45rem 0.95rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: isActive ? '1px solid var(--primary-500)' : '1px solid transparent',
                  backgroundColor: isActive ? 'rgba(20, 184, 166, 0.18)' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  transition: 'all 0.2s ease',
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    padding: '0.15rem 0.45rem',
                    borderRadius: '9999px',
                    fontSize: '0.725rem',
                    backgroundColor: isActive ? 'var(--primary-600)' : 'rgba(255, 255, 255, 0.08)',
                    color: '#ffffff',
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Location Select */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '260px', maxWidth: '480px' }}>
            <input
              type="text"
              id="search-requests-input"
              className="form-input"
              placeholder="Search by Patient, Contact, Phone or Reference Code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.5rem', fontSize: '0.875rem' }}
            />
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth="2"
              style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <label htmlFor="district-filter-select" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              District:
            </label>
            <select
              id="district-filter-select"
              className="form-select"
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              style={{ minWidth: '180px', fontSize: '0.85rem', padding: '0.5rem 0.85rem' }}
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
            <h3 style={{ fontSize: '1.25rem', color: '#ffffff', marginBottom: '0.4rem' }}>
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
          <div style={{ overflowX: 'auto' }}>
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
                  const isSlaBreached = req.status === 'pending' && timeAgoMinutes > 60;

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
                        {req.status === 'pending' && (
                          <div style={{ marginTop: '0.35rem' }}>
                            <span
                              style={{
                                fontSize: '0.675rem',
                                padding: '0.15rem 0.4rem',
                                borderRadius: '4px',
                                backgroundColor: isSlaBreached
                                  ? 'rgba(239, 68, 68, 0.15)'
                                  : 'rgba(245, 158, 11, 0.15)',
                                color: isSlaBreached ? '#f87171' : '#fbbf24',
                                border: isSlaBreached
                                  ? '1px solid rgba(239, 68, 68, 0.3)'
                                  : '1px solid rgba(245, 158, 11, 0.3)',
                                fontWeight: 600,
                              }}
                            >
                              {isSlaBreached ? '⚠️ SLA Overdue' : '⏱ SLA < 60m'}
                            </span>
                          </div>
                        )}
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
                        {req.patientCondition && (
                          <div
                            style={{
                              fontSize: '0.775rem',
                              color: 'var(--text-secondary)',
                              marginTop: '0.25rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={req.patientCondition}
                          >
                            {req.patientCondition}
                          </div>
                        )}
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
                        <div style={{ fontWeight: 500, color: '#ffffff' }}>
                          {req.district}
                        </div>
                        {req.locality && (
                          <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                            {req.locality}
                          </div>
                        )}
                      </td>

                      {/* Family Contact */}
                      <td style={{ padding: '1rem 1.25rem', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 500, color: '#ffffff' }}>
                          {req.contactName}
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
              backgroundColor: 'var(--bg-card)',
              borderLeft: '1px solid var(--border-card)',
              padding: '2rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
            }}
            onClick={(e) => e.stopPropagation()}
            className="animate-fade-in"
          >
            {/* Drawer Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem' }}>
              <div>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary-400)', fontSize: '0.9rem' }}>
                  {selectedRequest.referenceId}
                </span>
                <h2 style={{ fontSize: '1.4rem', color: '#ffffff', marginTop: '0.2rem' }}>
                  {selectedRequest.patientName}
                </h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Intake received: {new Date(selectedRequest.createdAt).toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  padding: '0.25rem',
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
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</div>
                <div style={{ fontWeight: 600, color: STATUS_CONFIG[selectedRequest.status]?.color || '#ffffff' }}>
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
              <h4 style={{ fontSize: '0.9rem', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
                Care Program & Requirements
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Service:</span>
                  <strong style={{ color: '#ffffff' }}>{SERVICE_LABELS[selectedRequest.serviceType] || selectedRequest.serviceType}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Shift / Schedule:</span>
                  <strong style={{ color: 'var(--primary-400)' }}>{DURATION_LABELS[selectedRequest.duration] || selectedRequest.duration}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Start Date:</span>
                  <span style={{ color: '#ffffff' }}>{selectedRequest.startDate}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Gender Preference:</span>
                  <span style={{ color: '#ffffff', textTransform: 'capitalize' }}>{selectedRequest.genderPreference}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Mobility Status:</span>
                  <span style={{ color: '#ffffff', textTransform: 'capitalize' }}>{selectedRequest.mobilityStatus}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Medical Equipment:</span>
                  <span style={{ color: selectedRequest.medicalEquipment !== 'none' ? '#f43f5e' : 'var(--text-secondary)' }}>
                    {selectedRequest.medicalEquipment || 'None'}
                  </span>
                </div>
              </div>
            </div>

            {/* Clinical Condition Notes */}
            {selectedRequest.patientCondition && (
              <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                  PATIENT CONDITION & DIAGNOSIS
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5, margin: 0 }}>
                  {selectedRequest.patientCondition}
                </p>
              </div>
            )}

            {/* Special Instructions Notes */}
            {selectedRequest.notes && (
              <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                  SPECIAL CARE INSTRUCTIONS
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5, margin: 0 }}>
                  {selectedRequest.notes}
                </p>
              </div>
            )}

            {/* Family Contact & WhatsApp */}
            <div>
              <h4 style={{ fontSize: '0.9rem', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
                Primary Family Contact
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.875rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Name:</span>
                  <strong style={{ color: '#ffffff' }}>{selectedRequest.contactName} ({selectedRequest.relationship})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Phone / Mobile:</span>
                  <strong style={{ color: 'var(--primary-400)' }}>{selectedRequest.phone}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Location:</span>
                  <span style={{ color: '#ffffff' }}>{selectedRequest.district}</span>
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
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
                CUSTOMER CRM RECORD
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
                    backgroundColor: 'rgba(20, 184, 166, 0.15)',
                    border: '1px solid rgba(20, 184, 166, 0.4)',
                    color: '#2dd4bf',
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
                    backgroundColor: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    color: '#38bdf8',
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
                marginTop: 'auto',
                padding: '1.25rem',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'rgba(20, 184, 166, 0.08)',
                border: '1px solid rgba(20, 184, 166, 0.3)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.35rem' }}>
                Ready to Match a Caregiver?
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1rem' }}>
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
