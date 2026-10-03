'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      // Auto-reload after a brief pause when connection recovers
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    setIsRetrying(true);
    if (navigator.onLine) {
      window.location.reload();
    } else {
      setTimeout(() => {
        setIsRetrying(false);
      }, 800);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Healthcare Emblem & Offline Signal */}
        <div style={iconWrapperStyle}>
          <svg
            width="44"
            height="44"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--primary-400)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.58 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
          </svg>
        </div>

        {isOnline ? (
          <div style={onlineBadgeStyle}>
            <span style={pulseGreenStyle} />
            <span>Connection Restored! Reconnecting...</span>
          </div>
        ) : (
          <div style={offlineBadgeStyle}>
            <span style={pulseAmberStyle} />
            <span>Device Offline</span>
          </div>
        )}

        <h1 style={titleStyle}>No Internet Connection</h1>
        <p style={subtitleStyle}>
          You are currently offline. The Caregiver Agency Platform cached shell
          is active, but real-time data synchronization and new requests require
          an active internet connection.
        </p>

        {/* Emergency & Reassurance Section */}
        <div style={emergencyBoxStyle}>
          <div style={emergencyHeaderStyle}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <strong>Urgent Patient or Caregiver Assistance?</strong>
          </div>
          <p style={emergencyTextStyle}>
            If you need urgent medical support, emergency care coordination, or
            immediate caregiver replacement, please dial the 24/7 Agency
            Helpline directly:
          </p>
          <a
            href="tel:+919876543210"
            id="emergency-call-btn"
            style={emergencyCallBtnStyle}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <span>Call 24/7 Helpline: +91 98765 43210</span>
          </a>
        </div>

        {/* Action Controls */}
        <div style={actionsContainerStyle}>
          <button
            id="offline-retry-btn"
            onClick={handleRetry}
            disabled={isRetrying}
            style={retryButtonStyle}
          >
            {isRetrying ? 'Checking Network...' : 'Retry Connection'}
          </button>
          <Link href="/" id="offline-home-link" style={homeLinkStyle}>
            Return to Home
          </Link>
        </div>

        {/* Diagnostic list */}
        <div style={tipsListStyle}>
          <div style={tipItemStyle}>
            <span style={bulletStyle}>•</span>
            <span>Check your Wi-Fi, cellular data, or airplane mode settings.</span>
          </div>
          <div style={tipItemStyle}>
            <span style={bulletStyle}>•</span>
            <span>
              Previously saved client requests and caregiver logs are safe on your
              device.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Inline Styles leveraging design tokens from global.css
const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1.5rem',
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '560px',
  background: 'var(--bg-glass-card)',
  border: '1px solid var(--border-card)',
  borderRadius: 'var(--radius-xl)',
  backdropFilter: 'blur(20px)',
  padding: '2.5rem',
  boxShadow: 'var(--shadow-card)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
};

const iconWrapperStyle: React.CSSProperties = {
  width: '84px',
  height: '84px',
  borderRadius: '50%',
  background: 'rgba(20, 184, 166, 0.1)',
  border: '1px solid rgba(20, 184, 166, 0.3)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '1.25rem',
  boxShadow: 'var(--shadow-glow)',
};

const offlineBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.35rem 0.85rem',
  borderRadius: 'var(--radius-full)',
  background: 'rgba(245, 158, 11, 0.12)',
  border: '1px solid rgba(245, 158, 11, 0.25)',
  color: 'var(--status-warning)',
  fontSize: '0.8125rem',
  fontWeight: 600,
  marginBottom: '1rem',
};

const onlineBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.35rem 0.85rem',
  borderRadius: 'var(--radius-full)',
  background: 'rgba(16, 185, 129, 0.15)',
  border: '1px solid rgba(16, 185, 129, 0.3)',
  color: 'var(--status-success)',
  fontSize: '0.8125rem',
  fontWeight: 600,
  marginBottom: '1rem',
};

const pulseAmberStyle: React.CSSProperties = {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: 'var(--status-warning)',
  boxShadow: '0 0 8px var(--status-warning)',
};

const pulseGreenStyle: React.CSSProperties = {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: 'var(--status-success)',
  boxShadow: '0 0 8px var(--status-success)',
};

const titleStyle: React.CSSProperties = {
  fontSize: '1.75rem',
  fontWeight: 700,
  color: 'var(--text-main)',
  marginBottom: '0.75rem',
  letterSpacing: '-0.02em',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '0.95rem',
  color: 'var(--text-secondary)',
  lineHeight: 1.6,
  marginBottom: '1.75rem',
};

const emergencyBoxStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(11, 17, 32, 0.75)',
  border: '1px solid rgba(245, 158, 11, 0.25)',
  borderRadius: 'var(--radius-lg)',
  padding: '1.25rem',
  marginBottom: '1.75rem',
  textAlign: 'left',
};

const emergencyHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  color: '#f59e0b',
  fontSize: '0.925rem',
  marginBottom: '0.5rem',
};

const emergencyTextStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  color: 'var(--text-secondary)',
  marginBottom: '0.85rem',
  lineHeight: 1.5,
};

const emergencyCallBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  width: '100%',
  padding: '0.75rem 1rem',
  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
  color: '#ffffff',
  borderRadius: 'var(--radius-md)',
  fontWeight: 600,
  fontSize: '0.9rem',
  textDecoration: 'none',
  boxShadow: '0 4px 12px rgba(217, 119, 6, 0.25)',
};

const actionsContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.85rem',
  width: '100%',
  marginBottom: '1.5rem',
};

const retryButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: '0.75rem 1.25rem',
  background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))',
  color: '#ffffff',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  fontWeight: 600,
  fontSize: '0.95rem',
  cursor: 'pointer',
  boxShadow: '0 4px 14px var(--primary-glow)',
  transition: 'transform 0.15s ease',
};

const homeLinkStyle: React.CSSProperties = {
  flex: 1,
  padding: '0.75rem 1.25rem',
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-card)',
  color: 'var(--text-main)',
  borderRadius: 'var(--radius-md)',
  fontWeight: 600,
  fontSize: '0.95rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textDecoration: 'none',
};

const tipsListStyle: React.CSSProperties = {
  width: '100%',
  textAlign: 'left',
  borderTop: '1px solid var(--border-subtle)',
  paddingTop: '1.25rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  fontSize: '0.8125rem',
  color: 'var(--text-muted)',
};

const tipItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '0.5rem',
};

const bulletStyle: React.CSSProperties = {
  color: 'var(--primary-400)',
  fontWeight: 700,
};
