import React from 'react';
import Navbar from '../components/navbar';
import Footer from '../components/footer';
import CaregiverRequestForm from '../components/caregiver-request-form';

export default function HomePage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      <main style={{ flex: 1, padding: '2rem 1.5rem 4rem' }}>
        {/* Hero Section */}
        <section
          style={{
            maxWidth: '1100px',
            margin: '0 auto 3rem',
            textAlign: 'center',
            padding: '2rem 0',
          }}
        >
          <div style={{ display: 'inline-block', marginBottom: '1.25rem' }}>
            <span className="badge badge-teal" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
              ✦ Verified Home Nursing & Caregiver Workforce Across Kerala
            </span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.2rem, 5vw, 3.6rem)',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              marginBottom: '1.25rem',
            }}
          >
            Compassionate, Certified Caregivers <br />
            <span
              style={{
                background: 'linear-gradient(135deg, #2dd4bf 0%, #38bdf8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Directly To Your Family Home
            </span>
          </h1>

          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '1.1rem',
              maxWidth: '700px',
              margin: '0 auto 2.5rem',
              lineHeight: 1.6,
            }}
          >
            Professional home attendants for elderly parents, bedridden patients, and post-surgery rehabilitation. 100% background-checked, trained, and monitored by licensed agency coordinators.
          </p>

          {/* Quick Trust Badges */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '1.5rem',
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
              marginBottom: '2rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-400)" strokeWidth="2.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span>Police & ID Verified Staff</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-400)" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>60-Minute Response Time</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-400)" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>Strict Patient Privacy</span>
            </div>
          </div>
        </section>

        {/* Primary Interactive Form: Request a Caregiver */}
        <section id="request-form">
          <CaregiverRequestForm />
        </section>

        {/* Agency Provisioning & Trust Banner */}
        <section
          style={{
            maxWidth: '850px',
            margin: '3.5rem auto 0',
            textAlign: 'center',
            padding: '1.75rem',
            backgroundColor: 'rgba(17, 26, 46, 0.45)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xl)',
          }}
        >
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <span style={{ color: 'var(--primary-400)', fontWeight: 600 }}>Agency Operational Architecture:</span>{' '}
            Staff members and registered caregivers access administrative management through secure agency credentials. Public client accounts are not required — patient intake is handled via the verified request system above.
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
