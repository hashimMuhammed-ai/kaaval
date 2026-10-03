import React from 'react';
import { CaregiverStatusType } from '../../../../constants/caregiver-status';
import { Caregiver } from '../../../../types/caregiver';
import { CaregiverStatusBadge } from '../../../../components/caregiver-status-badge';

interface CaregiverTableViewProps {
  caregivers: Caregiver[];
  onOpenDrawer: (cg: Caregiver) => void;
  onStatusChange: (caregiverId: string, newStatus: CaregiverStatusType) => void;
}

export function CaregiverTableView({
  caregivers,
  onOpenDrawer,
  onStatusChange,
}: CaregiverTableViewProps) {
  return (
    <div className="glass-panel" style={{ overflowX: 'auto', padding: '0.5rem' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-card)', color: 'var(--text-secondary)' }}>
            <th style={{ padding: '1rem' }}>Caregiver</th>
            <th style={{ padding: '1rem' }}>Status</th>
            <th style={{ padding: '1rem' }}>Location</th>
            <th style={{ padding: '1rem' }}>Skills & Experience</th>
            <th style={{ padding: '1rem' }}>Daily Rate</th>
            <th style={{ padding: '1rem' }}>Documents</th>
            <th style={{ padding: '1rem', textAlign: 'right' }}>Quick Actions</th>
          </tr>
        </thead>
        <tbody>
          {caregivers.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No caregivers match the filter criteria.
              </td>
            </tr>
          ) : (
            caregivers.map((cg) => {
              return (
                <tr
                  key={cg.id}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '1rem' }}>
                    <div
                      onClick={() => onOpenDrawer(cg)}
                      style={{ fontWeight: 600, color: '#ffffff', cursor: 'pointer' }}
                    >
                      {cg.fullName}
                    </div>
                    <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>{cg.phone}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem', fontSize: '0.72rem' }}>
                      <span style={{ color: '#fbbf24', fontWeight: 600 }}>
                        ★ {cg.averageRating ? Number(cg.averageRating).toFixed(1) : 'New'}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        ({cg.totalRatings || 0} {cg.totalRatings === 1 ? 'review' : 'reviews'}) • {cg.jobsCompleted || 0} {cg.jobsCompleted === 1 ? 'job' : 'jobs'}
                      </span>
                    </div>
                  </td>

                  <td style={{ padding: '1rem' }}>
                    <CaregiverStatusBadge
                      status={cg.status}
                      interactive
                      onChange={(st) => onStatusChange(cg.id, st)}
                      id={`table-status-select-${cg.id}`}
                    />
                  </td>

                  <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                    <div>{cg.district || 'Kerala'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cg.city || '—'}</div>
                  </td>

                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', maxWidth: '320px' }}>
                      {(cg.skills || []).slice(0, 3).map((sk: string) => (
                        <span
                          key={sk}
                          style={{
                            fontSize: '0.7rem',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            color: 'var(--primary-400)',
                          }}
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {cg.experienceYears} yrs experience
                    </div>
                  </td>

                  <td style={{ padding: '1rem', fontWeight: 600, color: '#ffffff' }}>
                    ₹{cg.dailyRate} / day
                  </td>

                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ fontSize: '0.8rem', color: '#ffffff' }}>
                        📜 {cg.documents?.length || 0} {cg.documents?.length === 1 ? 'file' : 'files'}
                      </span>
                      {cg.documents?.some((d: any) => d.expiryStatus === 'expired') ? (
                        <span style={{ fontSize: '0.675rem', color: '#f87171', fontWeight: 600 }}>
                          ✕ Expired doc
                        </span>
                      ) : cg.documents?.some((d: any) => d.expiryStatus === 'expiring_soon') ? (
                        <span style={{ fontSize: '0.675rem', color: '#fbbf24', fontWeight: 600 }}>
                          ⚠️ Expiry soon
                        </span>
                      ) : cg.documents && cg.documents.length > 0 && cg.documents.every((d: any) => d.verified) ? (
                        <span style={{ fontSize: '0.675rem', color: '#34d399' }}>
                          ✓ All verified
                        </span>
                      ) : null}
                    </div>
                  </td>

                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => onOpenDrawer(cg)}
                        className="btn-secondary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.775rem' }}
                      >
                        Details
                      </button>
                      <a
                        href={`https://wa.me/${cg.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-whatsapp"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.775rem' }}
                      >
                        WhatsApp
                      </a>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
