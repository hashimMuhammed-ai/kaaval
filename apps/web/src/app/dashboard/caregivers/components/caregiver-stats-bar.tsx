import React from 'react';
import { STATUS_CONFIG } from '../../../../constants/caregiver-status';
import { CaregiverStatusCounts } from '../../../../types/caregiver';

interface CaregiverStatsBarProps {
  counts: CaregiverStatusCounts;
}

export function CaregiverStatsBar({ counts }: CaregiverStatsBarProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1rem',
      }}
    >
      {/* Available Card */}
      <div
        className="glass-panel"
        style={{
          padding: '1.25rem 1.4rem',
          borderLeft: `4px solid ${STATUS_CONFIG.available.accentColor}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Available
          </span>
          <span className="pulse-dot" style={{ backgroundColor: STATUS_CONFIG.available.dotColor }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {counts.available}
          </span>
          <span style={{ fontSize: '0.75rem', color: STATUS_CONFIG.available.textColor }}>
            Ready for placement
          </span>
        </div>
      </div>

      {/* Assigned Card */}
      <div
        className="glass-panel"
        style={{
          padding: '1.25rem 1.4rem',
          borderLeft: `4px solid ${STATUS_CONFIG.assigned.accentColor}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Assigned
          </span>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: STATUS_CONFIG.assigned.dotColor }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {counts.assigned}
          </span>
          <span style={{ fontSize: '0.75rem', color: STATUS_CONFIG.assigned.textColor }}>
            Active on care duties
          </span>
        </div>
      </div>

      {/* On Leave Card */}
      <div
        className="glass-panel"
        style={{
          padding: '1.25rem 1.4rem',
          borderLeft: `4px solid ${STATUS_CONFIG.on_leave.accentColor}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            On Leave
          </span>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: STATUS_CONFIG.on_leave.dotColor }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {counts.on_leave}
          </span>
          <span style={{ fontSize: '0.75rem', color: STATUS_CONFIG.on_leave.textColor }}>
            Temporary absence
          </span>
        </div>
      </div>

      {/* Inactive Card */}
      <div
        className="glass-panel"
        style={{
          padding: '1.25rem 1.4rem',
          borderLeft: `4px solid ${STATUS_CONFIG.inactive.accentColor}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Inactive
          </span>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: STATUS_CONFIG.inactive.dotColor }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {counts.inactive}
          </span>
          <span style={{ fontSize: '0.75rem', color: STATUS_CONFIG.inactive.textColor }}>
            Off-duty / suspended
          </span>
        </div>
      </div>

      {/* Occupancy Metric */}
      <div
        className="glass-panel"
        style={{
          padding: '1.25rem 1.4rem',
          background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.08), #ffffff)',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase' }}>
            Workforce Occupancy
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Total: {counts.total}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {counts.occupancyRate}%
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            assigned / active pool
          </span>
        </div>
      </div>
    </div>
  );
}
