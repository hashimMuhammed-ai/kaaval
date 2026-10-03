import React from 'react';
import { STATUS_CONFIG, CaregiverStatusType } from '../../../../constants/caregiver-status';
import { Caregiver } from '../../../../types/caregiver';
import { ContactQuickActions } from '../../../../components/contact-quick-actions';

interface CaregiverBoardViewProps {
  columnData: Record<CaregiverStatusType, Caregiver[]>;
  dragOverColumn: CaregiverStatusType | null;
  onDragOver: (e: React.DragEvent, col: CaregiverStatusType) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, col: CaregiverStatusType) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onOpenDrawer: (cg: Caregiver) => void;
  onStatusChange: (caregiverId: string, newStatus: CaregiverStatusType) => void;
}

export function CaregiverBoardView({
  columnData,
  dragOverColumn,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onOpenDrawer,
  onStatusChange,
}: CaregiverBoardViewProps) {
  return (
    <div className="status-board-grid">
      {(['available', 'assigned', 'on_leave', 'inactive'] as CaregiverStatusType[]).map(
        (statusKey) => {
          const cfg = STATUS_CONFIG[statusKey];
          const list = columnData[statusKey] || [];
          const isOver = dragOverColumn === statusKey;

          return (
            <div
              key={statusKey}
              onDragOver={(e) => onDragOver(e, statusKey)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, statusKey)}
              className={`status-column ${isOver ? 'drag-over' : ''}`}
            >
              {/* Column Header */}
              <div
                style={{
                  padding: '1.15rem 1.25rem',
                  borderBottom: '1px solid #e2e8f0',
                  borderTop: `3px solid ${cfg.accentColor}`,
                  borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
                  backgroundColor: '#ffffff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: cfg.dotColor }} />
                    <h2 style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 700 }}>
                      {cfg.label}
                    </h2>
                  </div>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.55rem',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: cfg.bgBadge,
                      border: `1px solid ${cfg.borderBadge}`,
                      color: cfg.textColor,
                    }}
                  >
                    {list.length}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {cfg.description}
                </div>
              </div>

              {/* Cards List / Drop Target */}
              <div
                style={{
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  flex: 1,
                }}
              >
                {list.length === 0 ? (
                  <div
                    style={{
                      padding: '2.5rem 1rem',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '0.8rem',
                      border: '1px dashed var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    Drop caregiver cards here
                  </div>
                ) : (
                  list.map((cg) => {
                    const initials = cg.fullName
                      ? cg.fullName
                          .split(' ')
                          .map((n: string) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()
                      : 'CG';

                    return (
                      <div
                        key={cg.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, cg.id)}
                        className="caregiver-board-card"
                      >
                        {/* Card Top: Avatar & Name */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
                            <div
                              style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '50%',
                                backgroundColor: 'rgba(20, 184, 166, 0.2)',
                                border: '1px solid rgba(20, 184, 166, 0.4)',
                                color: 'var(--primary-400)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                              }}
                            >
                              {initials}
                            </div>
                            <div>
                              <div
                                onClick={() => onOpenDrawer(cg)}
                                style={{
                                  fontSize: '0.95rem',
                                  fontWeight: 600,
                                  color: '#ffffff',
                                  cursor: 'pointer',
                                  transition: 'color 0.15s',
                                }}
                                onMouseOver={(e) => (e.currentTarget.style.color = 'var(--primary-400)')}
                                onMouseOut={(e) => (e.currentTarget.style.color = '#ffffff')}
                              >
                                {cg.fullName}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {cg.district || 'Kerala'} {cg.city ? `• ${cg.city}` : ''}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem', fontSize: '0.72rem' }}>
                                <span style={{ color: '#fbbf24', fontWeight: 600 }}>
                                  ★ {cg.averageRating ? Number(cg.averageRating).toFixed(1) : 'New'}
                                </span>
                                <span style={{ color: 'var(--text-muted)' }}>
                                  ({cg.totalRatings || 0}) • {cg.jobsCompleted || 0} {cg.jobsCompleted === 1 ? 'job' : 'jobs'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff' }}>
                            ₹{cg.dailyRate}<span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>/d</span>
                          </span>
                        </div>

                        {/* Skills Pills */}
                        {cg.skills && cg.skills.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.85rem' }}>
                            {cg.skills.slice(0, 3).map((sk: string) => (
                              <span
                                key={sk}
                                style={{
                                  fontSize: '0.675rem',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: 'var(--radius-sm)',
                                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                  border: '1px solid var(--border-subtle)',
                                  color: 'var(--primary-400)',
                                }}
                              >
                                {sk}
                              </span>
                            ))}
                            {cg.skills.length > 3 && (
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                                +{cg.skills.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Document status pills */}
                        {cg.documents && cg.documents.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.65rem', fontSize: '0.7rem' }}>
                            <span style={{ color: 'var(--primary-400)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              📜 {cg.documents.length} {cg.documents.length === 1 ? 'doc' : 'docs'}
                            </span>
                            {cg.documents.some((d: any) => d.expiryStatus === 'expired') ? (
                              <span style={{ color: '#f87171', fontWeight: 600 }}>· ✕ Expired Doc</span>
                            ) : cg.documents.some((d: any) => d.expiryStatus === 'expiring_soon') ? (
                              <span style={{ color: '#fbbf24', fontWeight: 600 }}>· ⚠️ Expiry Soon</span>
                            ) : null}
                          </div>
                        )}

                        {/* Card Footer: Quick Actions */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingTop: '0.65rem',
                            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                          }}
                        >
                          {/* Quick Move Select */}
                          <select
                            value={cg.status}
                            onChange={(e) =>
                              onStatusChange(cg.id, e.target.value as CaregiverStatusType)
                            }
                            style={{
                              background: '#ffffff',
                              color: '#0f172a',
                              border: '1px solid #cbd5e1',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.725rem',
                              padding: '0.2rem 0.4rem',
                              outline: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            <option value="available">→ Available</option>
                            <option value="assigned">→ Assigned</option>
                            <option value="on_leave">→ On Leave</option>
                            <option value="inactive">→ Inactive</option>
                          </select>

                          {/* WhatsApp link and View Details */}
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            <ContactQuickActions
                              phone={cg.phone}
                              variant="single-wa"
                              idPrefix={`board-cg-${cg.id}`}
                            />

                            <button
                              onClick={() => onOpenDrawer(cg)}
                              title="View Profile Details"
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '2px',
                              }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="1" />
                                <circle cx="12" cy="5" r="1" />
                                <circle cx="12" cy="19" r="1" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        }
      )}
    </div>
  );
}
