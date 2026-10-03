'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../../utils/api';
import { getSubdomain, getTenantSlug } from '../../../utils/subdomain';

interface CaregiverDocumentItem {
  id: string;
  documentType: string;
  title: string;
  verified: boolean;
  expiryDate?: string | null;
  expiryStatus?: 'valid' | 'expiring_soon' | 'expired' | 'no_expiry' | string;
  daysUntilExpiry?: number | null;
}

interface CaregiverProfile {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  gender?: string;
  status: 'available' | 'assigned' | 'on_leave' | 'inactive';
  skills: string[];
  experienceYears?: number;
  city?: string;
  district?: string;
  state?: string;
  dailyRate?: number;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  languages?: string[];
  averageRating?: number;
  totalRatings?: number;
  jobsCompleted?: number;
  documents?: CaregiverDocumentItem[];
}

export default function CaregiverProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CaregiverProfile | null>(null);
  const [user, setUser] = useState<{ name?: string; email?: string; phone?: string; role?: string } | null>(null);
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    setSubdomain(getTenantSlug() || getSubdomain());

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('user_profile');
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch {
          // ignore
        }
      }
    }

    async function loadProfile() {
      try {
        setLoading(true);
        // Attempt to fetch caregiver self-profile
        let caregiverData: CaregiverProfile | null = null;
        try {
          caregiverData = await apiFetch<CaregiverProfile>('/caregivers/me');
        } catch {
          // Fallback to /caregivers query
          const listRes = await apiFetch<{ data: CaregiverProfile[] }>('/caregivers').catch(() => null);
          if (listRes?.data && listRes.data.length > 0) {
            caregiverData = listRes.data[0];
          }
        }

        if (caregiverData) {
          setProfile(caregiverData);
        }
      } catch (err) {
        console.error('Failed to load caregiver profile:', err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_profile');
    }
    router.push('/login');
  };

  // Compute documents summary
  const docSummary = useMemo(() => {
    const docs = profile?.documents || [];
    const total = docs.length;
    const verified = docs.filter((d) => d.verified).length;
    const expired = docs.filter((d) => d.expiryStatus === 'expired').length;
    const expiringSoon = docs.filter((d) => d.expiryStatus === 'expiring_soon').length;
    const hasWarning = expired > 0 || expiringSoon > 0;

    return { total, verified, expired, expiringSoon, hasWarning };
  }, [profile?.documents]);

  const displayName = profile?.fullName || user?.name || 'Caregiver';
  const displayPhone = profile?.phone || user?.phone || 'Not provided';
  const initial = displayName ? displayName.charAt(0).toUpperCase() : 'C';

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'assigned':
        return {
          label: 'On Duty / Assigned',
          color: '#15803D',
          bg: '#f0fdf4',
          border: '#bbf7d0',
          dot: '#16a34a',
        };
      case 'available':
        return {
          label: 'Available for Duty',
          color: '#15803D',
          bg: '#f0fdf4',
          border: '#86efac',
          dot: '#16a34a',
        };
      case 'on_leave':
        return {
          label: 'On Leave',
          color: '#D97706',
          bg: '#fffbeb',
          border: '#fde68a',
          dot: '#f59e0b',
        };
      case 'inactive':
      default:
        return {
          label: 'Inactive',
          color: '#64748b',
          bg: '#F8FAFC',
          border: '#e2e8f0',
          dot: '#94a3b8',
        };
    }
  };

  const statusStyle = getStatusBadge(profile?.status);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '2.5rem' }}>
      {/* Page Header */}
      <div>
        <h1
          id="profile-page-title"
          style={{ fontSize: '1.35rem', fontWeight: 800, color: '#172033', letterSpacing: '-0.01em' }}
        >
          My Profile
        </h1>
        <p style={{ fontSize: '0.78rem', color: '#475569', marginTop: '0.15rem' }}>
          Personal credentials, documents, and portal account settings
        </p>
      </div>

      {/* Hero Profile Card */}
      <section
        id="profile-hero-card"
        className="glass-panel"
        style={{
          padding: '1.25rem',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        {/* Large Avatar */}
        <div
          id="profile-avatar"
          style={{
            width: '76px',
            height: '76px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0F766E, #115E59)',
            border: '3px solid #ffffff',
            boxShadow: '0 8px 20px rgba(15, 118, 110, 0.28)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.85rem',
            fontWeight: 800,
            color: '#ffffff',
            marginBottom: '0.75rem',
            textTransform: 'uppercase',
          }}
        >
          {initial}
        </div>

        {/* Name & Phone */}
        <h2
          id="profile-display-name"
          style={{
            fontSize: '1.2rem',
            fontWeight: 700,
            color: '#172033',
            margin: '0 0 0.25rem 0',
            lineHeight: 1.25,
          }}
        >
          {displayName}
        </h2>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.825rem',
            color: '#475569',
            marginBottom: '0.75rem',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          <span id="profile-display-phone">{displayPhone}</span>
        </div>

        {/* Status Pill */}
        <div
          id="profile-status-badge"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.3rem 0.85rem',
            borderRadius: '9999px',
            backgroundColor: statusStyle.bg,
            border: `1.5px solid ${statusStyle.border}`,
            color: statusStyle.color,
            fontSize: '0.75rem',
            fontWeight: 700,
            marginBottom: '1rem',
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: statusStyle.dot,
            }}
          />
          {statusStyle.label}
        </div>

        {/* Mini Stats Summary */}
        <div
          style={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.5rem',
            paddingTop: '0.9rem',
            borderTop: '1px solid #f1f5f9',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
              Rating
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#172033', marginTop: '0.15rem' }}>
              ★ {profile?.averageRating ? Number(profile.averageRating).toFixed(1) : '5.0'}
            </div>
          </div>

          <div style={{ textAlign: 'center', borderLeft: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
              Duties
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#172033', marginTop: '0.15rem' }}>
              {profile?.jobsCompleted ?? 0} Done
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
              Experience
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#172033', marginTop: '0.15rem' }}>
              {profile?.experienceYears ? `${profile.experienceYears}y` : '2+y'}
            </div>
          </div>
        </div>
      </section>

      {/* Prominent Documents & Certifications Card */}
      <section>
        <Link
          href="/portal/documents"
          id="profile-documents-nav-card"
          className="glass-panel"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.1rem 1.25rem',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: docSummary.hasWarning ? '1.5px solid #fde68a' : '1px solid #e2e8f0',
            textDecoration: 'none',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: docSummary.hasWarning ? '#fffbeb' : '#eff6ff',
                color: docSummary.hasWarning ? '#D97706' : '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                flexShrink: 0,
              }}
            >
              📄
            </div>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#172033', lineHeight: 1.25 }}>
                Documents & Certifications
              </div>
              <div style={{ fontSize: '0.75rem', color: docSummary.hasWarning ? '#b45309' : '#475569', marginTop: '0.2rem' }}>
                {docSummary.hasWarning
                  ? '⚠️ Expiry / verification review required'
                  : docSummary.total > 0
                  ? `${docSummary.verified} of ${docSummary.total} documents verified`
                  : 'Nursing license, Aadhaar & ID proofs'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#2563EB' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>View</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </Link>
      </section>

      {/* Skills & Specializations */}
      <section
        id="profile-skills-card"
        className="glass-panel"
        style={{
          padding: '1.15rem 1.25rem',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '1.1rem' }}>🩺</span>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#172033', margin: 0 }}>
            Skills & Specializations
          </h3>
        </div>

        {profile?.skills && profile.skills.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
            {profile.skills.map((skill, idx) => (
              <span
                key={idx}
                style={{
                  backgroundColor: '#f0fdfa',
                  color: '#0f766e',
                  border: '1px solid #ccfbf1',
                  borderRadius: '8px',
                  padding: '0.3rem 0.65rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
            General Home Nursing, Elderly Assistance, Vital Signs Monitoring
          </div>
        )}

        {profile?.languages && profile.languages.length > 0 && (
          <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              Languages Spoken
            </div>
            <div style={{ fontSize: '0.8rem', color: '#172033', marginTop: '0.2rem', fontWeight: 500 }}>
              {profile.languages.join(', ')}
            </div>
          </div>
        )}
      </section>

      {/* Location & Emergency Contact */}
      <section
        id="profile-contact-card"
        className="glass-panel"
        style={{
          padding: '1.15rem 1.25rem',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.9rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.1rem' }}>📍</span>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#172033', margin: 0 }}>
            Service Location & Emergency Info
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
              Base District
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#172033', marginTop: '0.15rem' }}>
              {profile?.city ? `${profile.city}, ` : ''}{profile?.district || 'Kerala'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
              Agency Tenant
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#172033', marginTop: '0.15rem' }}>
              {subdomain ? `${subdomain}` : 'Kerala Care Agency'}
            </div>
          </div>
        </div>

        {profile?.emergencyContactName && (
          <div
            style={{
              paddingTop: '0.75rem',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                Emergency Contact
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#172033', marginTop: '0.15rem' }}>
                {profile.emergencyContactName}
              </div>
            </div>

            {profile.emergencyContactPhone && (
              <a
                href={`tel:${profile.emergencyContactPhone}`}
                id="emergency-contact-call-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#15803D',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                Call Contact
              </a>
            )}
          </div>
        )}
      </section>

      {/* Account Actions / Logout */}
      <section style={{ marginTop: '0.75rem' }}>
        <button
          type="button"
          id="profile-logout-btn"
          onClick={() => setShowLogoutConfirm(true)}
          style={{
            width: '100%',
            padding: '0.85rem 1rem',
            backgroundColor: '#ffffff',
            border: '1.5px solid #fecaca',
            borderRadius: '14px',
            color: '#DC2626',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            boxShadow: '0 2px 6px rgba(220, 38, 38, 0.05)',
            transition: 'all 0.15s ease',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>Sign Out of Portal</span>
        </button>

        <div style={{ textAlign: 'center', fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.75rem' }}>
          Caregiver PWA &bull; v1.0.0 &bull; Secure Session
        </div>
      </section>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          id="logout-confirmation-modal"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '1.5rem',
              maxWidth: '360px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              animation: 'modalSlideUp 0.2s ease-out',
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: '#fef2f2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
              }}
            >
              🚪
            </div>

            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#172033', margin: '0 0 0.4rem 0' }}>
                Sign Out of Portal?
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                Are you sure you want to sign out? You will need your login phone number and password to access your duty schedule again.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', width: '100%', marginTop: '0.5rem' }}>
              <button
                type="button"
                id="cancel-logout-btn"
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  color: '#475569',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                id="confirm-logout-btn"
                onClick={handleLogout}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  backgroundColor: '#DC2626',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
                }}
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
