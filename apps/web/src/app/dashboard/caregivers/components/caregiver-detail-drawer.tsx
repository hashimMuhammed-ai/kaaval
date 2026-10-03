import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../../../utils/api';
import { STATUS_CONFIG, CaregiverStatusType } from '../../../../constants/caregiver-status';
import { Caregiver, CaregiverDocumentItem } from '../../../../types/caregiver';
import { CaregiverStatusBadge } from '../../../../components/caregiver-status-badge';
import { CaregiverDocumentsSection } from './caregiver-documents-section';

interface CaregiverDetailDrawerProps {
  caregiver: Caregiver | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (caregiverId: string, status: CaregiverStatusType) => void;
  onCaregiverUpdated: (updatedCaregiver: Caregiver) => void;
  onResetCredentials: (caregiverId: string) => void;
  showToast?: (msg: string) => void;
}

export function CaregiverDetailDrawer({
  caregiver,
  isOpen,
  onClose,
  onStatusChange,
  onCaregiverUpdated,
  onResetCredentials,
  showToast,
}: CaregiverDetailDrawerProps) {
  // Quick edit rate & profile state
  const [editNotes, setEditNotes] = useState('');
  const [editDailyRate, setEditDailyRate] = useState<number | ''>('');
  const [editLiveInRate, setEditLiveInRate] = useState<number | ''>('');
  const [editHourlyRate, setEditHourlyRate] = useState<number | ''>('');
  const [editCommissionPercentage, setEditCommissionPercentage] = useState<number | ''>(15);
  const [editRateNotes, setEditRateNotes] = useState('');
  const [updatingDrawer, setUpdatingDrawer] = useState(false);

  // Document state
  const [caregiverDocs, setCaregiverDocs] = useState<CaregiverDocumentItem[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  useEffect(() => {
    if (!caregiver || !isOpen) return;

    setEditNotes(caregiver.notes || '');
    setEditDailyRate(caregiver.dailyRate ?? '');
    setEditLiveInRate(caregiver.liveInRate ?? '');
    setEditHourlyRate(caregiver.hourlyRate ?? '');
    setEditCommissionPercentage(caregiver.commissionPercentage ?? 15);
    setEditRateNotes(caregiver.rateNotes || '');

    // Fetch documents
    setLoadingDocs(true);
    apiFetch(`/caregivers/${caregiver.id}/documents`)
      .then((docs) => setCaregiverDocs(docs || []))
      .catch(() => setCaregiverDocs([]))
      .finally(() => setLoadingDocs(false));
  }, [caregiver?.id, isOpen]);

  if (!isOpen || !caregiver) return null;

  const handleSaveDrawerDetails = async () => {
    setUpdatingDrawer(true);
    try {
      const updated = await apiFetch<Caregiver>(`/caregivers/${caregiver.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          notes: editNotes.trim(),
          dailyRate: editDailyRate !== '' ? Number(editDailyRate) : 0,
          liveInRate: editLiveInRate !== '' ? Number(editLiveInRate) : 0,
          hourlyRate: editHourlyRate !== '' ? Number(editHourlyRate) : 0,
          commissionPercentage: editCommissionPercentage !== '' ? Number(editCommissionPercentage) : 15,
          rateNotes: editRateNotes.trim(),
        }),
      });

      onCaregiverUpdated(updated);
      if (showToast) {
        showToast(`Profile updated for ${updated.fullName}`);
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to save profile changes.');
    } finally {
      setUpdatingDrawer(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        justifyContent: 'flex-end',
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        className="animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '520px',
          height: '100%',
          backgroundColor: '#ffffff',
          borderLeft: '1px solid #e2e8f0',
          padding: '1.75rem 1.25rem',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          boxShadow: '-10px 0 30px rgba(15, 23, 42, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ marginBottom: '0.4rem' }}>
              <CaregiverStatusBadge
                status={caregiver.status}
                size="md"
              />
            </div>
            <h2 style={{ fontSize: '1.4rem', color: '#0f172a', fontWeight: 700 }}>
              {caregiver.fullName}
            </h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Registered Caregiver • {caregiver.district || 'Kerala'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '0.4rem', fontSize: '0.85rem' }}>
              <span style={{ color: '#fbbf24', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                ★ {caregiver.averageRating ? Number(caregiver.averageRating).toFixed(1) : 'New'}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>
                ({caregiver.totalRatings || 0} {caregiver.totalRatings === 1 ? 'review' : 'reviews'})
              </span>
              <span style={{ color: 'var(--border-card)' }}>•</span>
              <span style={{ color: 'var(--primary-600, #0d9488)', fontWeight: 600 }}>
                {caregiver.jobsCompleted || 0} {caregiver.jobsCompleted === 1 ? 'job done' : 'jobs done'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Quick Status Bar */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Change Operational Status:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
            {(['available', 'assigned', 'on_leave', 'inactive'] as CaregiverStatusType[]).map((st) => (
              <button
                key={st}
                onClick={() => onStatusChange(caregiver.id, st)}
                style={{
                  padding: '0.45rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border:
                    caregiver.status === st
                      ? `1px solid ${STATUS_CONFIG[st].accentColor}`
                      : '1px solid #cbd5e1',
                  backgroundColor:
                    caregiver.status === st
                      ? STATUS_CONFIG[st].bgBadge
                      : '#ffffff',
                  color: caregiver.status === st ? STATUS_CONFIG[st].textColor : '#334155',
                  textTransform: 'capitalize',
                }}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Contact & Location Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
          <h3 style={{ fontSize: '0.95rem', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem', fontWeight: 600 }}>
            Contact & Geolocation
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Phone / WhatsApp:</span>
            <span style={{ color: '#0f172a', fontWeight: 600 }}>{caregiver.phone}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>District:</span>
            <span style={{ color: '#0f172a' }}>{caregiver.district || 'Kerala'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>City / Town:</span>
            <span style={{ color: '#0f172a' }}>{caregiver.city || '—'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Matching Radius:</span>
            <span style={{ color: '#0d9488', fontWeight: 600, fontSize: '0.8rem' }}>
              {caregiver.latitude && caregiver.longitude
                ? '✓ Location Geocoded (Ready)'
                : 'Pending Coordinates'}
            </span>
          </div>
          {caregiver.address && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Full Address:</span>
              <span style={{ color: '#0f172a', textAlign: 'right', maxWidth: '240px' }}>{caregiver.address}</span>
            </div>
          )}
        </div>

        {/* Skills Tagged */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
          <h3 style={{ fontSize: '0.95rem', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem', fontWeight: 600 }}>
            Core Care Skills ({caregiver.skills?.length || 0})
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.2rem' }}>
            {(caregiver.skills || []).map((sk) => (
              <span
                key={sk}
                style={{
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.55rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  fontWeight: 500,
                }}
              >
                {sk}
              </span>
            ))}
          </div>
        </div>

        {/* Rate & Commission Configuration */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
          <h3 style={{ fontSize: '0.95rem', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem', fontWeight: 600 }}>
            Billing Rates & Agency Split
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                Daily Rate (12h Shift)
              </label>
              <input
                type="number"
                value={editDailyRate}
                onChange={(e) => setEditDailyRate(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="₹ Rate / Day"
                className="form-input"
                style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem', backgroundColor: '#ffffff', color: '#0f172a', borderColor: '#cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                Live-in Rate (24h)
              </label>
              <input
                type="number"
                value={editLiveInRate}
                onChange={(e) => setEditLiveInRate(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="₹ 24h Rate"
                className="form-input"
                style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem', backgroundColor: '#ffffff', color: '#0f172a', borderColor: '#cbd5e1' }}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                Hourly Rate
              </label>
              <input
                type="number"
                value={editHourlyRate}
                onChange={(e) => setEditHourlyRate(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="₹ / Hour"
                className="form-input"
                style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem', backgroundColor: '#ffffff', color: '#0f172a', borderColor: '#cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                Agency Cut (%)
              </label>
              <input
                type="number"
                value={editCommissionPercentage}
                onChange={(e) => setEditCommissionPercentage(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 15%"
                className="form-input"
                style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem', backgroundColor: '#ffffff', color: '#0f172a', borderColor: '#cbd5e1' }}
              />
            </div>
          </div>
        </div>

        {/* Agency Notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
          <h3 style={{ fontSize: '0.95rem', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem', fontWeight: 600 }}>
            Office Coordination Notes
          </h3>
          <textarea
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            placeholder="Internal coordination notes (e.g. prefers night shifts, patient preferences...)"
            rows={3}
            className="form-textarea"
            style={{ fontSize: '0.85rem', padding: '0.5rem', backgroundColor: '#ffffff', color: '#0f172a', borderColor: '#cbd5e1' }}
          />
          <button
            onClick={handleSaveDrawerDetails}
            className="btn-primary"
            disabled={updatingDrawer}
            style={{ padding: '0.5rem 1rem', fontSize: '0.825rem', alignSelf: 'flex-end', marginTop: '0.25rem' }}
          >
            {updatingDrawer ? 'Saving Changes...' : 'Save Rate & Notes'}
          </button>
        </div>

        {/* Modular Compliance & Documents Section */}
        <CaregiverDocumentsSection
          caregiver={caregiver}
          caregiverDocs={caregiverDocs}
          loadingDocs={loadingDocs}
          setCaregiverDocs={setCaregiverDocs}
          showToast={showToast}
        />

        {/* Self-Service Portal Management */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.95rem' }}>
            Caregiver Mobile Portal Access
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Portal Account: {caregiver.email || caregiver.phone}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => onResetCredentials(caregiver.id)}
              className="btn-secondary"
              style={{ flex: 1, padding: '0.55rem', fontSize: '0.825rem', backgroundColor: '#ffffff', color: '#0f172a' }}
            >
              Regenerate Password
            </button>

            <a
              href={`https://wa.me/${caregiver.phone.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp"
              style={{ flex: 1, padding: '0.55rem', fontSize: '0.825rem' }}
            >
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
