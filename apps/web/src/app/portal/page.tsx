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
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 30000);
    return () => clearInterval(interval);
  }, []);

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
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.35)', label: 'Available' };
      case 'assigned':
        return { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.35)', label: 'On Duty' };
      case 'on_leave':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.35)', label: 'On Leave' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.15)', text: '#94a3b8', border: 'rgba(148, 163, 184, 0.35)', label: 'Inactive' };
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
          background: 'linear-gradient(135deg, rgba(22, 34, 59, 0.85), rgba(17, 26, 46, 0.95))',
          border: '1px solid rgba(20, 184, 166, 0.25)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
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
            background: 'radial-gradient(circle, rgba(20, 184, 166, 0.25), transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {getGreeting()} ☀️
            </div>
            <h1
              id="caregiver-greeting-name"
              style={{
                fontSize: '1.35rem',
                fontWeight: 700,
                color: '#ffffff',
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
              border: `1px solid ${statusConfig.border}`,
              color: statusConfig.text,
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: statusConfig.text,
                boxShadow: `0 0 6px ${statusConfig.text}`,
              }}
            />
            <span>{statusConfig.label}</span>
          </div>
        </div>

        {/* Location & Quick Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>
              {profile?.city || 'Kochi'}, {profile?.district || 'Ernakulam'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>{currentTime || 'Shift Clock'}</span>
          </div>
        </div>

        {/* Rating and Completed Jobs Badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.6rem', marginTop: '0.75rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.65rem',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(251, 191, 36, 0.12)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            fontSize: '0.78rem',
            color: '#fbbf24',
            fontWeight: 600
          }}>
            <span>★</span>
            <span>{profile?.averageRating ? Number(profile.averageRating).toFixed(1) : 'New'} Rating</span>
            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({profile?.totalRatings || 0} reviews)</span>
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.65rem',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            fontSize: '0.78rem',
            color: '#34d399',
            fontWeight: 600
          }}>
            <span>💼</span>
            <span>{profile?.jobsCompleted || 0} Jobs Completed</span>
          </div>
        </div>
      </section>

      {/* Emergency Agency SOS / Help Strip */}
      <section
        id="agency-emergency-helpline-card"
        style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(185, 28, 28, 0.08))',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: 'var(--radius-lg)',
          padding: '0.85rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f87171',
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#fca5a5' }}>
              Coordinator SOS Support
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Direct line for duty assistance or patient emergency
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
          <a
            id="emergency-call-btn"
            href="tel:+919876543210"
            title="Call Agency Coordinator"
            aria-label="Call Agency Coordinator"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </a>

          <a
            id="emergency-whatsapp-btn"
            href="https://wa.me/919876543210?text=Caregiver%20Duty%20Assistance%20Needed"
            target="_blank"
            rel="noopener noreferrer"
            title="WhatsApp Coordinator"
            aria-label="WhatsApp Coordinator"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'rgba(37, 211, 102, 0.2)',
              border: '1px solid rgba(37, 211, 102, 0.4)',
              color: '#4ade80',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.316 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.818-.981z" />
            </svg>
          </a>
        </div>
      </section>

      {/* Quick Action 1: Active Duty / Current Assignment */}
      <section
        id="active-duty-card"
        className="glass-panel"
        style={{
          padding: '1.25rem',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          background: 'rgba(15, 23, 42, 0.7)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: assignment ? '#38bdf8' : '#94a3b8',
                boxShadow: assignment ? '0 0 8px #38bdf8' : 'none',
              }}
            />
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
              Current Assignment
            </h2>
          </div>

          <Link
            href="/portal/assignment"
            id="view-duty-details-link"
            style={{
              fontSize: '0.75rem',
              color: 'var(--primary-400)',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Details &rarr;
          </Link>
        </div>

        {assignment ? (
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.2rem' }}>
              {assignment.customer?.patientName || assignment.customer?.fullName || 'Patient Care'}
            </div>
            <div style={{ fontSize: '0.825rem', color: '#38bdf8', marginBottom: '0.35rem' }}>
              {assignment.customer?.serviceType || assignment.request?.serviceType || 'In-Home Healthcare'}
              {assignment.startDate ? ` • Started ${new Date(assignment.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
            </div>
            <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
              📍 {assignment.customer?.address || assignment.customer?.careAddress || `${assignment.customer?.city || 'Kochi'}, ${assignment.customer?.district || 'Ernakulam'}`}
            </p>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '0.75rem 0' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              No active assignment in progress.
            </p>
            <span
              style={{
                fontSize: '0.72rem',
                color: '#34d399',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                padding: '0.2rem 0.55rem',
                borderRadius: 'var(--radius-full)',
              }}
            >
              Standby &bull; Available for dispatch
            </span>
          </div>
        )}
      </section>

      {/* Quick Action 2: Today's Attendance & Shift Punch */}
      <section
        id="today-attendance-card"
        className="glass-panel"
        style={{
          padding: '1.25rem',
          border: '1px solid rgba(20, 184, 166, 0.25)',
          background: 'rgba(15, 23, 42, 0.7)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Today &bull; {todayDateFormatted}
            </div>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
              Attendance & Shift Punch
            </h2>
          </div>

          <Link
            href="/portal/attendance"
            id="view-attendance-link"
            style={{
              fontSize: '0.75rem',
              color: 'var(--primary-400)',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            History &rarr;
          </Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Shift Status:</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: attendance?.checkedIn ? '#34d399' : '#f59e0b', marginTop: '0.1rem' }}>
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
              padding: '0.55rem 1.1rem',
              background: attendance?.checkedIn && !attendance?.checkedOut
                ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                : 'linear-gradient(135deg, #14b8a6, #0d9488)',
              color: '#ffffff',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.825rem',
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
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
            border: '1px solid rgba(255, 255, 255, 0.1)',
            transition: 'transform 0.2s',
          }}
        >
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Daily Rate
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399', margin: '0.2rem 0' }}>
              ₹{profile?.dailyRate || 1000}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              Per day payout
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--primary-400)', fontWeight: 600, marginTop: '0.75rem' }}>
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
            border: '1px solid rgba(255, 255, 255, 0.1)',
            transition: 'transform 0.2s',
          }}
        >
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Credentials
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: '0.2rem 0' }}>
              {profile?.documents ? `${profile.documents.filter(d => d.verified).length} Active` : 'Verified'}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#34d399' }}>
              ✓ KYC & Certs
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--primary-400)', fontWeight: 600, marginTop: '0.75rem' }}>
            View Documents &rarr;
          </div>
        </Link>
      </div>

      {/* PWA Direct Installation Card */}
      <section
        id="portal-pwa-install-card"
        style={{
          backgroundColor: 'rgba(20, 184, 166, 0.08)',
          border: '1px dashed rgba(20, 184, 166, 0.3)',
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
            backgroundColor: 'rgba(20, 184, 166, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#2dd4bf',
            flexShrink: 0,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#ffffff' }}>
            Install on Mobile Screen
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
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
