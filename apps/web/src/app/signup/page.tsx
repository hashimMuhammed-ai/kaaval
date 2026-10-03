import React from 'react';
import Link from 'next/link';
import Navbar from '../../components/navbar';
import Footer from '../../components/footer';

export default function SignupDisabledPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3rem 1.5rem',
        }}
      >
        <div
          id="signup-disabled-card"
          className="glass-panel"
          style={{
            maxWidth: '600px',
            width: '100%',
            padding: '2.5rem',
            textAlign: 'center',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              border: '2px solid var(--status-warning)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              color: '#fbbf24',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <span className="badge badge-amber" style={{ marginBottom: '1rem' }}>
            Strict Top-Down Provisioning
          </span>

          <h1 style={{ fontSize: '1.85rem', color: '#ffffff', marginBottom: '0.75rem' }}>
            Public Registration Is Disabled
          </h1>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
            To safeguard vulnerable patients and ensure strict healthcare compliance across Kerala, there is zero public sign-up on this platform.
          </p>

          <div
            style={{
              backgroundColor: 'rgba(11, 17, 32, 0.75)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              textAlign: 'left',
              marginBottom: '2rem',
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
            }}
          >
            <h2 style={{ fontSize: '0.95rem', color: '#ffffff', marginBottom: '0.75rem' }}>
              How Accounts Are Created:
            </h2>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <li style={{ display: 'flex', gap: '0.5rem' }}>
                <span style={{ color: 'var(--primary-400)' }}>1.</span>
                <span><strong>Agencies:</strong> Manually provisioned by Platform Super Admin after verified payment confirmation.</span>
              </li>
              <li style={{ display: 'flex', gap: '0.5rem' }}>
                <span style={{ color: 'var(--primary-400)' }}>2.</span>
                <span><strong>Staff:</strong> Onboarded exclusively via single-use, 48-hour expiring invite tokens sent via WhatsApp.</span>
              </li>
              <li style={{ display: 'flex', gap: '0.5rem' }}>
                <span style={{ color: 'var(--primary-400)' }}>3.</span>
                <span><strong>Caregivers:</strong> Accounts and portal credentials are created directly by agency office staff alongside their verified profile.</span>
              </li>
              <li style={{ display: 'flex', gap: '0.5rem' }}>
                <span style={{ color: 'var(--primary-400)' }}>4.</span>
                <span><strong>Families:</strong> No login or account required. Submit your care requirement via the public intake form.</span>
              </li>
            </ul>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
            <Link href="/" id="goto-home-request-btn" className="btn-primary">
              <span>Request a Caregiver</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>

            <Link href="/login" id="goto-staff-login-btn" className="btn-secondary">
              <span>Staff & Caregiver Login</span>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
