import React from 'react';
import {
  STATUS_CONFIG,
  CaregiverStatusType,
  CAREGIVER_STATUS_LIST,
} from '../constants/caregiver-status';

interface CaregiverStatusBadgeProps {
  status: CaregiverStatusType | string;
  showDot?: boolean;
  size?: 'sm' | 'md';
  interactive?: boolean;
  onChange?: (newStatus: CaregiverStatusType) => void;
  id?: string;
  className?: string;
}

export function CaregiverStatusBadge({
  status,
  showDot = true,
  size = 'sm',
  interactive = false,
  onChange,
  id,
  className = '',
}: CaregiverStatusBadgeProps) {
  const statusKey = (status as CaregiverStatusType) in STATUS_CONFIG
    ? (status as CaregiverStatusType)
    : 'available';
  const cfg = STATUS_CONFIG[statusKey];

  if (interactive && onChange) {
    return (
      <select
        id={id}
        value={statusKey}
        onChange={(e) => onChange(e.target.value as CaregiverStatusType)}
        className={className}
        style={{
          background: cfg.bgBadge,
          color: cfg.textColor,
          border: `1px solid ${cfg.borderBadge}`,
          borderRadius: 'var(--radius-full)',
          fontSize: size === 'sm' ? '0.725rem' : '0.775rem',
          fontWeight: 600,
          padding: size === 'sm' ? '0.2rem 0.5rem' : '0.25rem 0.65rem',
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        {CAREGIVER_STATUS_LIST.map((st) => (
          <option key={st} value={st} style={{ background: '#0f172a', color: '#ffffff' }}>
            {STATUS_CONFIG[st].label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <span
      id={id}
      className={className}
      style={{
        fontSize: size === 'sm' ? '0.7rem' : '0.75rem',
        padding: size === 'sm' ? '0.175rem 0.475rem' : '0.25rem 0.65rem',
        borderRadius: 'var(--radius-full)',
        fontWeight: 600,
        textTransform: 'capitalize',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        backgroundColor: cfg.bgBadge,
        color: cfg.textColor,
        border: `1px solid ${cfg.borderBadge}`,
      }}
    >
      {showDot && (
        <span
          style={{
            width: size === 'sm' ? '6px' : '7px',
            height: size === 'sm' ? '6px' : '7px',
            borderRadius: '50%',
            backgroundColor: cfg.dotColor,
            flexShrink: 0,
          }}
        />
      )}
      <span>{cfg.label}</span>
    </span>
  );
}
