'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { getSubdomain } from '../../utils/subdomain';

interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: 'caregiver' | 'owner' | 'office_staff' | 'super_admin';
  tenantId?: string;
  phone?: string;
}

export default function CaregiverPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    setSubdomain(getSubdomain());

    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);

      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Check standalone mode (PWA installed)
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsStandalone(standalone);

      // Check authentication
      const token = localStorage.getItem('auth_token');
      const profileStr = localStorage.getItem('user_profile');

      if (!token || !profileStr) {
        router.push('/login');
        return;
      }

      try {
        const parsed = JSON.parse(profileStr);
        setUser(parsed);
      } catch {
        router.push('/login');
      }

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_profile');
    }
    router.push('/login');
  };

  if (!mounted || !user) {
    return null;
  }

  const isStaffPreview = user.role !== 'caregiver';

  const navItems = [
    {
      id: 'tab-home',
      label: 'Home',
      href: '/portal',
      exact: true,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      id: 'tab-assignment',
      label: 'Duty',
      href: '/portal/assignment',
      exact: false,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          <path d="m9 14 2 2 4-4" />
        </svg>
      ),
    },
    {
      id: 'tab-attendance',
      label: 'Punch',
      href: '/portal/attendance',
      exact: false,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      id: 'tab-salary',
      label: 'Salary',
      href: '/portal/salary',
      exact: false,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    },
    {
      id: 'tab-documents',
      label: 'Docs',
      href: '/portal/documents',
      exact: false,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
    },
  ];

  return (
    <div
      id="caregiver-portal-root"
      style={{
        minHeight: '100vh',
        backgroundColor: '#050811',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        color: '#f8fafc',
        position: 'relative',
      }}
    >
      {/* Mobile Shell Container (Phone width on desktop, full bleed on mobile) */}
      <div
        id="caregiver-pwa-container"
        style={{
          width: '100%',
          maxWidth: '480px',
          minHeight: '100vh',
          backgroundColor: '#090e1a',
          boxShadow: '0 0 40px rgba(0, 0, 0, 0.75)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          borderLeft: '1px solid rgba(255, 255, 255, 0.06)',
          borderRight: '1px solid rgba(255, 255, 255, 0.06)',
          paddingBottom: '84px', // Space for bottom navigation
        }}
      >
        {/* Offline Alert Strip */}
        {!isOnline && (
          <div
            id="portal-offline-banner"
            style={{
              backgroundColor: '#b45309',
              color: '#fef3c7',
              padding: '0.45rem 1rem',
              fontSize: '0.78rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              letterSpacing: '0.01em',
              zIndex: 60,
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#fbbf24',
                animation: 'pulse 1.5s infinite',
              }}
            />
            <span>Offline Mode — Cached data shown. Punches sync on reconnect.</span>
          </div>
        )}

        {/* Staff / Owner Preview Banner */}
        {isStaffPreview && (
          <div
            id="portal-staff-preview-banner"
            style={{
              backgroundColor: 'rgba(20, 184, 166, 0.15)',
              borderBottom: '1px solid rgba(20, 184, 166, 0.35)',
              padding: '0.5rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.78rem',
              color: '#2dd4bf',
            }}
          >
            <span style={{ fontWeight: 600 }}>👁️ Staff Preview Mode</span>
            <Link
              href="/dashboard"
              id="return-to-dashboard-btn"
              style={{
                color: '#ffffff',
                textDecoration: 'underline',
                fontWeight: 600,
                fontSize: '0.75rem',
              }}
            >
              Dashboard &rarr;
            </Link>
          </div>
        )}

        {/* Mobile Header Bar */}
        <header
          id="portal-header"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 40,
            backgroundColor: 'rgba(9, 14, 26, 0.94)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '0.85rem 1.15rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Brand & Connectivity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(20, 184, 166, 0.35)',
                color: '#ffffff',
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '0.925rem', fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>
                Caregiver Portal
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: isOnline ? '#10b981' : '#f59e0b',
                    boxShadow: isOnline ? '0 0 6px #10b981' : '0 0 6px #f59e0b',
                  }}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  {isOnline ? 'Online' : 'Offline'} &bull; {subdomain ? `${subdomain}` : 'Kerala Care'}
                </span>
              </div>
            </div>
          </div>

          {/* User Initial & Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'rgba(20, 184, 166, 0.18)',
                border: '1px solid rgba(20, 184, 166, 0.4)',
                color: '#2dd4bf',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
              title={user.name}
            >
              {user.name ? user.name.charAt(0) : 'C'}
            </div>

            <button
              onClick={handleLogout}
              id="portal-logout-btn"
              title="Sign Out"
              aria-label="Sign Out"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#94a3b8',
                padding: '0.35rem 0.6rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                transition: 'all 0.2s',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Exit</span>
            </button>
          </div>
        </header>

        {/* Main Content Viewport */}
        <main
          id="portal-main-content"
          style={{
            flex: 1,
            padding: '1.25rem 1.15rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar (Thumb Friendly) */}
        <nav
          id="portal-bottom-nav"
          role="navigation"
          aria-label="Caregiver Bottom Navigation"
          style={{
            position: 'fixed',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: '480px',
            height: '72px',
            backgroundColor: 'rgba(11, 17, 32, 0.96)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            zIndex: 50,
            padding: '0 0.5rem env(safe-area-inset-bottom, 0)',
            boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.4)',
          }}
        >
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.id}
                id={item.id}
                href={item.href}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.25rem',
                  flex: 1,
                  height: '100%',
                  color: isActive ? '#2dd4bf' : '#64748b',
                  position: 'relative',
                  transition: 'color 0.2s ease',
                  textDecoration: 'none',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {/* Active Indicator Top Glow */}
                {isActive && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '28px',
                      height: '3px',
                      borderRadius: '0 0 4px 4px',
                      backgroundColor: '#2dd4bf',
                      boxShadow: '0 0 10px #2dd4bf',
                    }}
                  />
                )}

                <div
                  style={{
                    transform: isActive ? 'translateY(-1px) scale(1.08)' : 'none',
                    transition: 'transform 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {item.icon}
                </div>

                <span
                  style={{
                    fontSize: '0.675rem',
                    fontWeight: isActive ? 700 : 500,
                    letterSpacing: '0.02em',
                  }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
