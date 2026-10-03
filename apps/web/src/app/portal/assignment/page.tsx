'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../../utils/api';

interface CustomerInfo {
  id: string;
  patientName: string;
  fullName?: string;
  patientAge?: string;
  patientGender?: string;
  patientCondition?: string;
  mobilityStatus?: string;
  medicalEquipment?: string;
  primaryContactName?: string;
  relationship?: string;
  phone?: string;
  alternatePhone?: string;
  address?: string;
  careAddress?: string;
  locality?: string;
  district?: string;
  city?: string;
  pincode?: string;
  serviceType?: string;
  duration?: string;
  engagementPeriod?: string;
  notes?: string;
}

interface AssignmentData {
  id: string;
  status: string;
  startDate: string;
  endDate?: string | null;
  billingRate?: number;
  caregiverDailyRate?: number;
  notes?: string | null;
  customer?: CustomerInfo;
  caregiver?: {
    id: string;
    fullName: string;
    phone: string;
    dailyRate?: number;
  };
  request?: {
    serviceType?: string;
    notes?: string;
  };
}

export default function CaregiverAssignmentPage() {
  const [activeAssignment, setActiveAssignment] = useState<AssignmentData | null>(null);
  const [assignmentHistory, setAssignmentHistory] = useState<AssignmentData[]>([]);
  const [viewTab, setViewTab] = useState<'active' | 'history'>('active');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // 1. Fetch current active assignment
        try {
          const activeRes = await apiFetch<{ success: boolean; data: AssignmentData }>('/assignments/current');
          if (activeRes?.data) {
            setActiveAssignment(activeRes.data);
          }
        } catch {
          // Handled gracefully as null
        }

        // 2. Fetch assignment history (caregiver's assignments)
        try {
          const historyRes = await apiFetch<{ success: boolean; data: AssignmentData[] }>('/assignments');
          if (historyRes?.data && Array.isArray(historyRes.data)) {
            setAssignmentHistory(historyRes.data);
          }
        } catch {
          // Handled gracefully
        }
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const customer = activeAssignment?.customer;
  const patientDisplayName = customer?.patientName || customer?.fullName || 'Assigned Patient';
  const serviceTypeDisplayName = customer?.serviceType || activeAssignment?.request?.serviceType || 'Home Care';
  const baseAddress = customer?.address || customer?.careAddress;
  const includeLocality = customer?.locality && (!baseAddress || !baseAddress.toLowerCase().includes(customer.locality.toLowerCase()));
  const includeCity = customer?.city && (!baseAddress || !baseAddress.toLowerCase().includes(customer.city.toLowerCase()));
  const includeDistrict = customer?.district && (!baseAddress || !baseAddress.toLowerCase().includes(customer.district.toLowerCase()));

  const addressParts = [
    baseAddress,
    includeLocality ? customer?.locality : null,
    includeCity ? customer?.city : null,
    includeDistrict ? customer?.district : null,
    customer?.pincode ? `PIN: ${customer.pincode}` : '',
  ].filter(Boolean);

  const fullAddress = addressParts.length > 0
    ? addressParts.join(', ')
    : 'Address on file with agency coordinator';

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    fullAddress !== 'Address on file with agency coordinator'
      ? `${fullAddress}, Kerala`
      : `${customer?.district || 'Kochi'}, Kerala`
  )}`;

  const cleanPhone = customer?.phone ? customer.phone.replace(/[^0-9]/g, '') : '';
  const whatsAppUrl = cleanPhone
    ? `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`}?text=Hello%2C%20I%20am%20your%20assigned%20caregiver%20from%20the%20agency.`
    : '#';

  const handleCopyAddress = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(fullAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getDaysElapsed = (startDateStr: string) => {
    try {
      const start = new Date(startDateStr);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return 1;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>
            My Duty Assignment
          </h1>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Patient care requirements, home location & schedule
          </p>
        </div>
        <Link
          href="/portal"
          id="back-to-portal-btn"
          style={{
            fontSize: '0.78rem',
            color: 'var(--primary-400)',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.35rem 0.65rem',
            backgroundColor: 'rgba(20, 184, 166, 0.1)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(20, 184, 166, 0.25)',
          }}
        >
          <span>&larr;</span>
          <span>Home</span>
        </Link>
      </div>

      {/* Tab Switcher (Active Duty vs Past Duties) */}
      <div
        id="assignment-tabs"
        style={{
          display: 'flex',
          backgroundColor: '#f1f5f9',
          borderRadius: 'var(--radius-lg)',
          padding: '0.25rem',
          border: '1px solid #e2e8f0',
        }}
      >
        <button
          id="tab-active-duty"
          onClick={() => setViewTab('active')}
          style={{
            flex: 1,
            padding: '0.55rem',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            backgroundColor: viewTab === 'active' ? 'var(--primary-600)' : 'transparent',
            color: viewTab === 'active' ? '#ffffff' : '#64748b',
            fontWeight: 700,
            fontSize: '0.825rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: viewTab === 'active' ? '0 2px 6px rgba(13, 148, 136, 0.25)' : 'none',
          }}
        >
          Active Duty {activeAssignment ? '●' : ''}
        </button>

        <button
          id="tab-duty-history"
          onClick={() => setViewTab('history')}
          style={{
            flex: 1,
            padding: '0.55rem',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            backgroundColor: viewTab === 'history' ? 'var(--primary-600)' : 'transparent',
            color: viewTab === 'history' ? '#ffffff' : '#64748b',
            fontWeight: 700,
            fontSize: '0.825rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: viewTab === 'history' ? '0 2px 6px rgba(13, 148, 136, 0.25)' : 'none',
          }}
        >
          Duty History ({assignmentHistory.length})
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏳</div>
          <div style={{ fontSize: '0.875rem' }}>Retrieving care assignment details...</div>
        </div>
      ) : viewTab === 'active' ? (
        activeAssignment ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Main Active Duty Card */}
            <section
              id="assignment-hero-card"
              className="glass-panel"
              style={{
                padding: '1.35rem',
                border: '1px solid #bfdbfe',
                background: 'linear-gradient(135deg, #ffffff, #eff6ff)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      color: '#2563EB',
                      textTransform: 'uppercase',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      marginBottom: '0.2rem',
                    }}
                  >
                    Patient Care In-Progress
                  </div>
                  <h2
                    id="patient-name-title"
                    style={{
                      fontSize: '1.35rem',
                      fontWeight: 800,
                      color: '#172033',
                      lineHeight: 1.25,
                    }}
                  >
                    {patientDisplayName}
                  </h2>
                  {(customer?.patientAge || customer?.patientGender) && (
                    <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '0.25rem' }}>
                      {customer?.patientAge ? `${customer.patientAge} yrs` : ''}
                      {customer?.patientAge && customer?.patientGender ? ' • ' : ''}
                      {customer?.patientGender && customer.patientGender !== 'unspecified'
                        ? customer.patientGender.charAt(0).toUpperCase() + customer.patientGender.slice(1)
                        : ''}
                    </div>
                  )}
                </div>

                <div
                  id="duty-status-badge"
                  style={{
                    backgroundColor: '#eff6ff',
                    color: '#2563EB',
                    border: '1px solid #bfdbfe',
                    padding: '0.35rem 0.75rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      backgroundColor: '#2563EB',
                      boxShadow: '0 0 6px rgba(37, 99, 235, 0.4)',
                    }}
                  />
                  <span>Active Duty</span>
                </div>
              </div>

              {/* Quick Specs Pill Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.65rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid #e2e8f0',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#475569' }}>Service Scope</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#172033', marginTop: '0.1rem' }}>
                    {serviceTypeDisplayName}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.7rem', color: '#475569' }}>Daily Rate</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#15803D', marginTop: '0.1rem' }}>
                    ₹{activeAssignment.caregiverDailyRate || activeAssignment.caregiver?.dailyRate || 1200} / day
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.7rem', color: '#475569' }}>Duty Duration</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#172033', marginTop: '0.1rem' }}>
                    Day {getDaysElapsed(activeAssignment.startDate)} on duty
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.7rem', color: '#475569' }}>Engagement</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#172033', marginTop: '0.1rem' }}>
                    {customer?.engagementPeriod || 'Ongoing'}
                  </div>
                </div>
              </div>
            </section>

            {/* Care Location & Map Navigation Card */}
            <section
              id="assignment-location-card"
              className="glass-panel"
              style={{
                padding: '1.25rem',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    backgroundColor: '#eff6ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2563EB',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#172033' }}>
                  Care Location & Address
                </h3>
              </div>

              <p
                id="care-address-text"
                style={{
                  fontSize: '0.85rem',
                  color: '#172033',
                  lineHeight: 1.45,
                  marginBottom: '1rem',
                }}
              >
                📍 {fullAddress}
              </p>

              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <a
                  id="open-maps-btn"
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    padding: '0.6rem 0.85rem',
                    background: 'linear-gradient(135deg, #3b82f6, #2563EB)',
                    color: '#ffffff',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    boxShadow: '0 2px 10px rgba(37, 99, 235, 0.25)',
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <polygon points="3 11 22 2 13 21 11 13 3 11" />
                  </svg>
                  <span>Open in Maps</span>
                </a>

                <button
                  id="copy-address-btn"
                  type="button"
                  onClick={handleCopyAddress}
                  style={{
                    padding: '0.6rem 0.85rem',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #cbd5e1',
                    color: copied ? '#15803D' : '#475569',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </section>

            {/* Family & Emergency Contact Card */}
            <section
              id="assignment-contact-card"
              className="glass-panel"
              style={{
                padding: '1.25rem',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    backgroundColor: '#eff6ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2563EB',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#172033' }}>
                  Family & Primary Contact
                </h3>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <div id="primary-contact-name" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#172033' }}>
                    {customer?.primaryContactName || 'Family Representative'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                    {customer?.relationship ? `Relationship: ${customer.relationship}` : 'Emergency Guardian'}
                  </div>
                  {customer?.phone && (
                    <div style={{ fontSize: '0.85rem', color: '#2563EB', marginTop: '0.2rem', fontWeight: 600 }}>
                      📞 {customer.phone}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.65rem' }}>
                {customer?.phone && (
                  <a
                    id="call-family-btn"
                    href={`tel:${customer.phone}`}
                    style={{
                      flex: 1,
                      padding: '0.6rem',
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      color: '#2563EB',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    <span>Call Family</span>
                  </a>
                )}

                {cleanPhone && (
                  <a
                    id="whatsapp-family-btn"
                    href={whatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex: 1,
                      padding: '0.6rem',
                      background: '#f0fdfa',
                      border: '1px solid #ccfbf1',
                      color: '#0F766E',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.316 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.818-.981z" />
                    </svg>
                    <span>WhatsApp</span>
                  </a>
                )}
              </div>
            </section>

            {/* Patient Medical & Mobility Requirements Card */}
            <section
              id="assignment-medical-card"
              className="glass-panel"
              style={{
                padding: '1.25rem',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    backgroundColor: '#fee2e2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#DC2626',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#172033' }}>
                  Medical & Mobility Profile
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#475569' }}>Condition / Diagnosis</div>
                  <div id="patient-condition-text" style={{ fontSize: '0.85rem', color: '#172033', marginTop: '0.15rem' }}>
                    {customer?.patientCondition || 'Post-operative recovery / Geriatric assistance'}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#475569' }}>Mobility Status</div>
                    <div style={{ fontSize: '0.825rem', color: '#2563EB', fontWeight: 600, marginTop: '0.15rem' }}>
                      {customer?.mobilityStatus ? customer.mobilityStatus.replace('_', ' ') : 'Assisted'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#475569' }}>Equipment Needed</div>
                    <div style={{ fontSize: '0.825rem', color: '#475569', fontWeight: 600, marginTop: '0.15rem' }}>
                      {customer?.medicalEquipment || 'Standard Nursing'}
                    </div>
                  </div>
                </div>

                {(activeAssignment.notes || customer?.notes) && (
                  <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #e2e8f0', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.7rem', color: '#475569', textTransform: 'uppercase' }}>
                      Special Duty Notes
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '0.2rem', lineHeight: 1.4 }}>
                      {activeAssignment.notes || customer?.notes}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Schedule & Duration Card */}
            <section
              id="assignment-schedule-card"
              className="glass-panel"
              style={{
                padding: '1.25rem',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    backgroundColor: '#fffbeb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#D97706',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#172033' }}>
                  Duty Schedule & Timeline
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#475569' }}>Start Date</div>
                  <div id="duty-start-date" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#172033', marginTop: '0.15rem' }}>
                    {activeAssignment.startDate ? new Date(activeAssignment.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Active'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.72rem', color: '#475569' }}>Target Completion</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#2563EB', marginTop: '0.15rem' }}>
                    {activeAssignment.endDate ? new Date(activeAssignment.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Ongoing / Open'}
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : (
          /* Standby State (When no assignment is active) */
          <div
            id="assignment-standby-card"
            className="glass-panel"
            style={{
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              border: '1px solid #ccfbf1',
              background: 'linear-gradient(135deg, #ffffff, #f0fdfa)',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(20, 184, 166, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0d9488',
                boxShadow: '0 0 20px rgba(20, 184, 166, 0.15)',
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>

            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#172033', marginBottom: '0.35rem' }}>
                You Are Currently on Standby
              </h2>
              <p style={{ fontSize: '0.825rem', color: '#475569', lineHeight: 1.5, maxWidth: '340px' }}>
                Your profile is active and available for matching. Your agency coordinator will allocate your next care assignment and dispatch details via WhatsApp.
              </p>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: '#f0fdf4',
                color: '#15803D',
                border: '1px solid #bbf7d0',
                padding: '0.35rem 0.85rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.78rem',
                fontWeight: 700,
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: '#15803D',
                  boxShadow: '0 0 6px #15803D',
                }}
              />
              <span>Available for New Duty</span>
            </div>

            <a
              id="confirm-standby-whatsapp-btn"
              href="https://wa.me/919876543210?text=Hello%20Coordinator%2C%20I%20am%20available%20for%20a%20new%20care%20assignment."
              target="_blank"
              rel="noopener noreferrer"
              style={{
                marginTop: '0.5rem',
                padding: '0.65rem 1.25rem',
                backgroundColor: '#f0fdfa',
                border: '1px solid #ccfbf1',
                color: '#0F766E',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8rem',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
              }}
            >
              <span>💬 Confirm Availability to Agency</span>
            </a>
          </div>
        )
      ) : (
        /* History Tab */
        <div id="assignment-history-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {assignmentHistory.length > 0 ? (
            assignmentHistory.map((item) => (
              <div
                key={item.id}
                className="glass-panel"
                style={{
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.925rem', fontWeight: 700, color: '#172033' }}>
                    {item.customer?.patientName || item.customer?.fullName || 'Patient Care Duty'}
                  </div>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '0.2rem 0.5rem',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: item.status === 'active' ? '#eff6ff' : '#F8FAFC',
                      color: item.status === 'active' ? '#2563EB' : '#475569',
                      border: item.status === 'active' ? '1px solid #bfdbfe' : '1px solid #cbd5e1',
                    }}
                  >
                    {item.status}
                  </span>
                </div>

                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  📍 {item.customer?.locality || item.customer?.city || item.customer?.district || 'Kerala'}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>
                    Started: {item.startDate ? new Date(item.startDate).toLocaleDateString() : 'N/A'}
                  </span>
                  <span>
                    ₹{item.caregiverDailyRate || 1200} / day
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div
              className="glass-panel"
              style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}
            >
              No past assignment records on file.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
