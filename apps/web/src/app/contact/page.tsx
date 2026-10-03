'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Navbar from '../../components/navbar';
import Footer from '../../components/footer';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    district: 'Ernakulam (Kochi)',
    callbackTime: 'immediate',
    serviceNeeded: 'elderly_care',
    message: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      setErrorMsg('Please enter your name and contact phone number.');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);

    // Simulate instant receipt & coordination logging
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      <main style={{ flex: 1, padding: '2.5rem 1.5rem 5rem' }}>
        <div style={{ maxWidth: '1150px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <div style={{ display: 'inline-block', marginBottom: '1rem' }}>
              <span className="badge badge-teal" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
                ✦ 24/7 Agency Helpline & District Field Coordinators
              </span>
            </div>
            <h1
              style={{
                fontSize: 'clamp(2.2rem, 4.5vw, 3.4rem)',
                fontWeight: 800,
                color: '#ffffff',
                lineHeight: 1.15,
                marginBottom: '1rem',
              }}
            >
              We’re Here When Your Family <br />
              <span className="gradient-text">Needs Dependable Care</span>
            </h1>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '1.1rem',
                maxWidth: '720px',
                margin: '0 auto',
                lineHeight: 1.6,
              }}
            >
              Whether you need urgent caregiver placement for an immediate hospital discharge or have questions about care plans, our office coordinators respond promptly across Kerala.
            </p>
          </div>

          {/* Quick Contact Cards */}
          <div
            id="contact-quick-cards"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1.5rem',
              marginBottom: '4rem',
            }}
          >
            {/* Card 1: 24/7 Emergency Line */}
            <div className="feature-card" style={{ padding: '1.75rem' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </div>
              <h3 style={{ fontSize: '1.15rem', color: '#ffffff', marginBottom: '0.35rem' }}>
                Emergency Care Hotline
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                For immediate discharges & 60-min urgent dispatch.
              </p>
              <a
                href="tel:+919876543210"
                id="contact-call-btn"
                style={{
                  color: 'var(--primary-400)',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                +91 98765 43210 &rarr;
              </a>
            </div>

            {/* Card 2: WhatsApp Chat */}
            <div className="feature-card" style={{ padding: '1.75rem' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(37, 211, 102, 0.15)',
                  border: '1px solid rgba(37, 211, 102, 0.3)',
                  color: '#25d366',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.969.585 1.761.895 2.796.896h.005c3.181 0 5.767-2.586 5.768-5.766.001-1.54-.597-2.988-1.686-4.077-1.089-1.089-2.537-1.688-4.077-1.688zm0-1.872c4.218 0 7.64 3.422 7.64 7.638 0 2.042-.796 3.962-2.242 5.408s-3.366 2.23-5.398 2.23h-.006c-1.31 0-2.597-.34-3.729-.984l-4.148 1.088 1.107-4.045c-.71-1.222-1.085-2.614-1.085-4.041 0-4.216 3.422-7.638 7.64-7.638zm-3.295 4.398c-.183-.406-.375-.414-.548-.422-.142-.006-.304-.006-.467-.006s-.427.061-.65.305c-.223.244-.853.833-.853 2.032 0 1.199.873 2.358.995 2.521.122.163 1.685 2.688 4.144 3.655 2.044.804 2.459.644 2.906.604.447-.041 1.442-.589 1.645-1.159.203-.569.203-1.057.142-1.159-.061-.102-.223-.163-.467-.285-.244-.122-1.442-.711-1.666-.793-.223-.081-.386-.122-.548.122-.163.244-.63 1.159-.772 1.321-.142.163-.284.183-.528.061-.244-.122-1.03-.38-1.963-1.211-.726-.648-1.216-1.449-1.358-1.693-.142-.244-.015-.376.107-.498.11-.11.244-.285.366-.427.122-.142.163-.244.244-.406.081-.163.041-.305-.02-.427-.061-.122-.534-1.322-.743-1.782z" />
                </svg>
              </div>
              <h3 style={{ fontSize: '1.15rem', color: '#ffffff', marginBottom: '0.35rem' }}>
                WhatsApp Fast Desk
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                Send requirements, doctor discharge notes & get quotes.
              </p>
              <a
                href="https://wa.me/919876543210?text=Hello%2C%20I%20would%20like%20to%20enquire%20about%20caregiver%20services."
                target="_blank"
                rel="noreferrer"
                id="contact-whatsapp-btn"
                style={{
                  color: '#25d366',
                  fontWeight: 700,
                  fontSize: '1.05rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                Chat on WhatsApp &rarr;
              </a>
            </div>

            {/* Card 3: Office Operating Desk */}
            <div className="feature-card" style={{ padding: '1.75rem' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  color: '#38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h3 style={{ fontSize: '1.15rem', color: '#ffffff', marginBottom: '0.35rem' }}>
                Office Coordinator Hours
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                Monday to Sunday: 7:30 AM – 9:00 PM IST
              </p>
              <div style={{ color: '#ffffff', fontSize: '0.9rem', fontWeight: 600 }}>
                24/7 Continuous Emergency Standby
              </div>
            </div>
          </div>

          {/* Direct Wizard Notice Banner */}
          <div
            style={{
              backgroundColor: 'rgba(20, 184, 166, 0.1)',
              border: '1px solid rgba(20, 184, 166, 0.3)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem 1.75rem',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              marginBottom: '4rem',
            }}
          >
            <div>
              <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.2rem' }}>
                Need to book a specific caregiver profile immediately?
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Skip general inquiries and submit your patient’s exact details, location, and shift preference directly into our automated dispatch queue.
              </div>
            </div>
            <Link href="/#request-form" id="contact-open-wizard-btn" className="btn-primary" style={{ padding: '0.65rem 1.35rem', fontSize: '0.875rem' }}>
              <span>Open Booking Wizard</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          </div>

          {/* Form & Regional Hubs Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '2.5rem',
              marginBottom: '5rem',
            }}
          >
            {/* Left Column: General Inquiry / Callback Form */}
            <div
              className="glass-panel"
              style={{
                padding: '2.25rem',
                border: '1px solid var(--border-card)',
              }}
            >
              <h2 style={{ fontSize: '1.5rem', color: '#ffffff', marginBottom: '0.5rem' }}>
                Send an Inquiry / Request a Callback
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
                Have general questions or need guidance on caregiver qualifications? Leave your number and our clinical coordinator will call you.
              </p>

              {submitted ? (
                <div
                  id="contact-form-success"
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    padding: '2rem 1.5rem',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(16, 185, 129, 0.2)',
                      color: '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 1rem',
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h3 style={{ color: '#ffffff', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                    Inquiry Received!
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                    Thank you, <strong style={{ color: '#ffffff' }}>{formData.name}</strong>. An agency care coordinator will call you at <strong style={{ color: 'var(--primary-400)' }}>{formData.phone}</strong> shortly.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({
                        name: '',
                        phone: '',
                        district: 'Ernakulam (Kochi)',
                        callbackTime: 'immediate',
                        serviceNeeded: 'elderly_care',
                        message: '',
                      });
                    }}
                    className="btn-secondary"
                    style={{ fontSize: '0.85rem' }}
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {errorMsg && (
                    <div
                      style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.75rem 1rem',
                        color: '#f87171',
                        fontSize: '0.85rem',
                      }}
                    >
                      {errorMsg}
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Your Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Suresh Kumar"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number (WhatsApp Preferred) *</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +91 98470 12345"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">District in Kerala</label>
                      <select
                        value={formData.district}
                        onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                        className="form-select"
                      >
                        <option value="Ernakulam (Kochi)">Ernakulam (Kochi)</option>
                        <option value="Thiruvananthapuram">Thiruvananthapuram</option>
                        <option value="Thrissur">Thrissur</option>
                        <option value="Kozhikode">Kozhikode</option>
                        <option value="Kottayam">Kottayam</option>
                        <option value="Kollam">Kollam</option>
                        <option value="Palakkad">Palakkad</option>
                        <option value="Malappuram">Malappuram</option>
                        <option value="Alappuzha">Alappuzha</option>
                        <option value="Kannur">Kannur</option>
                        <option value="Pathanamthitta">Pathanamthitta</option>
                        <option value="Idukki">Idukki</option>
                        <option value="Kasaragod">Kasaragod</option>
                        <option value="Wayanad">Wayanad</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Preferred Callback Time</label>
                      <select
                        value={formData.callbackTime}
                        onChange={(e) => setFormData({ ...formData, callbackTime: e.target.value })}
                        className="form-select"
                      >
                        <option value="immediate">Immediate (Urgent)</option>
                        <option value="morning">Morning (9 AM – 12 PM)</option>
                        <option value="afternoon">Afternoon (12 PM – 4 PM)</option>
                        <option value="evening">Evening (4 PM – 8 PM)</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Service Type</label>
                    <select
                      value={formData.serviceNeeded}
                      onChange={(e) => setFormData({ ...formData, serviceNeeded: e.target.value })}
                      className="form-select"
                    >
                      <option value="elderly_care">Elderly Daily Assistance</option>
                      <option value="bedridden_care">Bedridden & Palliative Care</option>
                      <option value="post_op">Post-Operative Recovery</option>
                      <option value="dementia_care">Dementia & Alzheimer’s Care</option>
                      <option value="specialized_nursing">Specialized Clinical Nursing</option>
                      <option value="mother_baby">Mother & Newborn Postnatal Care</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Patient Details & Questions</label>
                    <textarea
                      rows={3}
                      placeholder="Briefly describe patient age, condition, mobility, or any special requirements..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="form-textarea"
                    />
                  </div>

                  <button
                    type="submit"
                    id="contact-form-submit-btn"
                    disabled={submitting}
                    className="btn-primary"
                    style={{ padding: '0.85rem', width: '100%', justifyContent: 'center' }}
                  >
                    {submitting ? 'Connecting With Coordinator...' : 'Request Callback'}
                  </button>
                </form>
              )}
            </div>

            {/* Right Column: Regional Hubs & Dispatch Centers */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div
                style={{
                  backgroundColor: 'rgba(17, 26, 46, 0.75)',
                  border: '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '2rem',
                }}
              >
                <h3 style={{ fontSize: '1.25rem', color: '#ffffff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-400)" strokeWidth="2.2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  Regional Coordination Offices
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Central Hub */}
                  <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <strong style={{ color: '#ffffff', fontSize: '0.95rem' }}>Central Kerala (Kochi Hub)</strong>
                      <span className="badge badge-teal" style={{ fontSize: '0.7rem' }}>HQ & Dispatch</span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                      2nd Floor, Healthcare Towers, MG Road / Marine Drive, Kochi, Ernakulam – 682011
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.775rem', marginTop: '0.25rem' }}>
                      Serving: Ernakulam, Thrissur, Kottayam, Idukki, Alappuzha
                    </p>
                  </div>

                  {/* South Hub */}
                  <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <strong style={{ color: '#ffffff', fontSize: '0.95rem' }}>South Kerala (Trivandrum Hub)</strong>
                      <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>Regional Office</span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                      Santhi Nagar, Near Medical College / Pattom, Thiruvananthapuram – 695004
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.775rem', marginTop: '0.25rem' }}>
                      Serving: Thiruvananthapuram, Kollam, Pathanamthitta
                    </p>
                  </div>

                  {/* North Hub */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <strong style={{ color: '#ffffff', fontSize: '0.95rem' }}>North Kerala (Kozhikode Hub)</strong>
                      <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>Regional Office</span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                      Arayidathupalam / Mavoor Road, Kozhikode – 673004
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.775rem', marginTop: '0.25rem' }}>
                      Serving: Kozhikode, Malappuram, Palakkad, Wayanad, Kannur, Kasaragod
                    </p>
                  </div>
                </div>
              </div>

              {/* Acute Emergency Disclaimer */}
              <div
                style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.5rem',
                }}
              >
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.2" style={{ flexShrink: 0, marginTop: '2px' }}>
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <div>
                    <h4 style={{ color: '#fbbf24', fontSize: '0.95rem', marginBottom: '0.35rem' }}>
                      Acute Medical Emergency Notice
                    </h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', lineHeight: 1.5 }}>
                      Home caregivers and bedside attendants provide supportive non-acute recovery and daily care. In case of sudden stroke, acute chest pain, or severe respiratory distress, immediately dial <strong style={{ color: '#ffffff' }}>108</strong> (Kerala Emergency Ambulance Service) or transport the patient to the nearest hospital casualty.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
