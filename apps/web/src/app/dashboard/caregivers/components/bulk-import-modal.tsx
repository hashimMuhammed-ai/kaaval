import React, { useState } from 'react';
import { apiFetch } from '../../../../utils/api';
import { BulkImportResult } from '../../../../types/caregiver';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
  showToast?: (msg: string) => void;
}

export function BulkImportModal({
  isOpen,
  onClose,
  onSuccess,
  showToast,
}: BulkImportModalProps) {
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreviewRows, setImportPreviewRows] = useState<string[][]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectImportFile = (file: File) => {
    setImportFile(file);
    setImportError(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const preview = lines.slice(0, 6).map((line) => {
        return line.split(',').map((cell) => cell.replace(/^"|"$/g, '').trim());
      });
      setImportPreviewRows(preview);
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
      const res = await fetch(`${apiBase}/caregivers/bulk-import/template`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error('Failed to download sample CSV template.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'kerala-caregiver-import-template.csv';
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (err: any) {
      alert(err?.message || 'Failed to download template.');
    }
  };

  const handleExecuteBulkImport = async () => {
    if (!importFile) {
      setImportError('Please select a CSV file to import.');
      return;
    }

    setIsImporting(true);
    setImportError(null);

    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const result = await apiFetch<BulkImportResult>('/caregivers/bulk-import', {
        method: 'POST',
        body: formData,
      });

      setImportResult(result);
      if (showToast) {
        showToast(`Import completed: ${result.successfulCount} staff onboarded!`);
      }
      await onSuccess();
    } catch (err: any) {
      setImportError(err?.message || 'Bulk import failed. Please check your CSV format.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportCredentials = () => {
    if (!importResult || !importResult.successfulImports?.length) return;

    const headers = [
      'Row',
      'Full Name',
      'Phone',
      'Email',
      'Login Username',
      'Temporary Password',
      'Access Code',
      'Portal URL',
    ];
    const rows = importResult.successfulImports.map((item) => [
      item.rowNumber,
      `"${(item.fullName || '').replace(/"/g, '""')}"`,
      `"${(item.phone || '').replace(/"/g, '""')}"`,
      `"${(item.email || '').replace(/"/g, '""')}"`,
      `"${(item.temporaryCredentials?.username || '').replace(/"/g, '""')}"`,
      `"${(item.temporaryCredentials?.temporaryPassword || '').replace(/"/g, '""')}"`,
      `"${(item.temporaryCredentials?.accessCode || '').replace(/"/g, '""')}"`,
      `"${(item.temporaryCredentials?.portalUrl || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `caregivers-onboarded-credentials-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);
  };

  const handleClose = () => {
    setImportFile(null);
    setImportPreviewRows([]);
    setImportResult(null);
    setImportError(null);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        padding: '1.5rem',
      }}
    >
      <div
        className="glass-panel"
        style={{
          maxWidth: '750px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '2rem',
          backgroundColor: 'var(--bg-surface-elevated, #0f172a)',
          borderRadius: 'var(--radius-xl, 16px)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className="badge badge-teal" style={{ fontSize: '0.75rem' }}>Bulk Onboarding</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>RFC 4180 CSV Engine</span>
            </div>
            <h2 style={{ fontSize: '1.45rem', color: '#ffffff', margin: 0 }}>
              Bulk Import Caregiver Staff
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem', marginBottom: 0 }}>
              Upload your agency's existing staff roster. User accounts and login credentials are generated automatically.
            </p>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.25rem',
              borderRadius: '6px',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Feature Highlights Callout */}
        <div
          style={{
            backgroundColor: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '0.9rem 1.1rem',
            marginBottom: '1.5rem',
            fontSize: '0.825rem',
            color: '#e0f2fe',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: '#38bdf8' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>Smart Agency Roster Processing</span>
          </div>
          <div>• <strong>Kerala District Coordinates:</strong> Districts automatically geocoded for patient proximity matching.</div>
          <div>• <strong>Atomic Accounts:</strong> Portal credentials provisioned instantly for every valid staff record.</div>
          <div>• <strong>Duplicate Isolation:</strong> Duplicate phone numbers are safely skipped without failing valid rows.</div>
        </div>

        {/* Template Download & File Dropzone */}
        {!importResult && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9' }}>
                Select Staff CSV File
              </label>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary-400, #2dd4bf)',
                  cursor: 'pointer',
                  fontSize: '0.825rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  textDecoration: 'underline',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Download Sample Template (.csv)</span>
              </button>
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleSelectImportFile(e.dataTransfer.files[0]);
                }
              }}
              style={{
                border: '2px dashed rgba(56, 189, 248, 0.35)',
                borderRadius: 'var(--radius-lg, 12px)',
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                backgroundColor: 'rgba(15, 23, 42, 0.4)',
                cursor: 'pointer',
                transition: 'border-color 0.2s ease',
              }}
              onClick={() => document.getElementById('csv-file-input')?.click()}
            >
              <input
                id="csv-file-input"
                type="file"
                accept=".csv,text/csv"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleSelectImportFile(e.target.files[0]);
                  }
                }}
              />
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📄</div>
              {importFile ? (
                <div>
                  <div style={{ fontWeight: 600, color: '#38bdf8', fontSize: '1rem' }}>
                    {importFile.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {(importFile.size / 1024).toFixed(1)} KB · Click or drag another file to replace
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.95rem' }}>
                    Click to select CSV or drag and drop here
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Accepts comma-separated values (.csv) with standard agency headers
                  </div>
                </div>
              )}
            </div>

            {/* Preview Rows Table */}
            {importPreviewRows.length > 0 && (
              <div style={{ marginTop: '1.25rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Preview (First {importPreviewRows.length} rows):
                </div>
                <div
                  style={{
                    maxHeight: '170px',
                    overflowX: 'auto',
                    overflowY: 'auto',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.75rem',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <tbody>
                      {importPreviewRows.map((row, i) => (
                        <tr
                          key={i}
                          style={{
                            backgroundColor: i === 0 ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                            fontWeight: i === 0 ? 600 : 400,
                            color: i === 0 ? '#38bdf8' : 'var(--text-main)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          }}
                        >
                          {row.slice(0, 6).map((cell, j) => (
                            <td key={j} style={{ padding: '0.45rem 0.65rem', whiteSpace: 'nowrap' }}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {importError && (
              <div
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  color: '#fca5a5',
                  fontSize: '0.85rem',
                }}
              >
                {importError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem' }}>
              <button
                type="button"
                onClick={handleClose}
                className="btn-secondary"
                style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}
                disabled={isImporting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkImport}
                className="btn-primary"
                style={{ padding: '0.6rem 1.4rem', fontSize: '0.85rem' }}
                disabled={!importFile || isImporting}
              >
                {isImporting ? 'Processing CSV...' : 'Start Import'}
              </button>
            </div>
          </>
        )}

        {/* Import Results View */}
        {importResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total In File</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ffffff' }}>{importResult.totalProcessed}</div>
              </div>
              <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                <div style={{ fontSize: '0.75rem', color: '#34d399' }}>Successfully Added</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#34d399' }}>{importResult.successfulCount}</div>
              </div>
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                <div style={{ fontSize: '0.75rem', color: '#f87171' }}>Skipped / Errors</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f87171' }}>{importResult.skippedCount}</div>
              </div>
            </div>

            {/* Generated Temporary Credentials Download Callout */}
            {importResult.successfulImports?.length > 0 && (
              <div
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: '#34d399', fontSize: '0.95rem' }}>
                    ✓ {importResult.successfulImports.length} Login Accounts Provisioned
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    Caregivers can login to the mobile PWA portal immediately using their phone and auto-generated temporary password.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExportCredentials}
                  className="btn-primary"
                  style={{
                    backgroundColor: '#10b981',
                    borderColor: '#10b981',
                    fontSize: '0.825rem',
                    padding: '0.55rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Download Credentials CSV</span>
                </button>
              </div>
            )}

            {/* Error Rows Table if any */}
            {importResult.errors?.length > 0 && (
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f87171', marginBottom: '0.5rem' }}>
                  Skipped Rows & Issues ({importResult.errors.length})
                </div>
                <div
                  style={{
                    maxHeight: '160px',
                    overflowY: 'auto',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5' }}>
                        <th style={{ padding: '0.4rem 0.6rem' }}>Row</th>
                        <th style={{ padding: '0.4rem 0.6rem' }}>Name / Phone</th>
                        <th style={{ padding: '0.4rem 0.6rem' }}>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importResult.errors.map((err, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)' }}>
                          <td style={{ padding: '0.4rem 0.6rem', color: '#f87171' }}>#{err.rowNumber}</td>
                          <td style={{ padding: '0.4rem 0.6rem' }}>{err.fullName || err.phone || '-'}</td>
                          <td style={{ padding: '0.4rem 0.6rem' }}>{err.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={handleClose}
                className="btn-primary"
                style={{ padding: '0.6rem 1.4rem', fontSize: '0.85rem' }}
              >
                Done & Refresh Roster
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
