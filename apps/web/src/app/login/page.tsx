'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/navbar';
import Footer from '../../components/footer';
import { getSubdomain } from '../../utils/subdomain';

export default function LoginPage() {
  const router = useRouter();
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [agencyTitle, setAgencyTitle] = useState<string>('Agency Portal Login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const sub = getSubdomain();
    setSubdomain(sub);
    if (sub) {
      const formatted = sub
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      setAgencyTitle(`${formatted} Staff & Caregiver Portal`);
    } else {
      setAgencyTitle('Caregiver Agency Platform Login');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);

    try {
      // Determine backend API host
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

      const res = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(subdomain ? { 'x-tenant-subdomain': subdomain } : {}),
        },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || 'Login failed. Invalid email or password.');
      }

      // Store JWT token and user info
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', data.accessToken);
        localStorage.setItem('user_profile', JSON.stringify(data.user));
      }

      setSuccessMsg(`Welcome, ${data.user?.name || 'User'}! Redirecting...`);

      // Role-based redirection
      setTimeout(() => {
        const role = data.user?.role;
        if (role === 'caregiver') {
          router.push('/portal');
        } else if (role === 'super_admin') {
          router.push('/super-admin');
        } else {
          router.push('/dashboard');
        }
      }, 700);
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to connect to authentication service. Please check your credentials or contact your agency owner.'
      );
    } finally {
      setLoading(false);
    }
  };

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
          id="login-card"
          className="glass-panel"
          style={{
            width: '100%',
            maxWidth: '460px',
            padding: '2.5rem',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #14b8a6, #0f766e)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
                boxShadow: '0 8px 20px rgba(20, 184, 166, 0.35)',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>

            <h1 style={{ fontSize: '1.6rem', color: '#ffffff', marginBottom: '0.4rem' }}>
              Staff & Caregiver Login
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              {agencyTitle}
            </p>
          </div>

          {error && (
            <div
              id="login-error-banner"
              style={{
                padding: '0.85rem 1rem',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                color: '#fca5a5',
                fontSize: '0.875rem',
                marginBottom: '1.5rem',
              }}
            >
              {error}
            </div>
          )}

          {successMsg && (
            <div
              id="login-success-banner"
              style={{
                padding: '0.85rem 1rem',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 'var(--radius-md)',
                color: '#6ee7b7',
                fontSize: '0.875rem',
                marginBottom: '1.5rem',
              }}
            >
              {successMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin}>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label htmlFor="login-email" className="form-label">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                placeholder="name@agency.com"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="login-password" className="form-label">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary-400)',
                    fontSize: '0.775rem',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              id="login-submit-btn"
              className="btn-primary"
              disabled={loading}
              style={{ width: '100%', padding: '0.85rem' }}
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Explicit Notice: No Public Registration */}
          <div
            style={{
              marginTop: '2rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
              <strong style={{ color: 'var(--text-secondary)' }}>Looking to hire a caregiver?</strong> Families and patients do not need to register.
            </p>
            <Link
              href="/#request-form"
              id="goto-request-btn"
              className="btn-secondary"
              style={{
                display: 'inline-flex',
                fontSize: '0.85rem',
                padding: '0.5rem 1rem',
              }}
            >
              <span>Submit Caregiver Request</span> &rarr;
            </Link>

            <div
              style={{
                marginTop: '1.25rem',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                lineHeight: 1.4,
              }}
            >
              Accounts are provisioned by agency management. Zero public signup.
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
