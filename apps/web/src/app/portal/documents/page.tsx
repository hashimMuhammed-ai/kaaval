'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../../utils/api';

export interface CaregiverDocumentItem {
  id: string;
  documentType: string;
  title: string;
  fileUrl?: string;
  fileKey?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  expiryDate?: string | null;
  expiryStatus?: 'valid' | 'expiring_soon' | 'expired' | 'no_expiry' | string;
  daysUntilExpiry?: number | null;
  verified: boolean;
  verifiedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export default function CaregiverDocumentsPage() {
  const [documents, setDocuments] = useState<CaregiverDocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'verified' | 'action_needed'>('all');
  const [selectedDoc, setSelectedDoc] = useState<CaregiverDocumentItem | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        // Load profile and attached documents
        const res = await apiFetch<any>('/caregivers/me');
        const caregiverData = res?.data || res;
        if (caregiverData) {
          setProfile(caregiverData);
          if (Array.isArray(caregiverData.documents)) {
            setDocuments(caregiverData.documents);
          }
        }

        // Also query dedicated documents endpoint if available
        try {
          const docsRes = await apiFetch<any>('/caregivers/me/documents');
          if (Array.isArray(docsRes)) {
            setDocuments(docsRes);
          } else if (docsRes?.data && Array.isArray(docsRes.data)) {
            setDocuments(docsRes.data);
          }
        } catch {
          // Keep profile.documents fallback
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Compute Expiry status for documents if not provided by backend
  const enrichedDocs = useMemo(() => {
    return documents.map((doc) => {
      let status = doc.expiryStatus;
      let days = doc.daysUntilExpiry;

      if (!status) {
        if (!doc.expiryDate) {
          status = 'no_expiry';
          days = null;
        } else {
          const expiry = new Date(doc.expiryDate);
          const now = new Date();
          const diffMs = expiry.getTime() - now.getTime();
          const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          days = diffDays;
          if (diffDays < 0) {
            status = 'expired';
          } else if (diffDays <= 30) {
            status = 'expiring_soon';
          } else {
            status = 'valid';
          }
        }
      }

      return {
        ...doc,
        expiryStatus: status,
        daysUntilExpiry: days,
      };
    });
  }, [documents]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const total = enrichedDocs.length;
    const verified = enrichedDocs.filter((d) => d.verified).length;
    const expired = enrichedDocs.filter((d) => d.expiryStatus === 'expired').length;
    const expiringSoon = enrichedDocs.filter((d) => d.expiryStatus === 'expiring_soon').length;
    const actionNeeded = expired + expiringSoon;

    return { total, verified, expired, expiringSoon, actionNeeded };
  }, [enrichedDocs]);

  // Filtered List
  const filteredDocs = useMemo(() => {
    if (activeFilter === 'verified') {
      return enrichedDocs.filter((d) => d.verified);
    }
    if (activeFilter === 'action_needed') {
      return enrichedDocs.filter(
        (d) => d.expiryStatus === 'expired' || d.expiryStatus === 'expiring_soon' || !d.verified
      );
    }
    return enrichedDocs;
  }, [enrichedDocs, activeFilter]);

  // Document Type Icon & Human Label
  const getDocTypeInfo = (type?: string, title?: string) => {
    const t = (type || '').toLowerCase();
    const tit = (title || '').toLowerCase();

    if (t.includes('nurs') || tit.includes('nurs')) {
      return { icon: '📜', label: 'Nursing License / Certificate' };
    }
    if (t.includes('aadhaar') || tit.includes('aadhaar')) {
      return { icon: '🪪', label: 'National ID Proof (Aadhaar)' };
    }
    if (t.includes('police') || tit.includes('police') || tit.includes('pcc')) {
      return { icon: '👮', label: 'Police Verification (PCC)' };
    }
    if (t.includes('first_aid') || tit.includes('bls')) {
      return { icon: '🩹', label: 'First Aid / BLS Certification' };
    }
    if (t.includes('medical') || tit.includes('fitness')) {
      return { icon: '🩺', label: 'Medical Fitness Certificate' };
    }
    return { icon: '📄', label: 'Credential Document' };
  };

  const getExpiryBadge = (doc: CaregiverDocumentItem) => {
    if (doc.expiryStatus === 'expired') {
      return {
        text: 'Expired',
        color: '#DC2626',
        bg: '#fef2f2',
        border: '#fecaca',
        desc: doc.expiryDate ? `Expired on ${new Date(doc.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Expired',
      };
    }
    if (doc.expiryStatus === 'expiring_soon') {
      return {
        text: `Expiring in ${doc.daysUntilExpiry ?? '<30'}d`,
        color: '#D97706',
        bg: '#fffbeb',
        border: '#fde68a',
        desc: doc.expiryDate ? `Expires: ${new Date(doc.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Expiring Soon',
      };
    }
    if (doc.expiryStatus === 'valid') {
      return {
        text: 'Valid',
        color: '#15803D',
        bg: '#f0fdf4',
        border: '#bbf7d0',
        desc: doc.expiryDate ? `Valid until ${new Date(doc.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Valid',
      };
    }
    return {
      text: 'Lifetime Valid',
      color: '#475569',
      bg: '#F8FAFC',
      border: '#cbd5e1',
      desc: 'No Expiry Date',
    };
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes || bytes <= 0) return null;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '2.5rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.3rem' }}>📑</span>
            <h1
              id="documents-page-title"
              style={{ fontSize: '1.35rem', fontWeight: 800, color: '#172033', letterSpacing: '-0.01em' }}
            >
              Certifications & IDs
            </h1>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#475569', marginTop: '0.15rem' }}>
            Verified credentials, identity proofs, and license expiry tracking on file with your agency.
          </p>
        </div>

        <Link
          href="/portal/profile"
          id="back-to-profile-link"
          style={{
            fontSize: '0.78rem',
            color: '#2563EB',
            textDecoration: 'none',
            padding: '0.4rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          &larr; Profile
        </Link>
      </div>

      {/* Compliance & Verification Health Banner */}
      <section
        id="documents-status-banner"
        className="glass-panel"
        style={{
          padding: '1.15rem',
          background: metrics.actionNeeded > 0
            ? 'linear-gradient(135deg, #ffffff, #fffbeb)'
            : 'linear-gradient(135deg, #ffffff, #f0fdfa)',
          border: metrics.actionNeeded > 0
            ? '1px solid #fde68a'
            : '1px solid #ccfbf1',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Verification Health
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#172033', marginTop: '0.15rem' }}>
              {metrics.total === 0
                ? 'No Credentials Uploaded'
                : metrics.actionNeeded > 0
                ? 'Action Required: Expiry Upcoming'
                : 'All Credentials Verified & Active'}
            </div>
          </div>

          <div
            id="caregiver-kyc-shield"
            style={{
              padding: '0.3rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: metrics.verified === metrics.total && metrics.total > 0
                ? '#f0fdf4'
                : '#F8FAFC',
              color: metrics.verified === metrics.total && metrics.total > 0 ? '#15803D' : '#475569',
              fontSize: '0.72rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <span>🛡️</span>
            <span>{metrics.verified} / {metrics.total} Verified</span>
          </div>
        </div>

        {/* Warning Callout if any document is expiring soon or expired */}
        {metrics.actionNeeded > 0 && (
          <div
            id="expiry-warning-callout"
            style={{
              padding: '0.65rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: metrics.expired > 0 ? '#fef2f2' : '#fffbeb',
              border: metrics.expired > 0 ? '1px solid #fecaca' : '1px solid #fde68a',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              fontSize: '0.78rem',
              color: metrics.expired > 0 ? '#DC2626' : '#D97706',
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>⚠️</span>
            <span>
              {metrics.expired > 0
                ? `${metrics.expired} document(s) have expired. Please submit renewals to remain eligible for duty assignments.`
                : `${metrics.expiringSoon} document(s) are expiring within 30 days. Please arrange renewal with agency coordinators.`}
            </span>
          </div>
        )}
      </section>

      {/* Filter Tabs */}
      {enrichedDocs.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            style={{
              padding: '0.35rem 0.8rem',
              borderRadius: 'var(--radius-full)',
              border: activeFilter === 'all' ? '1px solid #2563EB' : '1px solid #e2e8f0',
              backgroundColor: activeFilter === 'all' ? '#eff6ff' : '#F8FAFC',
              color: activeFilter === 'all' ? '#2563EB' : '#475569',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            All Docs ({metrics.total})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('verified')}
            style={{
              padding: '0.35rem 0.8rem',
              borderRadius: 'var(--radius-full)',
              border: activeFilter === 'verified' ? '1px solid #15803D' : '1px solid #e2e8f0',
              backgroundColor: activeFilter === 'verified' ? '#f0fdf4' : '#F8FAFC',
              color: activeFilter === 'verified' ? '#15803D' : '#475569',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Verified ({metrics.verified})
          </button>
          {metrics.actionNeeded > 0 && (
            <button
              type="button"
              onClick={() => setActiveFilter('action_needed')}
              style={{
                padding: '0.35rem 0.8rem',
                borderRadius: 'var(--radius-full)',
                border: activeFilter === 'action_needed' ? '1px solid #D97706' : '1px solid #e2e8f0',
                backgroundColor: activeFilter === 'action_needed' ? '#fffbeb' : '#F8FAFC',
                color: activeFilter === 'action_needed' ? '#D97706' : '#475569',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Action Needed ({metrics.actionNeeded})
            </button>
          )}
        </div>
      )}

      {/* Documents List */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#172033', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Credentials & Licenses ({filteredDocs.length})
        </h2>

        {loading ? (
          <div
            id="documents-loading-state"
            className="glass-panel"
            style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⌛</div>
            <div style={{ fontSize: '0.85rem' }}>Loading verified credentials...</div>
          </div>
        ) : filteredDocs.length > 0 ? (
          <div id="documents-list-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {filteredDocs.map((doc) => {
              const typeInfo = getDocTypeInfo(doc.documentType, doc.title);
              const expiryBadge = getExpiryBadge(doc);
              const sizeLabel = formatFileSize(doc.fileSize);

              return (
                <div
                  key={doc.id}
                  id={`document-card-${doc.id}`}
                  className="glass-panel"
                  style={{
                    padding: '1.15rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                    border: doc.expiryStatus === 'expired'
                      ? '1px solid #fecaca'
                      : doc.expiryStatus === 'expiring_soon'
                      ? '1px solid #fde68a'
                      : '1px solid #e2e8f0',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Top Row: Icon, Title, and Verification Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.25rem',
                          flexShrink: 0,
                        }}
                      >
                        {typeInfo.icon}
                      </div>

                      <div>
                        {/* Title: Preserves exact text match for tests (e.g. 'Nursing Certificate', 'Aadhaar Card') */}
                        <h3
                          style={{
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            color: '#172033',
                            lineHeight: 1.25,
                            margin: 0,
                          }}
                        >
                          {doc.title || doc.documentType}
                        </h3>
                        <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '0.2rem' }}>
                          {typeInfo.label}
                        </div>
                      </div>
                    </div>

                    {/* Verification Badge: Preserves exact '✓ Verified' string for tests */}
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: doc.verified ? '#15803D' : '#D97706',
                        backgroundColor: doc.verified ? '#f0fdf4' : '#fffbeb',
                        border: doc.verified ? '1px solid #bbf7d0' : '1px solid #fde68a',
                        padding: '0.25rem 0.6rem',
                        borderRadius: 'var(--radius-full)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {doc.verified ? '✓ Verified' : 'Pending Review'}
                    </span>
                  </div>

                  {/* Middle Row: Expiry Dates and File Metadata */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      padding: '0.65rem 0.75rem',
                      backgroundColor: '#F8FAFC',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#475569' }}>Expiry Timeline</div>
                      {/* Preserving 'Expires: ...' format for existing checks */}
                      <div style={{ fontSize: '0.78rem', color: '#172033', fontWeight: 600, marginTop: '0.1rem' }}>
                        {doc.expiryDate
                          ? `Expires: ${new Date(doc.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                          : 'No Expiry'}
                      </div>
                    </div>

                    {/* Expiry Pill */}
                    <div
                      style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: expiryBadge.bg,
                        border: `1px solid ${expiryBadge.border}`,
                        color: expiryBadge.color,
                        fontSize: '0.7rem',
                        fontWeight: 700,
                      }}
                    >
                      {expiryBadge.text}
                    </div>
                  </div>

                  {/* Footer / Actions Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.1rem' }}>
                    <div style={{ fontSize: '0.7rem', color: '#475569' }}>
                      {doc.mimeType && <span>{doc.mimeType.split('/')[1]?.toUpperCase() || 'FILE'}</span>}
                      {sizeLabel && <span> &bull; {sizeLabel}</span>}
                    </div>

                    <button
                      type="button"
                      id={`view-doc-btn-${doc.id}`}
                      onClick={() => setSelectedDoc(doc)}
                      style={{
                        backgroundColor: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        color: '#2563EB',
                        padding: '0.4rem 0.85rem',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <span>👁️</span>
                      <span>View Details</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            id="documents-empty-state"
            className="glass-panel"
            style={{
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              border: '1px dashed #cbd5e1',
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📄</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#172033', marginBottom: '0.35rem' }}>
              Credentials on File
            </div>
            <p style={{ fontSize: '0.8rem', lineHeight: 1.5, margin: '0 auto', maxWidth: '320px', color: '#475569' }}>
              Identity proofs, nursing certificates, and police verifications are uploaded and verified by agency coordinators during onboarding.
            </p>
          </div>
        )}
      </section>

      {/* Renewal & Coordinator Support Section */}
      <section
        id="document-renewal-help"
        className="glass-panel"
        style={{
          padding: '1.1rem',
          backgroundColor: '#F8FAFC',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1rem' }}>🔄</span>
          <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#172033' }}>
            Need to Update or Renew Documents?
          </span>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.45, margin: 0 }}>
          For security and patient compliance, all certification renewals (BLS, Nursing Registration, Police Clearance) are validated by your agency office staff. Send updated copies via WhatsApp for immediate verification.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
          <a
            id="renew-document-whatsapp-btn"
            href={`https://wa.me/?text=Hello%20Coordinator,%20I%20would%20like%20to%20submit%20an%20updated%20certificate/document%20for%20my%20caregiver%20profile%20(${encodeURIComponent(profile?.fullName || 'Caregiver')})`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: 'rgba(37, 211, 102, 0.15)',
              border: '1px solid rgba(37, 211, 102, 0.4)',
              color: '#25d366',
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.75rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <span>💬</span>
            <span>WhatsApp Updated Certificate</span>
          </a>
        </div>
      </section>

      {/* Document Details Modal / Bottom Sheet */}
      {selectedDoc && (
        <div
          id="document-details-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="document-modal-title"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              backgroundColor: '#ffffff',
              borderTopLeftRadius: '20px',
              borderTopRightRadius: '20px',
              border: '1px solid #e2e8f0',
              borderBottom: 'none',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.15)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.25rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.4rem' }}>{getDocTypeInfo(selectedDoc.documentType, selectedDoc.title).icon}</span>
                <div>
                  <h3
                    id="document-modal-title"
                    style={{ fontSize: '1.05rem', fontWeight: 800, color: '#172033', margin: 0 }}
                  >
                    {selectedDoc.title || selectedDoc.documentType}
                  </h3>
                  <div style={{ fontSize: '0.72rem', color: '#475569' }}>
                    {getDocTypeInfo(selectedDoc.documentType, selectedDoc.title).label}
                  </div>
                </div>
              </div>

              <button
                type="button"
                id="close-doc-modal-btn"
                onClick={() => setSelectedDoc(null)}
                aria-label="Close document details"
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #e2e8f0',
                  color: '#475569',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Status Pill Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: selectedDoc.verified ? '#f0fdf4' : '#fffbeb',
                    border: selectedDoc.verified ? '1px solid #bbf7d0' : '1px solid #fde68a',
                  }}
                >
                  <div style={{ fontSize: '0.7rem', color: '#475569' }}>Verification Status</div>
                  <div
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: selectedDoc.verified ? '#15803D' : '#D97706',
                      marginTop: '0.2rem',
                    }}
                  >
                    {selectedDoc.verified ? '✓ Verified by Agency' : 'Pending Review'}
                  </div>
                </div>

                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: getExpiryBadge(selectedDoc).bg,
                    border: `1px solid ${getExpiryBadge(selectedDoc).border}`,
                  }}
                >
                  <div style={{ fontSize: '0.7rem', color: '#475569' }}>Expiry Status</div>
                  <div
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: getExpiryBadge(selectedDoc).color,
                      marginTop: '0.2rem',
                    }}
                  >
                    {getExpiryBadge(selectedDoc).text}
                  </div>
                </div>
              </div>

              {/* Detailed Specs */}
              <div
                style={{
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                  fontSize: '0.78rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#475569' }}>Document ID:</span>
                  <span style={{ color: '#172033', fontFamily: 'monospace' }}>{selectedDoc.id.slice(0, 13)}...</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#475569' }}>Expiry Date:</span>
                  <span style={{ color: '#172033', fontWeight: 600 }}>
                    {selectedDoc.expiryDate
                      ? new Date(selectedDoc.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                      : 'None (Permanent Identification)'}
                  </span>
                </div>
                {selectedDoc.verifiedAt && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#475569' }}>Verified On:</span>
                    <span style={{ color: '#15803D' }}>
                      {new Date(selectedDoc.verifiedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                )}
                {selectedDoc.fileSize && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#475569' }}>File Size:</span>
                    <span style={{ color: '#172033' }}>{formatFileSize(selectedDoc.fileSize)}</span>
                  </div>
                )}
              </div>

              {/* Download / Open File Button if available */}
              {selectedDoc.fileUrl && (
                <a
                  id="download-document-btn"
                  href={selectedDoc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    backgroundColor: '#2563EB',
                    color: '#ffffff',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                  }}
                >
                  <span>📥</span>
                  <span>View / Download Document</span>
                </a>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '1rem 1.25rem',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'flex-end',
                backgroundColor: '#F8FAFC',
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedDoc(null)}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#172033',
                  border: '1px solid #e2e8f0',
                  padding: '0.5rem 1.2rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
