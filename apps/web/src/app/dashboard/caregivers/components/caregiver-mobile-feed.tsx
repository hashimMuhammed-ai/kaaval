import React from 'react';
import { STATUS_CONFIG, CaregiverStatusType } from '../../../../constants/caregiver-status';
import { Caregiver, CaregiverStatusCounts } from '../../../../types/caregiver';
import { ContactQuickActions } from '../../../../components/contact-quick-actions';

interface CaregiverMobileFeedProps {
  counts: CaregiverStatusCounts;
  mobileStatusTab: CaregiverStatusType | 'all';
  onMobileStatusTabChange: (tab: CaregiverStatusType | 'all') => void;
  caregivers: Caregiver[];
  onOpenDrawer: (cg: Caregiver) => void;
  onStatusChange: (caregiverId: string, newStatus: CaregiverStatusType) => void;
}

export function CaregiverMobileFeed({
  counts,
  mobileStatusTab,
  onMobileStatusTabChange,
  caregivers,
  onOpenDrawer,
  onStatusChange,
}: CaregiverMobileFeedProps) {
  return (
    <>
      {/* Mobile Horizontal Status Filter Tabs */}
      <div
        className="mobile-scroll-x show-on-mobile-block"
        style={{
          display: 'none',
          gap: '0.5rem',
          paddingBottom: '0.75rem',
          marginBottom: '0.75rem',
        }}
      >
        {[
          { id: 'all', label: 'All Caregivers', count: counts.total, color: '#0d9488' },
          { id: 'available', label: 'Available', count: counts.available, color: '#059669' },
          { id: 'assigned', label: 'Assigned', count: counts.assigned, color: '#0284c7' },
          { id: 'on_leave', label: 'On Leave', count: counts.on_leave, color: '#d97706' },
          { id: 'inactive', label: 'Inactive', count: counts.inactive, color: '#64748b' },
        ].map((tab) => {
          const isActive = mobileStatusTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onMobileStatusTabChange(tab.id as any)}
              id={`mobile-tab-${tab.id}`}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: isActive ? `1px solid ${tab.color}` : '1px solid #cbd5e1',
                backgroundColor: isActive ? 'rgba(13, 148, 136, 0.12)' : '#ffffff',
                color: isActive ? '#0f766e' : '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  padding: '0.1rem 0.45rem',
                  borderRadius: '9999px',
                  fontSize: '0.7rem',
                  backgroundColor: isActive ? tab.color : '#f1f5f9',
                  color: isActive ? '#ffffff' : '#64748b',
                  fontWeight: 700,
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile Caregiver Cards Feed */}
      <div
        className="show-on-mobile-block"
        id="mobile-caregivers-cards-feed"
        style={{ display: 'none', padding: '0.25rem 0 5.5rem 0', width: '100%', minWidth: 0, boxSizing: 'border-box' }}
      >
        {caregivers.length === 0 ? (
          <div
            style={{
              padding: '3rem 1rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
              backgroundColor: '#f8fafc',
              borderRadius: 'var(--radius-lg)',
              border: '1px dashed #cbd5e1',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👥</div>
            <div style={{ fontWeight: 600, color: '#0f172a' }}>No caregivers in this filter</div>
            <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', color: '#64748b' }}>
              Try selecting "All Caregivers" or clearing search/district filters.
            </div>
          </div>
        ) : (
          caregivers.map((cg) => {
            const cfg = STATUS_CONFIG[cg.status as CaregiverStatusType] || STATUS_CONFIG.available;
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
                key={`mobile-cg-${cg.id}`}
                id={`mobile-caregiver-card-${cg.id}`}
                className="glass-card"
                style={{
                  padding: '0.95rem',
                  borderRadius: 'var(--radius-lg)',
                  border: `1px solid ${cfg.borderBadge}`,
                  backgroundColor: '#ffffff',
                  marginBottom: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.7rem',
                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
                {/* Top: Avatar, Name, Rating & Daily Rate (Clickable to open profile) */}
                <div
                  onClick={() => onOpenDrawer(cg)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(13, 148, 136, 0.12)',
                        border: '1px solid rgba(13, 148, 136, 0.35)',
                        color: '#0f766e',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {initials}
                    </div>
                    <div>
                      <div
                        id={`mobile-cg-name-${cg.id}`}
                        style={{
                          fontSize: '1rem',
                          fontWeight: 700,
                          color: '#0f172a',
                        }}
                      >
                        {cg.fullName}
                      </div>
                      <div style={{ fontSize: '0.775rem', color: '#64748b', marginTop: '0.1rem' }}>
                        📍 {cg.district || 'Kerala'} {cg.city ? `• ${cg.city}` : ''}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem', fontSize: '0.725rem' }}>
                        <span style={{ color: '#b45309', fontWeight: 600 }}>
                          ★ {cg.averageRating ? Number(cg.averageRating).toFixed(1) : 'New'}
                        </span>
                        <span style={{ color: '#64748b' }}>
                          • {cg.jobsCompleted || 0} jobs
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                      ₹{cg.dailyRate}<span style={{ fontSize: '0.7rem', color: '#64748b' }}>/d</span>
                    </div>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.5rem',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: cfg.bgBadge,
                        border: `1px solid ${cfg.borderBadge}`,
                        color: cfg.textColor,
                        marginTop: '0.35rem',
                      }}
                    >
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: cfg.dotColor }} />
                      {cfg.label}
                    </span>
                  </div>
                </div>

                {/* Skills tags (Compact: Top 3 max) */}
                {cg.skills && cg.skills.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                    {cg.skills.slice(0, 3).map((sk: string) => (
                      <span
                        key={sk}
                        style={{
                          fontSize: '0.7rem',
                          padding: '0.15rem 0.45rem',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: '#f1f5f9',
                          border: '1px solid #e2e8f0',
                          color: '#0f766e',
                          fontWeight: 500,
                        }}
                      >
                        {sk}
                      </span>
                    ))}
                    {cg.skills.length > 3 && (
                      <span style={{ fontSize: '0.675rem', color: '#64748b', alignSelf: 'center' }}>
                        +{cg.skills.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Document & Compliance status */}
                {cg.documents && cg.documents.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.725rem' }}>
                    <span style={{ color: '#0d9488', fontWeight: 600 }}>
                      📜 {cg.documents.length} {cg.documents.length === 1 ? 'doc verified' : 'docs verified'}
                    </span>
                    {cg.documents.some((d: any) => d.expiryStatus === 'expired') && (
                      <span style={{ color: '#dc2626', fontWeight: 600 }}>· ✕ Expired Doc</span>
                    )}
                  </div>
                )}

                {/* 1-Tap Action Buttons: Direct Phone Call & WhatsApp */}
                <ContactQuickActions
                  phone={cg.phone}
                  variant="touch-grid"
                  idPrefix={`mobile-caregiver-${cg.id}`}
                  callId={`mobile-call-caregiver-${cg.id}`}
                  waId={`mobile-wa-caregiver-${cg.id}`}
                />

                {/* Secondary Row: Quick Status Change Dropdown & Profile Trigger */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <select
                    value={cg.status}
                    onChange={(e) =>
                      onStatusChange(cg.id, e.target.value as CaregiverStatusType)
                    }
                    id={`mobile-status-select-${cg.id}`}
                    style={{
                      flex: 1,
                      background: '#ffffff',
                      color: '#0f172a',
                      border: '1px solid #cbd5e1',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      padding: '0.5rem 0.6rem',
                      minHeight: '40px',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="available">● Available (Ready)</option>
                    <option value="assigned">● Assigned (On Care)</option>
                    <option value="on_leave">● On Leave</option>
                    <option value="inactive">● Inactive</option>
                  </select>

                  <button
                    onClick={() => onOpenDrawer(cg)}
                    id={`mobile-view-profile-${cg.id}`}
                    className="btn-secondary"
                    style={{
                      padding: '0.5rem 0.85rem',
                      fontSize: '0.8rem',
                      minHeight: '40px',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <span>Profile</span>
                    <span style={{ fontSize: '0.85rem' }}>→</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
