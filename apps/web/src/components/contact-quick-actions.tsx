import React from 'react';

interface ContactQuickActionsProps {
  phone: string;
  name?: string;
  variant?: 'icons' | 'touch-grid' | 'single-wa';
  idPrefix?: string;
  callId?: string;
  waId?: string;
  callLabel?: string;
  waLabel?: string;
  className?: string;
}

export function ContactQuickActions({
  phone,
  variant = 'icons',
  idPrefix = 'contact',
  callId,
  waId,
  callLabel = 'Call Staff',
  waLabel = 'WhatsApp',
  className = '',
}: ContactQuickActionsProps) {
  const cleanPhone = (phone || '').replace(/[^0-9+]/g, '');
  const cleanWaPhone = (phone || '').replace(/[^0-9]/g, '');

  const waUrl = `https://wa.me/${cleanWaPhone}`;
  const telUrl = `tel:${cleanPhone}`;

  const resolvedCallId = callId || `${idPrefix}-call`;
  const resolvedWaId = waId || `${idPrefix}-wa`;

  if (variant === 'single-wa') {
    return (
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        id={`${idPrefix}-wa`}
        title="Message on WhatsApp"
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '26px',
          height: '26px',
          borderRadius: '6px',
          backgroundColor: 'rgba(37, 211, 102, 0.15)',
          color: '#25d366',
          border: '1px solid rgba(37, 211, 102, 0.3)',
          transition: 'all 0.15s ease',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.697c1.002.547 1.777.848 2.806.848 3.181 0 5.767-2.586 5.768-5.766.001-3.182-2.585-5.77-5.768-5.77zm0 10.366c-.897 0-1.632-.249-2.368-.687l-.17-.101-1.57.412.42-1.53-.111-.176c-.477-.759-.728-1.503-.728-2.518.001-2.535 2.062-4.597 4.598-4.597 2.537 0 4.598 2.062 4.598 4.598 0 2.536-2.061 4.599-4.599 4.599z"/>
        </svg>
      </a>
    );
  }

  if (variant === 'touch-grid') {
    return (
      <div
        className={className}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.5rem',
          marginTop: '0.25rem',
        }}
      >
        <a
          href={telUrl}
          id={resolvedCallId}
          style={{
            padding: '0.55rem',
            fontSize: '0.825rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            color: '#0369a1',
            backgroundColor: 'rgba(2, 132, 199, 0.12)',
            border: '1px solid rgba(2, 132, 199, 0.35)',
            borderRadius: 'var(--radius-md)',
            textDecoration: 'none',
            minHeight: '44px',
          }}
        >
          <span>📞 {callLabel}</span>
        </a>

        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          id={resolvedWaId}
          style={{
            padding: '0.55rem',
            fontSize: '0.825rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            color: '#ffffff',
            backgroundColor: '#16a34a',
            border: '1px solid #22c55e',
            borderRadius: 'var(--radius-md)',
            textDecoration: 'none',
            minHeight: '44px',
            boxShadow: '0 2px 8px rgba(34, 197, 94, 0.25)',
          }}
        >
          <span>💬 {waLabel}</span>
        </a>
      </div>
    );
  }

  // Default: 'icons'
  return (
    <div className={className} style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
      <a
        href={telUrl}
        id={`${idPrefix}-call-icon`}
        title="Call Staff"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '26px',
          height: '26px',
          borderRadius: '6px',
          backgroundColor: 'rgba(56, 189, 248, 0.15)',
          color: '#38bdf8',
          border: '1px solid rgba(56, 189, 248, 0.3)',
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
      </a>

      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        id={`${idPrefix}-wa-icon`}
        title="Message on WhatsApp"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '26px',
          height: '26px',
          borderRadius: '6px',
          backgroundColor: 'rgba(37, 211, 102, 0.15)',
          color: '#25d366',
          border: '1px solid rgba(37, 211, 102, 0.3)',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.697c1.002.547 1.777.848 2.806.848 3.181 0 5.767-2.586 5.768-5.766.001-3.182-2.585-5.77-5.768-5.77zm0 10.366c-.897 0-1.632-.249-2.368-.687l-.17-.101-1.57.412.42-1.53-.111-.176c-.477-.759-.728-1.503-.728-2.518.001-2.535 2.062-4.597 4.598-4.597 2.537 0 4.598 2.062 4.598 4.598 0 2.536-2.061 4.599-4.599 4.599z"/>
        </svg>
      </a>
    </div>
  );
}
