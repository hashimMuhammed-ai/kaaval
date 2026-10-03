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
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_profile');
    router.push('/login');
  };

  if (!mounted) {
    return null;
  }

  const isCaregiversActive = pathname.startsWith('/dashboard/caregivers');
  const isRequestsActive = pathname.startsWith('/dashboard/requests');
  const isCustomersActive = pathname.startsWith('/dashboard/customers');
  const isMatchingActive = pathname.startsWith('/dashboard/matching');
  const isSalaryReportsActive = pathname.startsWith('/dashboard/salary-reports');
  const isAnalyticsActive = pathname.startsWith('/dashboard/analytics') || pathname === '/dashboard';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-deep)' }}>
      {/* Top Navigation Bar */}
      <header
        style={{
          height: '70px',
          borderBottom: '1px solid var(--border-card)',
          backgroundColor: 'rgba(11, 17, 32, 0.85)',
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
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em' }}>
                Agency Management
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--primary-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {subdomain ? `${subdomain} agency` : 'Kerala Operations'}
              </div>
            </div>
          </Link>

          {/* Nav Links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: '1rem' }}>
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

        {/* User Info & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
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
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '2rem', maxWidth: '1360px', width: '100%', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  );
}
