import React from 'react';
import Link from 'next/link';
import Navbar from '../../components/navbar';
import Footer from '../../components/footer';

export const metadata = {
  title: 'About Us | Kerala Trusted Caregiver & Home Nursing Network',
  description:
    'Discover our mission, strict 4-stage caregiver vetting protocol, and institutional patient privacy standard across all 14 Kerala districts.',
};

export default function AboutPage() {
  const KERALA_DISTRICTS = [
    { name: 'Ernakulam (Kochi)', hub: 'Central Coordination HQ' },
    { name: 'Thiruvananthapuram', hub: 'South Regional Office' },
    { name: 'Thrissur', hub: 'Active Coverage Zone' },
    { name: 'Kozhikode', hub: 'North Regional Office' },
    { name: 'Kottayam', hub: 'Active Coverage Zone' },
    { name: 'Kollam', hub: 'Active Coverage Zone' },
    { name: 'Palakkad', hub: 'Active Coverage Zone' },
    { name: 'Malappuram', hub: 'Active Coverage Zone' },
    { name: 'Alappuzha', hub: 'Active Coverage Zone' },
    { name: 'Kannur', hub: 'Active Coverage Zone' },
    { name: 'Pathanamthitta', hub: 'Active Coverage Zone' },
    { name: 'Idukki', hub: 'Active Coverage Zone' },
    { name: 'Wayanad', hub: 'Active Coverage Zone' },
    { name: 'Kasaragod', hub: 'Active Coverage Zone' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      <main style={{ flex: 1, padding: '2.5rem 1.5rem 5rem' }}>
        <div style={{ maxWidth: '1150px', margin: '0 auto' }}>
          {/* Hero Section */}
          <section style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <div style={{ display: 'inline-block', marginBottom: '1.25rem' }}>
              <span className="badge badge-teal" style={{ padding: '0.4rem 1.1rem', fontSize: '0.825rem' }}>
                ✦ Institutional Standards For In-Home Healthcare
              </span>
            </div>
            <h1
              style={{
                fontSize: 'clamp(2.3rem, 5vw, 3.6rem)',
                fontWeight: 800,
                color: '#ffffff',
                lineHeight: 1.15,
                marginBottom: '1.25rem',
              }}
            >
              Restoring Peace of Mind to <br />
              <span className="gradient-text">Families Across Kerala & Abroad</span>
            </h1>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '1.15rem',
                maxWidth: '780px',
                margin: '0 auto',
                lineHeight: 1.65,
              }}
            >
              Kerala has one of the highest elderly populations in India, with sons and daughters frequently building careers in the Gulf, Europe, and metropolitan hubs. We bridge the distance with hospital-grade home care attendants, verified credentials, and active agency coordination.
            </p>
          </section>

          {/* Key Metric Highlights */}
          <section
            id="about-metrics-bar"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1.5rem',
              marginBottom: '5rem',
            }}
          >
            {[
              { value: '4,000+', label: 'Vetted Caregiver Workforce', sub: 'Indexed across Kerala' },
              { value: '60 Min', label: 'Urgent Dispatch SLA', sub: 'For hospital discharge' },
              { value: '14 Districts', label: 'Full State Coverage', sub: 'Urban & rural panchayats' },
              { value: '98.4%', label: 'Family Satisfaction', sub: 'Verified post-care audits' },
            ].map((stat, idx) => (
              <div
                key={idx}
                className="glass-panel"
                style={{
                  padding: '1.75rem',
                  textAlign: 'center',
                  border: '1px solid var(--border-card)',
                }}
              >
                <div
                  style={{
                    fontSize: '2.5rem',
                    fontWeight: 800,
                    fontFamily: 'var(--font-display)',
                    color: 'var(--primary-400)',
                    lineHeight: 1,
                    marginBottom: '0.5rem',
                  }}
                >
                  {stat.value}
                </div>
                <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                  {stat.label}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{stat.sub}</div>
              </div>
            ))}
          </section>

          {/* Our Story & Purpose */}
          <section
            id="our-mission-story"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '3rem',
              alignItems: 'center',
              marginBottom: '5rem',
            }}
          >
            <div>
              <span className="badge badge-blue" style={{ marginBottom: '0.75rem' }}>
                Our Mission & Purpose
              </span>
              <h2 style={{ fontSize: '2rem', color: '#ffffff', marginBottom: '1.25rem' }}>
                Why Informal Caregiver Agencies Fail Families
              </h2>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p>
                  For years, families in Kerala had to rely on fragmented local broker networks or classified ads. When a caregiver suddenly abandons an 82-year-old bedridden mother without notice, families are left in crisis.
                </p>
                <p>
                  We built this platform to replace unmonitored freelancing with an institutionalized agency workforce. Every agency on our platform adheres to standardized employment verification, digital attendance tracking, and mandatory backup protocols.
                </p>
                <p>
                  When your family books through our network, you do not just hire an individual — you gain an entire agency support team backing them with clinical supervision, emergency replacements, and continuous quality audits.
                </p>
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'rgba(17, 26, 46, 0.75)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-xl)',
                padding: '2.25rem',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <h3 style={{ fontSize: '1.25rem', color: '#ffffff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary-400)" strokeWidth="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                The Agency Standard of Care
              </h3>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[
                  {
                    title: 'Direct Accountability',
                    desc: 'Agency coordinators take responsibility for replacements, attendance disputes, and performance.',
                  },
                  {
                    title: 'Dignified Fair Wages',
                    desc: 'Caregivers receive timely, transparent payouts, eliminating financial exploitation and high turnover.',
                  },
                  {
                    title: 'Kerala Nursing Council Standards',
                    desc: 'Clinical nurses hold active state registrations; attendants complete verified geriatric skills training.',
                  },
                  {
                    title: 'Zero Deposit Scams',
                    desc: 'Clear, transparent agency billing with out-of-band verified receipts and no non-refundable registration gimmicks.',
                  },
                ].map((item, idx) => (
                  <li key={idx} style={{ display: 'flex', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(20, 184, 166, 0.2)',
                        color: 'var(--primary-400)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontSize: '0.8rem',
                        fontWeight: 700,
                      }}
                    >
                      ✓
                    </div>
                    <div>
                      <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.9rem' }}>{item.title}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.825rem', lineHeight: 1.5 }}>
                        {item.desc}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* 4-Stage Vetting Protocol */}
          <section id="vetting-protocol" style={{ marginBottom: '5rem' }}>
            <div style={{ textAlign: 'center', maxWidth: '750px', margin: '0 auto 3rem' }}>
              <span className="badge badge-teal" style={{ marginBottom: '0.75rem' }}>
                Uncompromising Safety
              </span>
              <h2 style={{ fontSize: '2.1rem', color: '#ffffff', marginBottom: '0.75rem' }}>
                Our 4-Stage Caregiver Vetting Protocol
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                Only 1 out of every 4 applicants meets our strict standards for background integrity, bedside empathy, and practical competency.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '1.5rem',
              }}
            >
              {[
                {
                  step: '01',
                  title: 'Govt ID & Police Verification',
                  desc: 'Aadhaar biometric authentication and official verification through local Kerala police jurisdiction to ensure zero criminal record.',
                  badge: 'Identity Cleanliness',
                },
                {
                  step: '02',
                  title: 'Practical Skills Assessment',
                  desc: 'In-person evaluation by senior nursing coordinators covering sponge baths, safe patient transfers, bed-sore prevention, and vitals recording.',
                  badge: 'Hands-on Tested',
                },
                {
                  step: '03',
                  title: 'Medical Fitness Screening',
                  desc: 'Health checkups including communicable disease screenings (TB, Hepatitis) and physical fitness certification for lifting and shift stamina.',
                  badge: 'Health Clearance',
                },
                {
                  step: '04',
                  title: 'Live WhatsApp Supervision',
                  desc: 'Digital check-in/check-out logs, automated daily status checkups, and post-service family rating reviews linked to their permanent profile.',
                  badge: 'Ongoing Oversight',
                },
              ].map((stage, idx) => (
                <div
                  key={idx}
                  id={`vetting-card-${stage.step}`}
                  className="feature-card"
                  style={{ position: 'relative' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '1rem',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.75rem',
                        fontWeight: 800,
                        color: 'var(--primary-400)',
                        opacity: 0.9,
                      }}
                    >
                      {stage.step}
                    </span>
                    <span className="badge badge-teal" style={{ fontSize: '0.7rem' }}>
                      {stage.badge}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.15rem', color: '#ffffff', marginBottom: '0.75rem' }}>
                    {stage.title}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                    {stage.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Privacy & Zero Public Signup Architecture Box */}
          <section
            id="privacy-architecture-policy"
            style={{
              marginBottom: '5rem',
              background: 'radial-gradient(circle at top right, rgba(20, 184, 166, 0.12), transparent 70%), rgba(17, 26, 46, 0.75)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-xl)',
              padding: '2.5rem',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '2.5rem',
                alignItems: 'center',
              }}
            >
              <div>
                <span className="badge badge-amber" style={{ marginBottom: '0.75rem' }}>
                  Patient Data Responsibility
                </span>
                <h2 style={{ fontSize: '1.75rem', color: '#ffffff', marginBottom: '1rem' }}>
                  Why We Enforce A Zero Public Signup Architecture
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.65, marginBottom: '1.25rem' }}>
                  Patient medical information (diagnosis, mobility status, catheterization, palliative care stages) involves deeply sensitive health records. We treat data protection as a serious healthcare processor obligation:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--primary-400)', fontWeight: 700 }}>•</span>
                    <span><strong>Database Row-Level Security (RLS):</strong> Hardened PostgreSQL policies guarantee that data from one agency is cryptographically isolated from any other agency.</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--primary-400)', fontWeight: 700 }}>•</span>
                    <span><strong>Caregiver Self-View Only:</strong> Caregivers only receive access to the specific patient assigned to their shift, preventing snooping or directory scraping.</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--primary-400)', fontWeight: 700 }}>•</span>
                    <span><strong>Authorized Staff Provisioning:</strong> No open internet registration. Agency staff and nurses access the platform strictly via single-use, expiring security tokens.</span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: 'rgba(7, 11, 20, 0.75)',
                  border: '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.75rem',
                }}
              >
                <h3 style={{ fontSize: '1.05rem', color: '#ffffff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Access Permission Model
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.85rem' }}>
                  <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '0.65rem' }}>
                    <div style={{ color: 'var(--primary-400)', fontWeight: 600 }}>Super Admin</div>
                    <div style={{ color: 'var(--text-muted)' }}>Platform maintenance & manual out-of-band agency onboarding.</div>
                  </div>
                  <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '0.65rem' }}>
                    <div style={{ color: '#ffffff', fontWeight: 600 }}>Agency Owner & Office Staff</div>
                    <div style={{ color: 'var(--text-muted)' }}>Staff invites, customer CRM, smart matching, and replacement control.</div>
                  </div>
                  <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '0.65rem' }}>
                    <div style={{ color: '#38bdf8', fontWeight: 600 }}>Assigned Caregiver</div>
                    <div style={{ color: 'var(--text-muted)' }}>PWA self-service: only view current assignment & record attendance.</div>
                  </div>
                  <div>
                    <div style={{ color: '#10b981', fontWeight: 600 }}>Client Families</div>
                    <div style={{ color: 'var(--text-muted)' }}>No password or account required; interact via verified intake and WhatsApp.</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Statewide Coverage Section */}
          <section id="statewide-coverage" style={{ marginBottom: '5rem' }}>
            <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 2.5rem' }}>
              <span className="badge badge-teal" style={{ marginBottom: '0.75rem' }}>
                Geographic Presence
              </span>
              <h2 style={{ fontSize: '2rem', color: '#ffffff', marginBottom: '0.75rem' }}>
                Active Across All 14 Kerala Districts
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                With regional hubs in Kochi, Thiruvananthapuram, and Kozhikode, our coordinator network rapidly deploys caregivers to both major city centers and rural panchayats.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: '1rem',
              }}
            >
              {KERALA_DISTRICTS.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: 'rgba(17, 26, 46, 0.6)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <div
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: '#10b981',
                      boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)',
                    }}
                  />
                  <div>
                    <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.9rem' }}>{item.name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{item.hub}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Call to Action */}
          <div
            id="about-cta-card"
            className="glass-panel"
            style={{
              padding: '3rem 2rem',
              textAlign: 'center',
              border: '1px solid var(--border-card)',
            }}
          >
            <h2 style={{ fontSize: '2rem', color: '#ffffff', marginBottom: '0.75rem' }}>
              Have Questions Regarding Your Family’s Care Plan?
            </h2>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '1rem',
                maxWidth: '620px',
                margin: '0 auto 2rem',
                lineHeight: 1.6,
              }}
            >
              Our office coordinators are on call 24 hours a day to discuss your patient’s diagnosis, suggest appropriate care tiers, and arrange emergency caregiver placement.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
              <Link href="/#request-form" id="about-request-btn" className="btn-primary" style={{ padding: '0.85rem 1.85rem' }}>
                <span>Request a Caregiver Online</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
              <Link href="/contact" id="about-contact-btn" className="btn-secondary" style={{ padding: '0.85rem 1.85rem' }}>
                <span>Speak With Coordinator</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
