import React, { useState } from 'react';
import { TemporaryCredentials } from '../types/caregiver';

interface CredentialsModalProps {
  isOpen: boolean;
  data: TemporaryCredentials | null;
  title?: string;
  description?: string;
  onClose: () => void;
}

export function CredentialsModal({
  isOpen,
  data,
  title = 'Portal Credentials Refreshed',
  description = 'Share this updated password with the caregiver:',
  onClose,
}: CredentialsModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !data) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(
      `Portal: ${data.portalUrl}\nUser: ${data.username}\nPassword: ${data.temporaryPassword}\nAccess Code: ${data.accessCode}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 150,
        padding: '1rem',
      }}
    >
      <div
        className="glass-panel"
        style={{
          maxWidth: '480px',
          width: '100%',
          padding: '2rem',
          backgroundColor: 'var(--bg-surface-elevated)',
        }}
      >
        <h3 style={{ fontSize: '1.25rem', color: '#ffffff', marginBottom: '0.5rem' }}>
          {title}
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          {description}
        </p>

        <div
          style={{
            backgroundColor: 'rgba(7, 11, 20, 0.85)',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            fontFamily: 'monospace',
            fontSize: '0.85rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <div>User: {data.username}</div>
          <div>Password: <strong style={{ color: '#fbbf24' }}>{data.temporaryPassword}</strong></div>
          <div>Access Code: {data.accessCode}</div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={handleCopy}
            className="btn-secondary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>

          <button
            onClick={onClose}
            className="btn-primary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
