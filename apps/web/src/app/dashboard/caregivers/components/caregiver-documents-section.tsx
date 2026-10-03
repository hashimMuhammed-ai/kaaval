import React, { useState } from 'react';
import { apiFetch } from '../../../../utils/api';
import {
  DOCUMENT_TYPE_LABELS,
  DEFAULT_DOC_TITLES,
} from '../../../../constants/documents';
import { Caregiver, CaregiverDocumentItem } from '../../../../types/caregiver';

interface CaregiverDocumentsSectionProps {
  caregiver: Caregiver;
  caregiverDocs: CaregiverDocumentItem[];
  loadingDocs: boolean;
  setCaregiverDocs: React.Dispatch<React.SetStateAction<CaregiverDocumentItem[]>>;
  showToast?: (msg: string) => void;
}

export function CaregiverDocumentsSection({
  caregiver,
  caregiverDocs,
  loadingDocs,
  setCaregiverDocs,
  showToast,
}: CaregiverDocumentsSectionProps) {
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadDocType, setUploadDocType] = useState('nursing_certificate');
  const [uploadTitle, setUploadTitle] = useState('Kerala Nursing Council Registration');
  const [uploadExpiryDate, setUploadExpiryDate] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleDocTypeChange = (val: string) => {
    setUploadDocType(val);
    setUploadTitle(DEFAULT_DOC_TITLES[val] || 'Certificate');
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please select a file to upload (PDF, PNG, JPG, WEBP).');
      return;
    }

    setUploadingDoc(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('documentType', uploadDocType);
      formData.append('title', uploadTitle.trim() || DEFAULT_DOC_TITLES[uploadDocType] || 'Document');
      if (uploadExpiryDate) {
        formData.append('expiryDate', uploadExpiryDate);
      }

      const newDoc = await apiFetch<CaregiverDocumentItem>(`/caregivers/${caregiver.id}/documents`, {
        method: 'POST',
        body: formData,
      });

      setCaregiverDocs((prev) => [newDoc, ...prev]);
      setUploadFile(null);
      setUploadExpiryDate('');
      if (showToast) {
        showToast(`Document "${newDoc.title}" uploaded to object storage.`);
      }

      const fileInput = document.getElementById('caregiver-file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      const cameraInput = document.getElementById('caregiver-camera-upload') as HTMLInputElement;
      if (cameraInput) cameraInput.value = '';
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to upload document.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleVerifyDocument = async (docId: string) => {
    try {
      const verified = await apiFetch<CaregiverDocumentItem>(`/caregivers/${caregiver.id}/documents/${docId}/verify`, {
        method: 'PATCH',
      });
      setCaregiverDocs((prev) => prev.map((d) => (d.id === docId ? verified : d)));
      if (showToast) {
        showToast('Document verified successfully.');
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to verify document.');
    }
  };

  const handleDeleteDocument = async (docId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      await apiFetch(`/caregivers/${caregiver.id}/documents/${docId}`, {
        method: 'DELETE',
      });
      setCaregiverDocs((prev) => prev.filter((d) => d.id !== docId));
      if (showToast) {
        showToast(`Document "${title}" removed.`);
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to delete document.');
    }
  };

  const handleDownloadDocument = async (doc: CaregiverDocumentItem) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
      const downloadUrl = `${apiBase}/caregivers/${caregiver.id}/documents/${doc.id}/download`;

      const res = await fetch(downloadUrl, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error('Failed to retrieve file from storage.');
      }

      const blob = await res.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${(doc.title || 'document').replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(objectUrl);
      document.body.removeChild(link);
    } catch (err: any) {
      alert(err?.message || 'Could not download file.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem' }}>
        <h3 style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>Compliance & Certifications</span>
          <span
            style={{
              fontSize: '0.75rem',
              backgroundColor: 'rgba(20, 184, 166, 0.15)',
              color: 'var(--primary-600, #0d9488)',
              padding: '0.1rem 0.45rem',
              borderRadius: 'var(--radius-full)',
              fontWeight: 600,
            }}
          >
            {caregiverDocs.length}
          </span>
        </h3>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          S3 Encrypted Storage
        </span>
      </div>

      {/* Document List */}
      {loadingDocs ? (
        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
          Fetching documents from storage...
        </div>
      ) : caregiverDocs.length === 0 ? (
        <div
          style={{
            padding: '1.25rem',
            textAlign: 'center',
            backgroundColor: '#f8fafc',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed #cbd5e1',
            color: 'var(--text-muted)',
            fontSize: '0.825rem',
          }}
        >
          No certifications or ID documents uploaded yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {caregiverDocs.map((doc) => {
            const isExpiringSoon = doc.expiryStatus === 'expiring_soon';
            const isExpired = doc.expiryStatus === 'expired';
            const isValid = doc.expiryStatus === 'valid';

            return (
              <div
                key={doc.id}
                style={{
                  backgroundColor: '#f8fafc',
                  border: isExpired
                    ? '1px solid rgba(239, 68, 68, 0.4)'
                    : isExpiringSoon
                    ? '1px solid rgba(245, 158, 11, 0.4)'
                    : '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.85rem' }}>
                      {doc.title}
                    </div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {DOCUMENT_TYPE_LABELS[doc.documentType] || doc.documentType}
                      {doc.fileSize ? ` · ${Math.round(doc.fileSize / 1024)} KB` : ''}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                    {doc.verified ? (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          padding: '0.15rem 0.45rem',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'rgba(16, 185, 129, 0.15)',
                          color: '#059669',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          fontWeight: 600,
                        }}
                      >
                        ✓ Verified
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          padding: '0.15rem 0.45rem',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'rgba(245, 158, 11, 0.15)',
                          color: '#d97706',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          fontWeight: 600,
                        }}
                      >
                        Unverified
                      </span>
                    )}
                  </div>
                </div>

                {/* Expiry Pill */}
                <div style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {isValid && (
                    <span style={{ color: '#059669' }}>
                      ✓ Valid ({doc.daysUntilExpiry} days left)
                    </span>
                  )}
                  {isExpiringSoon && (
                    <span style={{ color: '#d97706', fontWeight: 600 }}>
                      ⚠️ Expiring Soon ({doc.daysUntilExpiry} days left!)
                    </span>
                  )}
                  {isExpired && (
                    <span style={{ color: '#dc2626', fontWeight: 600 }}>
                      ✕ Expired ({Math.abs(doc.daysUntilExpiry || 0)} days ago)
                    </span>
                  )}
                  {doc.expiryStatus === 'no_expiry' && (
                    <span style={{ color: 'var(--text-muted)' }}>
                      Permanent / No Expiry Date
                    </span>
                  )}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.2rem' }}>
                  <button
                    type="button"
                    onClick={() => handleDownloadDocument(doc)}
                    style={{
                      padding: '0.3rem 0.65rem',
                      fontSize: '0.725rem',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      border: '1px solid #cbd5e1',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    ⬇ Download
                  </button>

                  {!doc.verified && (
                    <button
                      type="button"
                      onClick={() => handleVerifyDocument(doc.id)}
                      style={{
                        padding: '0.3rem 0.65rem',
                        fontSize: '0.725rem',
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        color: '#059669',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      Verify
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDeleteDocument(doc.id, doc.title)}
                    style={{
                      padding: '0.3rem 0.5rem',
                      fontSize: '0.725rem',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      color: '#dc2626',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Document Form */}
      <form
        onSubmit={handleUploadDocument}
        style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          marginTop: '0.5rem',
        }}
      >
        <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#0f172a' }}>
          + Upload Document or Certificate
        </div>

        {uploadError && (
          <div style={{ padding: '0.5rem', borderRadius: '4px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#dc2626', fontSize: '0.75rem' }}>
            {uploadError}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
          <div>
            <label style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
              Document Type
            </label>
            <select
              value={uploadDocType}
              onChange={(e) => handleDocTypeChange(e.target.value)}
              className="form-input"
              style={{ fontSize: '0.775rem', padding: '0.4rem', backgroundColor: '#ffffff', color: '#0f172a', borderColor: '#cbd5e1' }}
            >
              {Object.entries(DOCUMENT_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k} style={{ background: '#ffffff', color: '#0f172a' }}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
              Expiry Date (Optional)
            </label>
            <input
              type="date"
              value={uploadExpiryDate}
              onChange={(e) => setUploadExpiryDate(e.target.value)}
              className="form-input"
              style={{ fontSize: '0.775rem', padding: '0.4rem', backgroundColor: '#ffffff', color: '#0f172a', borderColor: '#cbd5e1' }}
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
            Document Title / Label
          </label>
          <input
            type="text"
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
            placeholder="e.g. Kerala Nursing Council Registration"
            className="form-input"
            style={{ fontSize: '0.775rem', padding: '0.4rem', backgroundColor: '#ffffff', color: '#0f172a', borderColor: '#cbd5e1' }}
            required
          />
        </div>

        <div>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
            Choose Document / Certificate File
          </label>
          <input
            id="caregiver-file-upload"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setUploadFile(e.target.files[0]);
              }
            }}
            style={{ display: 'none' }}
          />
          <input
            id="caregiver-camera-upload"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setUploadFile(e.target.files[0]);
              }
            }}
            style={{ display: 'none' }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
            <button
              type="button"
              id="drawer-camera-trigger"
              onClick={() => document.getElementById('caregiver-camera-upload')?.click()}
              className="btn-secondary"
              style={{ minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', fontSize: '0.8rem' }}
            >
              <span>📸</span> Snap Photo
            </button>
            <button
              type="button"
              id="drawer-file-trigger"
              onClick={() => document.getElementById('caregiver-file-upload')?.click()}
              className="btn-secondary"
              style={{ minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', fontSize: '0.8rem' }}
            >
              <span>📁</span> Browse File
            </button>
          </div>

          {uploadFile && (
            <div style={{ marginTop: '0.35rem', fontSize: '0.775rem', color: 'var(--primary-600, #0d9488)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>📄 {uploadFile.name} ({(uploadFile.size / 1024).toFixed(0)} KB)</span>
              <button
                type="button"
                onClick={() => setUploadFile(null)}
                style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.75rem' }}
              >
                ✕ Clear
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
          <button
            type="submit"
            className="btn-primary"
            disabled={uploadingDoc || !uploadFile}
            style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}
          >
            {uploadingDoc ? 'Uploading to R2...' : 'Upload Document'}
          </button>
        </div>
      </form>
    </div>
  );
}
