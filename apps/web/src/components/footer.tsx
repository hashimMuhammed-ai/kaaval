import React from 'react';
import Link from 'next/link';

export default function Footer({ agencyName = 'CareKerala' }: { agencyName?: string }) {
  return (
    <footer
      id="main-footer"
      style={{
        marginTop: 'auto',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        backgroundColor: '#070b14',
        padding: '3.5rem 1.5rem 2rem',
        color: 'var(--text-secondary)',
        fontSize: '0.875rem',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '2.5rem',
          paddingBottom: '2.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        {/* Col 1: About & Trust */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
            </div>
            <h4 style={{ color: '#ffffff', fontSize: '1.1rem', margin: 0 }}>
              {agencyName}
            </h4>
          </div>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
            Licensed home nursing and verified caregiver services across all 14 Kerala districts. Compassionate, monitored care for elderly parents, bedridden patients, and post-surgery rehabilitation.
          </p>
          <div className="badge badge-teal">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            100% Police & ID Verified Staff
          </div>
        </div>

        {/* Col 2: Quick Links */}
        <div>
          <h4 style={{ color: '#ffffff', fontSize: '1rem', marginBottom: '0.9rem' }}>
            Quick Links
          </h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <li>
              <Link href="/" id="footer-link-home" style={{ color: 'var(--text-secondary)' }}>
                Home & Intake
              </Link>
            </li>
            <li>
              <Link href="/services" id="footer-link-services" style={{ color: 'var(--text-secondary)' }}>
                Services & Pricing
              </Link>
            </li>
            <li>
              <Link href="/about" id="footer-link-about" style={{ color: 'var(--text-secondary)' }}>
                About Our Standards
              </Link>
            </li>
            <li>
              <Link href="/contact" id="footer-link-contact" style={{ color: 'var(--text-secondary)' }}>
                Contact & 24/7 Helpline
              </Link>
            </li>
            <li>
              <Link href="/#request-form" id="footer-link-request" style={{ color: 'var(--primary-400)', fontWeight: 600 }}>
                Request a Caregiver &rarr;
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 3: Care Programs */}
        <div>
          <h4 style={{ color: '#ffffff', fontSize: '1rem', marginBottom: '0.9rem' }}>
            Care Programs
          </h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem', color: 'var(--text-muted)' }}>
            <li>
              <Link href="/services?category=elderly" style={{ color: 'var(--text-muted)' }}>
                Elderly Assisted Living
              </Link>
            </li>
            <li>
              <Link href="/services?category=bedridden" style={{ color: 'var(--text-muted)' }}>
                Bedridden & Palliative Care
              </Link>
            </li>
            <li>
              <Link href="/services?category=post_op" style={{ color: 'var(--text-muted)' }}>
                Post-Surgical Nursing Care
              </Link>
            </li>
            <li>
              <Link href="/services?category=dementia" style={{ color: 'var(--text-muted)' }}>
                Dementia & Memory Support
              </Link>
            </li>
            <li>
              <Link href="/services?category=nursing" style={{ color: 'var(--text-muted)' }}>
                Specialized Clinical Nursing
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 4: Policy & Strict Access Policy */}
        <div>
          <h4 style={{ color: '#ffffff', fontSize: '1rem', marginBottom: '0.9rem' }}>
            Agency Security Policy
          </h4>
          <div
            style={{
              padding: '0.95rem',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--primary-400)' }}>Zero Public Registration:</strong> Strict top-down provisioning ensures all patient medical details remain isolated via PostgreSQL RLS. Staff and caregivers access accounts via authorized credentials only.
            </p>
          </div>
          <div style={{ marginTop: '0.85rem' }}>
            <Link
              href="/login"
              id="footer-link-login"
              style={{
                color: 'var(--primary-400)',
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontWeight: 500,
              }}
            >
              <span>Agency Staff & Caregiver Login</span> &rarr;
            </Link>
          </div>
        </div>
      </div>

      <div
        style={{
          maxWidth: '1200px',
          margin: '1.5rem auto 0',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
        }}
      >
        <div>
          &copy; {new Date().getFullYear()} {agencyName}. All rights reserved.
        </div>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <span>PostgreSQL RLS Protected</span>
          <span>Kerala Healthcare Services Standards</span>
        </div>
      </div>
    </footer>
  );
}
