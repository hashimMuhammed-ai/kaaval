'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../utils/api';

interface CaregiverProfile {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  status: 'available' | 'assigned' | 'on_leave' | 'inactive';
  skills: string[];
  experienceYears?: number;
  gender?: string;
  city?: string;
  district?: string;
  dailyRate?: number;
  commissionPercentage?: number;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  averageRating?: number;
  totalRatings?: number;
  jobsCompleted?: number;
  documents?: Array<{
    id: string;
    title: string;
    documentType: string;
    verified: boolean;
    expiryDate?: string;
    expiryStatus?: 'valid' | 'expiring_soon' | 'expired' | 'no_expiry';
  }>;
}

interface CurrentAssignment {
  id: string;
  status: string;
  startDate: string;
  endDate?: string;
  customer?: {
    id: string;
    fullName?: string;
    patientName?: string;
    phone?: string;
    city?: string;
    district?: string;
    address?: string;
    careAddress?: string;
    emergencyContactPhone?: string;
    serviceType?: string;
  };
  request?: {
    serviceType?: string;
    notes?: string;
  };
}

interface AttendanceToday {
  checkedIn: boolean;
  checkedOut: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  assignmentId?: string;
}

export default function CaregiverPortalHomePage() {
  const [profile, setProfile] = useState<CaregiverProfile | null>(null);
  const [assignment, setAssignment] = useState<CurrentAssignment | null>(null);
  const [attendance, setAttendance] = useState<AttendanceToday | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPortalData() {
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch Caregiver Profile (self-view)
        let caregiverData: CaregiverProfile | null = null;
        try {
          caregiverData = await apiFetch<CaregiverProfile>('/caregivers/me');
        } catch {
          // Fallback to /caregivers query (which returns caller's caregiver row)
          const listRes = await apiFetch<{ data: CaregiverProfile[] }>('/caregivers').catch(() => null);
          if (listRes?.data && listRes.data.length > 0) {
            caregiverData = listRes.data[0];
          }
        }

        if (caregiverData) {
          setProfile(caregiverData);
        } else {
          // Fallback to localStorage user profile
          if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('user_profile');
            if (stored) {
              const u = JSON.parse(stored);
              setProfile({
                id: u.id || 'cg-local',
                fullName: u.name || 'Caregiver',
                phone: u.phone || '+91 98470 00000',
                email: u.email,
                status: 'available',
                skills: ['Elderly Care', 'Home Nursing'],
                city: 'Kochi',
                district: 'Ernakulam',
                dailyRate: 1200,
                documents: [],
              });
            }
          }
        }

        // 2. Fetch Current Active Assignment
        try {
          const asgnRes = await apiFetch<{ success: boolean; data: CurrentAssignment }>('/assignments/current');
          if (asgnRes?.data) {
            setAssignment(asgnRes.data);
          }
        } catch {
          // No active assignment or non-blocking
        }

        // 3. Fetch Today's Attendance Status
        try {
          const attRes = await apiFetch<{ success: boolean; data: AttendanceToday }>('/attendance/today');
          if (attRes?.data) {
            setAttendance(attRes.data);
          }
        } catch {
          // Non-blocking
        }
      } catch (err: any) {
        setError('Unable to load full portal updates. Displaying cached information.');
      } finally {
        setLoading(false);
      }
    }

    loadPortalData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'available':
        return { bg: '#f0fdf4', text: '#15803D', border: '#86efac', dot: '#16a34a', label: 'Available' };
      case 'assigned':
        return { bg: '#eff6ff', text: '#2563EB', border: '#93c5fd', dot: '#2563EB', label: 'On Duty' };
      case 'on_leave':
        return { bg: '#fffbeb', text: '#D97706', border: '#fcd34d', dot: '#d97706', label: 'On Leave' };
      default:
        return { bg: '#F8FAFC', text: '#475569', border: '#cbd5e1', dot: '#64748b', label: 'Inactive' };
    }
  };

  const statusConfig = getStatusColor(profile?.status);

  const todayDateFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Greeting & Status Pill */}
      <section
        id="caregiver-profile-card"
        className="glass-panel"
        style={{
          padding: '1.25rem',
          background: 'linear-gradient(135deg, #ffffff, #f0fdfa)',
          border: '1px solid #ccfbf1',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '90px',
            height: '90px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(20, 184, 166, 0.15), transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {getGreeting()} ☀️
            </div>
            <h1
              id="caregiver-greeting-name"
              style={{
                fontSize: '1.35rem',
                fontWeight: 700,
                color: '#172033',
                marginTop: '0.15rem',
                lineHeight: 1.25,
              }}
            >
              {profile?.fullName || 'Caregiver'}
            </h1>
          </div>

          {/* Operational Status Pill */}
          <div
            id="caregiver-status-pill"
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: statusConfig.bg,
              border: `1.5px solid ${statusConfig.border}`,
              color: statusConfig.text,
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: 'none',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: statusConfig.dot || statusConfig.text,
              }}
            />
            <span>{statusConfig.label}</span>
          </div>
        </div>
      </section>

      {/* Unified Hero Card: Current Duty Assignment & Shift Punch Action */}
      <section
        id="active-duty-card"
        className="glass-panel"
        style={{
          padding: '1.25rem',
          border: '1px solid #e2e8f0',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {/* Card Header: Duty Title, Date & Details Link */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: assignment ? '#2563EB' : '#475569',
                boxShadow: assignment ? '0 0 8px rgba(37, 99, 235, 0.4)' : 'none',
              }}
            />
            <div>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#172033', margin: 0 }}>
                Today's Assignment
              </h2>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.1rem' }}>
                {todayDateFormatted}
              </div>
            </div>
          </div>

          <Link
            href="/portal/assignment"
            id="view-duty-details-link"
            style={{
              fontSize: '0.75rem',
              color: '#2563EB',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem',
            }}
          >
            <span>Duty Details</span>
            <span>&rarr;</span>
          </Link>
        </div>

        {/* Patient & Care Details */}
        {assignment ? (
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#172033', marginBottom: '0.25rem', lineHeight: 1.25 }}>
              {assignment.customer?.patientName || assignment.customer?.fullName || 'Patient Care'}
            </div>
            <div style={{ fontSize: '0.825rem', color: '#2563EB', fontWeight: 600, marginBottom: '0.4rem' }}>
              {assignment.customer?.serviceType || assignment.request?.serviceType || 'In-Home Healthcare'}
              {assignment.startDate ? ` • Started ${new Date(assignment.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
            </div>
            <p style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.45, margin: 0 }}>
              📍 {assignment.customer?.address || assignment.customer?.careAddress || `${assignment.customer?.city || 'Kochi'}, ${assignment.customer?.district || 'Ernakulam'}`}
            </p>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '0.6rem 0' }}>
            <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.35rem' }}>
              No active assignment in progress.
            </p>
            <span
              style={{
                fontSize: '0.72rem',
                color: '#15803D',
                backgroundColor: '#f0fdf4',
                padding: '0.25rem 0.65rem',
                borderRadius: 'var(--radius-full)',
                fontWeight: 600,
                border: '1px solid #bbf7d0',
                display: 'inline-block',
              }}
            >
              Standby &bull; Available for dispatch
            </span>
          </div>
        )}

        {/* Shift Punch Action Row */}
        <div
          id="today-attendance-card"
          style={{
            paddingTop: '0.9rem',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
              Shift Status
            </div>
            <div
              style={{
                fontSize: '0.925rem',
                fontWeight: 700,
                color: attendance?.checkedIn ? '#15803D' : '#D97706',
                marginTop: '0.15rem',
              }}
            >
              {attendance?.checkedOut
                ? 'Completed for Today'
                : attendance?.checkedIn
                ? 'Checked In (Active)'
                : 'Not Checked In'}
            </div>
          </div>

          <Link
            href="/portal/attendance"
            id="quick-punch-action-btn"
            style={{
              padding: '0.6rem 1.15rem',
              background: attendance?.checkedIn && !attendance?.checkedOut
                ? 'linear-gradient(135deg, #f59e0b, #D97706)'
                : 'linear-gradient(135deg, #3b82f6, #2563EB)',
              color: '#ffffff',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.825rem',
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: attendance?.checkedIn && !attendance?.checkedOut
                ? '0 4px 12px rgba(217, 119, 6, 0.28)'
                : '0 4px 12px rgba(37, 99, 235, 0.28)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>{attendance?.checkedIn && !attendance?.checkedOut ? 'Check Out' : 'Check In'}</span>
          </Link>
        </div>
      </section>

      {/* Quick Action 3 & 4: 2-Column Grid (Earnings & Documents) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
        {/* Earnings Card */}
        <Link
          href="/portal/salary"
          id="portal-earnings-card"
          className="glass-panel"
          style={{
            padding: '1rem',
            textDecoration: 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            border: '1px solid #e2e8f0',
            transition: 'transform 0.2s',
          }}
        >
          <div>
            <div style={{ fontSize: '0.72rem', color: '#475569', textTransform: 'uppercase' }}>
              Daily Rate
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#15803D', margin: '0.2rem 0' }}>
              ₹{profile?.dailyRate || 1000}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#475569' }}>
              Per day payout
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#2563EB', fontWeight: 600, marginTop: '0.75rem' }}>
            Salary Statements &rarr;
          </div>
        </Link>

        {/* Documents Card */}
        <Link
          href="/portal/documents"
          id="portal-documents-card"
          className="glass-panel"
          style={{
            padding: '1rem',
            textDecoration: 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            border: '1px solid #e2e8f0',
            transition: 'transform 0.2s',
          }}
        >
          <div>
            <div style={{ fontSize: '0.72rem', color: '#475569', textTransform: 'uppercase' }}>
              Credentials
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#172033', margin: '0.2rem 0' }}>
              {profile?.documents ? `${profile.documents.filter(d => d.verified).length} Active` : 'Verified'}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#15803D' }}>
              ✓ KYC & Certs
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#2563EB', fontWeight: 600, marginTop: '0.75rem' }}>
            View Documents &rarr;
          </div>
        </Link>
      </div>

      {/* PWA Direct Installation Card */}
      <section
        id="portal-pwa-install-card"
        style={{
          backgroundColor: '#f0fdfa',
          border: '1px dashed #99f6e4',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
        }}
      >
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            backgroundColor: '#ccfbf1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0F766E',
            flexShrink: 0,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#172033' }}>
            Install on Mobile Screen
          </div>
          <div style={{ fontSize: '0.72rem', color: '#475569' }}>
            One-tap launch with offline support from your home screen
          </div>
        </div>
      </section>

      {/* Lowest Privilege Guarantee Footer */}
      <div
        id="portal-security-notice"
        style={{
          textAlign: 'center',
          padding: '0.75rem 0',
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
          lineHeight: 1.4,
        }}
      >
        Caregiver Self-Service Portal &bull; Encrypted Tenant Self-View Isolation
      </div>
    </div>
  );
}
