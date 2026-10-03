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
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

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

      // Set theme-color meta tag and canvas background for mobile status bar & notch
      let metaTheme = document.querySelector('meta[name="theme-color"]');
      let createdMeta = false;
      const prevTheme = metaTheme?.getAttribute('content') || '#070b14';
      if (metaTheme) {
        metaTheme.setAttribute('content', '#ffffff');
      } else {
        metaTheme = document.createElement('meta');
        metaTheme.setAttribute('name', 'theme-color');
        metaTheme.setAttribute('content', '#ffffff');
        document.head.appendChild(metaTheme);
        createdMeta = true;
      }

      const prevHtmlBg = document.documentElement.style.backgroundColor;
      const prevBodyBg = document.body.style.backgroundColor;
      document.documentElement.style.backgroundColor = '#ffffff';
      document.body.style.backgroundColor = '#ffffff';

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        if (metaTheme) {
          if (createdMeta) {
            metaTheme.remove();
          } else {
            metaTheme.setAttribute('content', prevTheme);
          }
        }
        document.documentElement.style.backgroundColor = prevHtmlBg;
        document.body.style.backgroundColor = prevBodyBg;
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
      id: 'tab-profile',
      label: 'Profile',
      href: '/portal/profile',
      exact: false,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  ];

  return (
    <div
      id="caregiver-portal-root"
      style={{
        minHeight: '100vh',
        backgroundColor: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        color: '#172033',
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
          backgroundColor: '#ffffff',
          boxShadow: '0 0 35px rgba(0, 0, 0, 0.07)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          borderLeft: '1px solid #e2e8f0',
          borderRight: '1px solid #e2e8f0',
          paddingBottom: 'calc(84px + env(safe-area-inset-bottom, 0px))', // Space for bottom navigation
        }}
      >
        {/* Offline Alert Strip */}
        {!isOnline && (
          <div
            id="portal-offline-banner"
            style={{
              backgroundColor: '#D97706',
              color: '#ffffff',
              padding: '0.45rem 1rem',
              paddingTop: 'calc(0.45rem + env(safe-area-inset-top, 0px))',
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
              backgroundColor: '#f0fdfa',
              borderBottom: '1px solid #ccfbf1',
              padding: '0.5rem 1rem',
              paddingTop: isOnline
                ? 'calc(0.5rem + env(safe-area-inset-top, 0px))'
                : '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.78rem',
              color: '#0f766e',
            }}
          >
            <span style={{ fontWeight: 600 }}>👁️ Staff Preview Mode</span>
            <Link
              href="/dashboard"
              id="return-to-dashboard-btn"
              style={{
                color: '#0d9488',
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
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            paddingTop: !isOnline || isStaffPreview
              ? '0.85rem'
              : 'calc(0.85rem + env(safe-area-inset-top, 0px))',
            paddingBottom: '0.85rem',
            paddingLeft: 'max(1.15rem, env(safe-area-inset-left, 0px))',
            paddingRight: 'max(1.15rem, env(safe-area-inset-right, 0px))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Brand & Agency Identity (Minimalist Native App Style) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0F766E, #115e59)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(15, 118, 110, 0.25)',
                color: '#ffffff',
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#172033', lineHeight: 1.2 }}>
                Caregiver Portal
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.1rem', fontWeight: 500 }}>
                {subdomain ? `${subdomain}` : 'Kerala Care'}
              </div>
            </div>
          </div>

          {/* Help Button in Header Right */}
          <button
            type="button"
            id="portal-header-help-btn"
            onClick={() => setShowHelpModal(true)}
            aria-label="Caregiver Help & Emergency Support"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '9999px',
              padding: '0.35rem 0.75rem',
              color: '#DC2626',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <span>Help</span>
          </button>
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
            height: 'calc(70px + env(safe-area-inset-bottom, 0px))',
            backgroundColor: '#ffffff',
            borderTop: 'none',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-around',
            zIndex: 50,
            paddingTop: '0.45rem',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            paddingLeft: 'max(0.5rem, env(safe-area-inset-left, 0px))',
            paddingRight: 'max(0.5rem, env(safe-area-inset-right, 0px))',
            boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.05)',
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
                  gap: '0.2rem',
                  flex: 1,
                  height: '52px',
                  color: isActive ? '#2563EB' : '#475569',
                  position: 'relative',
                  transition: 'color 0.2s ease',
                  textDecoration: 'none',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
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

        {/* Help Action Sheet / Modal */}
        {showHelpModal && (
          <div
            id="portal-help-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Caregiver Help & Emergency Support"
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(4px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
            }}
            onClick={() => setShowHelpModal(false)}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '480px',
                backgroundColor: '#ffffff',
                borderTopLeftRadius: '24px',
                borderTopRightRadius: '24px',
                padding: '1.5rem 1.25rem calc(1.5rem + env(safe-area-inset-bottom, 0px))',
                boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag Handle indicator */}
              <div
                style={{
                  width: '36px',
                  height: '4px',
                  backgroundColor: '#cbd5e1',
                  borderRadius: '2px',
                  alignSelf: 'center',
                  marginBottom: '0.25rem',
                }}
              />

              {/* Title & Description */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: '#fee2e2',
                    color: '#DC2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    flexShrink: 0,
                  }}
                >
                  🆘
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#172033', margin: 0, lineHeight: 1.2 }}>
                    Emergency & Duty Help
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                    Direct contact for office staff assistance or emergency
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.25rem' }}>
                {/* 1. Call Office Staff */}
                <a
                  id="help-call-office-btn"
                  href="tel:+919876543210"
                  aria-label="Call Office Staff"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.9rem 1rem',
                    backgroundColor: '#fef2f2',
                    border: '1.5px solid #fca5a5',
                    borderRadius: '14px',
                    textDecoration: 'none',
                    color: '#DC2626',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        backgroundColor: '#fee2e2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#991b1b' }}>
                        Call Office Staff
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#b91c1c' }}>
                        +91 98765 43210 &bull; Duty Coordinator
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#DC2626' }}>Call &rarr;</span>
                </a>

                {/* 2. WhatsApp Support */}
                <a
                  id="help-whatsapp-btn"
                  href="https://wa.me/919876543210?text=Caregiver%20Duty%20Assistance%20Needed"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp Office Support"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.9rem 1rem',
                    backgroundColor: '#f0fdf4',
                    border: '1.5px solid #86efac',
                    borderRadius: '14px',
                    textDecoration: 'none',
                    color: '#15803D',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        backgroundColor: '#dcfce7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.316 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.818-.981z" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#166534' }}>
                        WhatsApp Office Support
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#15803D' }}>
                        Quick chat for duty coordination
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#15803D' }}>Chat &rarr;</span>
                </a>

                {/* 3. Emergency Medical Help (Ambulance 108) */}
                <a
                  id="help-ambulance-btn"
                  href="tel:108"
                  aria-label="Call 108 Ambulance"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    backgroundColor: '#fffbeb',
                    border: '1.5px solid #fde68a',
                    borderRadius: '14px',
                    textDecoration: 'none',
                    color: '#b45309',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        backgroundColor: '#fef3c7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.1rem',
                      }}
                    >
                      🚑
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#92400e' }}>
                        Emergency Ambulance (108)
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#b45309' }}>
                        Government 24/7 Medical Emergency Line
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#b45309' }}>Call 108 &rarr;</span>
                </a>
              </div>

              {/* Close Button */}
              <button
                type="button"
                id="help-close-btn"
                onClick={() => setShowHelpModal(false)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  color: '#475569',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginTop: '0.25rem',
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
