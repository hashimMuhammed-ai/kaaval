'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { getSubdomain } from '../../utils/subdomain';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const sub = getSubdomain();
    setSubdomain(sub);

    const token = localStorage.getItem('auth_token');
    const profileStr = localStorage.getItem('user_profile');

    if (!token || !profileStr) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(profileStr);
      if (parsedUser.role === 'caregiver') {
        router.push('/portal');
        return;
      }
      setUser(parsedUser);
    } catch {
      router.push('/login');
    }
  }, []);

  // Close mobile drawer on navigation
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_profile');
    router.push('/login');
  };

  if (!mounted) {
    return null;
  }

  const isCaregiversActive = pathname.startsWith('/dashboard/caregivers') && pathname !== '/dashboard/caregivers/new';
  const isRequestsActive = pathname.startsWith('/dashboard/requests');
  const isCustomersActive = pathname.startsWith('/dashboard/customers');
  const isMatchingActive = pathname.startsWith('/dashboard/matching');
  const isSalaryReportsActive = pathname.startsWith('/dashboard/salary-reports');
  const isAnalyticsActive = pathname.startsWith('/dashboard/analytics') || pathname === '/dashboard';
  const isMoreActive =
    mobileDrawerOpen ||
    isAnalyticsActive ||
    isSalaryReportsActive ||
    pathname === '/dashboard/caregivers/new';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-deep)' }}>
      {/* Top Navigation Bar */}
      <header
        className="dashboard-mobile-header"
        style={{
          height: '70px',
          borderBottom: '1px solid var(--border-card)',
          backgroundColor: 'rgba(11, 17, 32, 0.9)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2rem',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)',
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                Agency Staff
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--primary-400)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                {subdomain ? `${subdomain}` : 'Kerala Operations'}
              </div>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="dashboard-desktop-nav" style={{ alignItems: 'center', gap: '0.75rem', marginLeft: '1rem' }}>
            <Link
              href="/dashboard/analytics"
              id="nav-link-analytics"
              style={{
                padding: '0.5rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: isAnalyticsActive ? '#ffffff' : 'var(--text-secondary)',
                backgroundColor: isAnalyticsActive ? 'rgba(20, 184, 166, 0.15)' : 'transparent',
                border: isAnalyticsActive ? '1px solid rgba(20, 184, 166, 0.35)' : '1px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
              }}
            >
              <span>📊 Analytics</span>
            </Link>

            <Link
              href="/dashboard/requests"
              id="nav-link-requests"
              style={{
                padding: '0.5rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: isRequestsActive ? '#ffffff' : 'var(--text-secondary)',
                backgroundColor: isRequestsActive ? 'rgba(20, 184, 166, 0.15)' : 'transparent',
                border: isRequestsActive ? '1px solid rgba(20, 184, 166, 0.35)' : '1px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
              }}
            >
              <span>Care Requests</span>
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: '#2dd4bf',
                  boxShadow: '0 0 6px #2dd4bf',
                  display: 'inline-block',
                }}
              />
            </Link>

            <Link
              href="/dashboard/customers"
              id="nav-link-customers"
              style={{
                padding: '0.5rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: isCustomersActive ? '#ffffff' : 'var(--text-secondary)',
                backgroundColor: isCustomersActive ? 'rgba(20, 184, 166, 0.15)' : 'transparent',
                border: isCustomersActive ? '1px solid rgba(20, 184, 166, 0.35)' : '1px solid transparent',
              }}
            >
              Customers CRM
            </Link>

            <Link
              href="/dashboard/matching"
              id="nav-link-matching"
              style={{
                padding: '0.5rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: isMatchingActive ? '#ffffff' : 'var(--text-secondary)',
                backgroundColor: isMatchingActive ? 'rgba(20, 184, 166, 0.15)' : 'transparent',
                border: isMatchingActive ? '1px solid rgba(20, 184, 166, 0.35)' : '1px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <span>Smart Matching</span>
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '0.1rem 0.4rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'rgba(20, 184, 166, 0.25)',
                  color: '#2dd4bf',
                  fontWeight: 700,
                }}
              >
                PostGIS
              </span>
            </Link>

            <Link
              href="/dashboard/caregivers"
              id="nav-link-caregivers"
              style={{
                padding: '0.5rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: isCaregiversActive ? '#ffffff' : 'var(--text-secondary)',
                backgroundColor: isCaregiversActive ? 'rgba(20, 184, 166, 0.15)' : 'transparent',
                border: isCaregiversActive ? '1px solid rgba(20, 184, 166, 0.35)' : '1px solid transparent',
              }}
            >
              Caregivers Roster
            </Link>

            <Link
              href="/dashboard/caregivers/new"
              id="nav-link-add-caregiver"
              style={{
                padding: '0.5rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: pathname === '/dashboard/caregivers/new' ? '#ffffff' : 'var(--text-secondary)',
                backgroundColor: pathname === '/dashboard/caregivers/new' ? 'rgba(20, 184, 166, 0.15)' : 'transparent',
                border: pathname === '/dashboard/caregivers/new' ? '1px solid rgba(20, 184, 166, 0.35)' : '1px solid transparent',
              }}
            >
              + Add Caregiver
            </Link>

            <Link
              href="/dashboard/salary-reports"
              id="nav-link-salary-reports"
              style={{
                padding: '0.5rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: isSalaryReportsActive ? '#ffffff' : 'var(--text-secondary)',
                backgroundColor: isSalaryReportsActive ? 'rgba(20, 184, 166, 0.15)' : 'transparent',
                border: isSalaryReportsActive ? '1px solid rgba(20, 184, 166, 0.35)' : '1px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
              }}
            >
              <span>Salary Reports</span>
              <span
                style={{
                  fontSize: '0.68rem',
                  padding: '0.1rem 0.4rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'rgba(52, 211, 153, 0.25)',
                  color: '#34d399',
                  fontWeight: 700,
                }}
              >
                ₹ Export
              </span>
            </Link>
          </nav>
        </div>

        {/* Desktop User Info & Actions */}
        <div className="show-on-desktop" style={{ alignItems: 'center', gap: '1.25rem' }}>
          {user && (
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ffffff' }}>
                {user.name}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                {user.role ? user.role.replace('_', ' ') : 'Staff'}
              </span>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="btn-secondary"
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.825rem' }}
          >
            Logout
          </button>
        </div>

        {/* Mobile Header Quick Actions */}
        <div className="show-on-mobile" style={{ alignItems: 'center', gap: '0.65rem' }}>
          <Link
            href="/dashboard/caregivers/new"
            id="mobile-header-add-caregiver"
            style={{
              padding: '0.35rem 0.65rem',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              boxShadow: '0 2px 6px rgba(20, 184, 166, 0.3)',
            }}
          >
            <span>+ Add</span>
          </Link>

          <button
            id="mobile-drawer-toggle-btn"
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              backgroundColor: mobileDrawerOpen ? 'rgba(20, 184, 166, 0.2)' : 'rgba(255, 255, 255, 0.08)',
              border: mobileDrawerOpen ? '1px solid #14b8a6' : '1px solid var(--border-card)',
              color: mobileDrawerOpen ? '#2dd4bf' : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            aria-label="Toggle navigation menu"
          >
            {mobileDrawerOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main
        className="dashboard-main-content"
        style={{
          flex: 1,
          padding: '2rem',
          maxWidth: '1360px',
          width: '100%',
          margin: '0 auto',
        }}
      >
        {children}
      </main>

      {/* Mobile Slide-Up Drawer / Bottom Sheet */}
      {mobileDrawerOpen && (
        <div
          id="dashboard-mobile-drawer-backdrop"
          onClick={() => setMobileDrawerOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 90,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            id="dashboard-mobile-drawer"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#0f172a',
              borderTop: '1px solid rgba(20, 184, 166, 0.35)',
              borderTopLeftRadius: '20px',
              borderTopRightRadius: '20px',
              padding: '1.25rem 1.25rem calc(1.5rem + env(safe-area-inset-bottom, 0px)) 1.25rem',
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.6)',
              animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Sheet Handle */}
            <div
              style={{
                width: '40px',
                height: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '2px',
                margin: '0 auto 1.25rem auto',
              }}
            />

            {/* User Profile Card */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1rem',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(20, 184, 166, 0.2)',
                    border: '1px solid #14b8a6',
                    color: '#2dd4bf',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                  }}
                >
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
                </div>
                <div>
                  <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.95rem' }}>
                    {user?.name || 'Staff User'}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'capitalize' }}>
                    {user?.role ? user.role.replace('_', ' ') : 'Office Staff'} • {subdomain || 'Agency'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  padding: '0.35rem',
                }}
              >
                ✕
              </button>
            </div>

            {/* Quick Action: Add Caregiver */}
            <Link
              href="/dashboard/caregivers/new"
              onClick={() => setMobileDrawerOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.925rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.25rem',
                boxShadow: '0 4px 14px rgba(20, 184, 166, 0.35)',
              }}
            >
              <span>+ Register New Caregiver</span>
            </Link>

            {/* Navigation Drawer Links */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <Link
                href="/dashboard/analytics"
                onClick={() => setMobileDrawerOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.8rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isAnalyticsActive ? 'rgba(20, 184, 166, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  border: isAnalyticsActive ? '1px solid rgba(20, 184, 166, 0.4)' : '1px solid var(--border-subtle)',
                  color: isAnalyticsActive ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                }}
              >
                <span style={{ fontSize: '1.15rem' }}>📊</span>
                <span>Analytics Dashboard</span>
              </Link>

              <Link
                href="/dashboard/salary-reports"
                onClick={() => setMobileDrawerOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.8rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isSalaryReportsActive ? 'rgba(20, 184, 166, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  border: isSalaryReportsActive ? '1px solid rgba(20, 184, 166, 0.4)' : '1px solid var(--border-subtle)',
                  color: isSalaryReportsActive ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                }}
              >
                <span style={{ fontSize: '1.15rem' }}>💰</span>
                <span>Salary & Payment Reports</span>
              </Link>

              <Link
                href="/portal"
                onClick={() => setMobileDrawerOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.8rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                }}
              >
                <span style={{ fontSize: '1.15rem' }}>📱</span>
                <span>Preview Caregiver Self-Service Portal</span>
              </Link>

              <Link
                href="/#request-form"
                onClick={() => setMobileDrawerOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.8rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                }}
              >
                <span style={{ fontSize: '1.15rem' }}>🌐</span>
                <span>Public Patient Intake Form</span>
              </Link>
            </div>

            {/* Logout Action */}
            <button
              onClick={() => {
                setMobileDrawerOpen(false);
                handleLogout();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                width: '100%',
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Logout from Staff Portal</span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav
        id="dashboard-mobile-nav"
        className="dashboard-mobile-nav"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 'calc(62px + env(safe-area-inset-bottom, 0px))',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          backgroundColor: 'rgba(11, 17, 32, 0.96)',
          backdropFilter: 'blur(16px)',
          borderTop: '1px solid var(--border-card)',
          zIndex: 50,
          alignItems: 'center',
          justifyContent: 'space-around',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Tab 1: Requests */}
        <Link
          href="/dashboard/requests"
          id="mobile-tab-requests"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: isRequestsActive ? '#2dd4bf' : 'var(--text-muted)',
            position: 'relative',
            gap: '3px',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isRequestsActive ? "2.4" : "1.8"}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <span style={{ fontSize: '0.68rem', fontWeight: isRequestsActive ? 700 : 500 }}>
            Requests
          </span>
          {/* Active dot */}
          <span
            style={{
              position: 'absolute',
              top: '8px',
              right: '25%',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#2dd4bf',
              boxShadow: '0 0 6px #2dd4bf',
            }}
          />
        </Link>

        {/* Tab 2: Caregivers Roster */}
        <Link
          href="/dashboard/caregivers"
          id="mobile-tab-caregivers"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: isCaregiversActive ? '#2dd4bf' : 'var(--text-muted)',
            gap: '3px',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isCaregiversActive ? "2.4" : "1.8"}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span style={{ fontSize: '0.68rem', fontWeight: isCaregiversActive ? 700 : 500 }}>
            Staff
          </span>
        </Link>

        {/* Tab 3: Smart Matching */}
        <Link
          href="/dashboard/matching"
          id="mobile-tab-matching"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: isMatchingActive ? '#2dd4bf' : 'var(--text-muted)',
            gap: '3px',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isMatchingActive ? "2.4" : "1.8"}>
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          <span style={{ fontSize: '0.68rem', fontWeight: isMatchingActive ? 700 : 500 }}>
            Match
          </span>
        </Link>

        {/* Tab 4: Customers CRM */}
        <Link
          href="/dashboard/customers"
          id="mobile-tab-customers"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: isCustomersActive ? '#2dd4bf' : 'var(--text-muted)',
            gap: '3px',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isCustomersActive ? "2.4" : "1.8"}>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span style={{ fontSize: '0.68rem', fontWeight: isCustomersActive ? 700 : 500 }}>
            CRM
          </span>
        </Link>

        {/* Tab 5: More (Drawer Trigger) */}
        <button
          id="mobile-tab-more"
          onClick={() => setMobileDrawerOpen(true)}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            background: 'none',
            border: 'none',
            color: isMoreActive ? '#2dd4bf' : 'var(--text-muted)',
            cursor: 'pointer',
            padding: 0,
            gap: '3px',
          }}
          aria-label="More options"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isMoreActive ? "2.4" : "1.8"}>
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
          <span style={{ fontSize: '0.68rem', fontWeight: isMoreActive ? 700 : 500 }}>
            More
          </span>
        </button>
      </nav>
    </div>
  );
}

