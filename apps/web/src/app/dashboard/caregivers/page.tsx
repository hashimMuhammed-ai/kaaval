'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../../utils/api';

const STATUS_CONFIG = {
  available: {
    label: 'Available',
    description: 'Ready for client matching & deployment',
    accentColor: '#10b981',
    bgBadge: 'rgba(16, 185, 129, 0.15)',
    borderBadge: 'rgba(16, 185, 129, 0.35)',
    textColor: '#34d399',
    dotColor: '#10b981',
  },
  assigned: {
    label: 'Assigned',
    description: 'Currently deployed on patient care',
    accentColor: '#38bdf8',
    bgBadge: 'rgba(56, 189, 248, 0.15)',
    borderBadge: 'rgba(56, 189, 248, 0.35)',
    textColor: '#38bdf8',
    dotColor: '#38bdf8',
  },
  on_leave: {
    label: 'On Leave',
    description: 'Temporary leave or medical off-duty',
    accentColor: '#f59e0b',
    bgBadge: 'rgba(245, 158, 11, 0.15)',
    borderBadge: 'rgba(245, 158, 11, 0.35)',
    textColor: '#fbbf24',
    dotColor: '#f59e0b',
  },
  inactive: {
    label: 'Inactive',
    description: 'Pending documents or suspended',
    accentColor: '#94a3b8',
    bgBadge: 'rgba(148, 163, 184, 0.15)',
    borderBadge: 'rgba(148, 163, 184, 0.35)',
    textColor: '#94a3b8',
    dotColor: '#64748b',
  },
};

type CaregiverStatusType = 'available' | 'assigned' | 'on_leave' | 'inactive';

const KERALA_DISTRICTS = [
  'All Districts',
  'Alappuzha',
  'Ernakulam',
  'Idukki',
  'Kannur',
  'Kasaragod',
  'Kollam',
  'Kottayam',
  'Kozhikode',
  'Malappuram',
  'Palakkad',
  'Pathanamthitta',
  'Thiruvananthapuram',
  'Thrissur',
  'Wayanad',
];

const SKILL_OPTIONS = [
  'All Skills',
  'Elderly Care',
  'Bedridden Care',
  'Post-Operative Care',
  "Dementia / Alzheimer's",
  'Palliative Care',
  'Tracheostomy Care',
  'Tube Feeding',
  'Physiotherapy Support',
  'Medication Management',
  'Vital Signs Monitoring',
];

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  nursing_certificate: 'Nursing Council Certificate',
  aadhaar: 'Aadhaar / Photo ID',
  police_clearance: 'Police Clearance (PCC)',
  experience_certificate: 'Experience Certificate',
  cpr_first_aid: 'CPR & First Aid (BLS)',
  medical_fitness: 'Medical Fitness Certificate',
  other: 'Other Supporting Document',
};

const DEFAULT_DOC_TITLES: Record<string, string> = {
  nursing_certificate: 'Kerala Nursing Council Registration',
  aadhaar: 'Aadhaar Card Front & Back',
  police_clearance: 'Kerala Police Clearance Certificate',
  experience_certificate: 'Caregiver Experience Certificate',
  cpr_first_aid: 'CPR & Basic Life Support Certificate',
  medical_fitness: 'Medical Fitness Certificate',
  other: 'Supporting Document',
};

export default function CaregiverStatusBoardPage() {
  const [caregivers, setCaregivers] = useState<any[]>([]);
  const [counts, setCounts] = useState<{
    available: number;
    assigned: number;
    on_leave: number;
    inactive: number;
    total: number;
    occupancyRate: number;
  }>({
    available: 0,
    assigned: 0,
    on_leave: 0,
    inactive: 0,
    total: 0,
    occupancyRate: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & View Mode
  const [viewMode, setViewMode] = useState<'board' | 'table'>('board');
  const [selectedDistrict, setSelectedDistrict] = useState('All Districts');
  const [selectedSkill, setSelectedSkill] = useState('All Skills');
  const [searchQuery, setSearchQuery] = useState('');

  // Drag and Drop
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<CaregiverStatusType | null>(null);

  // Selected Caregiver Drawer & Modals
  const [selectedCaregiver, setSelectedCaregiver] = useState<any | null>(null);
  const [resetModalData, setResetModalData] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Quick edit inside drawer & rate configuration
  const [editNotes, setEditNotes] = useState('');
  const [editDailyRate, setEditDailyRate] = useState<number | ''>('');
  const [editLiveInRate, setEditLiveInRate] = useState<number | ''>('');
  const [editHourlyRate, setEditHourlyRate] = useState<number | ''>('');
  const [editCommissionPercentage, setEditCommissionPercentage] = useState<number | ''>(15);
  const [editRateNotes, setEditRateNotes] = useState('');
  const [updatingDrawer, setUpdatingDrawer] = useState(false);

  // Document Management inside drawer
  const [caregiverDocs, setCaregiverDocs] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadDocType, setUploadDocType] = useState('nursing_certificate');
  const [uploadTitle, setUploadTitle] = useState('Kerala Nursing Council Registration');
  const [uploadExpiryDate, setUploadExpiryDate] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Bulk CSV Import Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreviewRows, setImportPreviewRows] = useState<string[][]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    totalProcessed: number;
    successfulCount: number;
    skippedCount: number;
    successfulImports: Array<{
      rowNumber: number;
      caregiverId: string;
      fullName: string;
      phone: string;
      email?: string;
      temporaryCredentials: {
        username: string;
        temporaryPassword: string;
        accessCode: string;
        portalUrl: string;
      };
    }>;
    errors: Array<{
      rowNumber: number;
      fullName?: string;
      phone?: string;
      reason: string;
    }>;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rosterRes, countsRes] = await Promise.all([
        apiFetch('/caregivers?limit=100'),
        apiFetch('/caregivers/status-counts').catch(() => null),
      ]);

      setCaregivers(rosterRes.data || []);

      if (countsRes) {
        setCounts(countsRes);
      } else {
        // Fallback count calculation if counts endpoint wasn't cached yet
        const localCounts = {
          available: 0,
          assigned: 0,
          on_leave: 0,
          inactive: 0,
          total: (rosterRes.data || []).length,
          occupancyRate: 0,
        };
        for (const c of rosterRes.data || []) {
          if (c.status in localCounts) {
            (localCounts as any)[c.status]++;
          }
        }
        const activePool = localCounts.available + localCounts.assigned;
        localCounts.occupancyRate =
          activePool > 0 ? Math.round((localCounts.assigned / activePool) * 100) : 0;
        setCounts(localCounts);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load caregiver workforce data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Caregivers
  const filteredCaregivers = useMemo(() => {
    return caregivers.filter((cg) => {
      // District filter
      if (
        selectedDistrict !== 'All Districts' &&
        cg.district?.toLowerCase() !== selectedDistrict.toLowerCase()
      ) {
        return false;
      }

      // Skill filter
      if (
        selectedSkill !== 'All Skills' &&
        (!cg.skills || !cg.skills.includes(selectedSkill))
      ) {
        return false;
      }

      // Search term
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = cg.fullName?.toLowerCase().includes(q);
        const matchesPhone = cg.phone?.includes(q);
        const matchesCity = cg.city?.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesCity) {
          return false;
        }
      }

      return true;
    });
  }, [caregivers, selectedDistrict, selectedSkill, searchQuery]);

  // Group caregivers into status columns
  const columnData = useMemo(() => {
    const map: Record<CaregiverStatusType, any[]> = {
      available: [],
      assigned: [],
      on_leave: [],
      inactive: [],
    };

    filteredCaregivers.forEach((cg) => {
      const st = cg.status as CaregiverStatusType;
      if (st in map) {
        map[st].push(cg);
      } else {
        map.available.push(cg);
      }
    });

    return map;
  }, [filteredCaregivers]);

  // Status Change (via Drag & Drop or Dropdown)
  const handleUpdateStatus = async (
    caregiverId: string,
    newStatus: CaregiverStatusType
  ) => {
    const cg = caregivers.find((c) => c.id === caregiverId);
    if (!cg || cg.status === newStatus) return;

    const previousStatus = cg.status;

    // Optimistic UI update
    setCaregivers((prev) =>
      prev.map((item) =>
        item.id === caregiverId ? { ...item, status: newStatus } : item
      )
    );

    // Optimistic counts update
    setCounts((prev) => {
      const updated = {
        ...prev,
        [previousStatus]: Math.max(0, (prev as any)[previousStatus] - 1),
        [newStatus]: (prev as any)[newStatus] + 1,
      };
      const activePool = updated.available + updated.assigned;
      updated.occupancyRate =
        activePool > 0 ? Math.round((updated.assigned / activePool) * 100) : 0;
      return updated;
    });

    try {
      await apiFetch(`/caregivers/${caregiverId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });

      showToast(
        `${cg.fullName} moved to "${STATUS_CONFIG[newStatus].label}"`
      );
    } catch (err: any) {
      // Revert optimistic update
      setCaregivers((prev) =>
        prev.map((item) =>
          item.id === caregiverId ? { ...item, status: previousStatus } : item
        )
      );
      alert(err?.message || 'Failed to update caregiver status on server.');
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, col: CaregiverStatusType) => {
    e.preventDefault();
    if (dragOverColumn !== col) {
      setDragOverColumn(col);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, col: CaregiverStatusType) => {
    e.preventDefault();
    setDragOverColumn(null);
    const id = e.dataTransfer.getData('text/plain') || draggedId;
    setDraggedId(null);

    if (id) {
      await handleUpdateStatus(id, col);
    }
  };

  const openDrawer = (cg: any) => {
    setSelectedCaregiver(cg);
    setEditNotes(cg.notes || '');
    setEditDailyRate(cg.dailyRate != null ? cg.dailyRate : '');
    setEditLiveInRate(cg.liveInRate != null ? cg.liveInRate : '');
    setEditHourlyRate(cg.hourlyRate != null ? cg.hourlyRate : '');
    setEditCommissionPercentage(cg.commissionPercentage != null ? cg.commissionPercentage : 15);
    setEditRateNotes(cg.rateNotes || '');
    setUploadError(null);
    setUploadFile(null);
    setUploadDocType('nursing_certificate');
    setUploadTitle(DEFAULT_DOC_TITLES['nursing_certificate']);
    setUploadExpiryDate('');
    fetchCaregiverDocs(cg.id);
  };

  const fetchCaregiverDocs = async (caregiverId: string) => {
    setLoadingDocs(true);
    try {
      const docs = await apiFetch(`/caregivers/${caregiverId}/documents`);
      setCaregiverDocs(docs || []);
    } catch {
      setCaregiverDocs([]);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleDocTypeChange = (type: string) => {
    setUploadDocType(type);
    if (!uploadTitle || Object.values(DEFAULT_DOC_TITLES).includes(uploadTitle)) {
      setUploadTitle(DEFAULT_DOC_TITLES[type] || 'Document');
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaregiver) return;
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

      const newDoc = await apiFetch(`/caregivers/${selectedCaregiver.id}/documents`, {
        method: 'POST',
        body: formData,
      });

      setCaregiverDocs((prev) => [newDoc, ...prev]);
      setUploadFile(null);
      setUploadExpiryDate('');
      showToast(`Document "${newDoc.title}" uploaded to object storage.`);

      const fileInput = document.getElementById('caregiver-file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to upload document.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleVerifyDocument = async (docId: string) => {
    if (!selectedCaregiver) return;
    try {
      const verified = await apiFetch(`/caregivers/${selectedCaregiver.id}/documents/${docId}/verify`, {
        method: 'PATCH',
      });
      setCaregiverDocs((prev) => prev.map((d) => (d.id === docId ? verified : d)));
      showToast('Document verified successfully.');
    } catch (err: any) {
      alert(err?.message || 'Failed to verify document.');
    }
  };

  const handleDeleteDocument = async (docId: string, title: string) => {
    if (!selectedCaregiver) return;
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      await apiFetch(`/caregivers/${selectedCaregiver.id}/documents/${docId}`, {
        method: 'DELETE',
      });
      setCaregiverDocs((prev) => prev.filter((d) => d.id !== docId));
      showToast(`Document "${title}" removed.`);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete document.');
    }
  };

  const handleDownloadDocument = async (doc: any) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
      const downloadUrl = `${apiBase}/caregivers/${selectedCaregiver.id}/documents/${doc.id}/download`;

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

  const handleSaveDrawerDetails = async () => {
    if (!selectedCaregiver) return;
    setUpdatingDrawer(true);

    try {
      const updated = await apiFetch(`/caregivers/${selectedCaregiver.id}`, {
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

      setCaregivers((prev) =>
        prev.map((c) => (c.id === selectedCaregiver.id ? updated : c))
      );
      setSelectedCaregiver(updated);
      showToast(`Profile updated for ${updated.fullName}`);
    } catch (err: any) {
      alert(err?.message || 'Failed to save profile changes.');
    } finally {
      setUpdatingDrawer(false);
    }
  };

  const handleResetCredentials = async (caregiverId: string) => {
    try {
      const res = await apiFetch(`/caregivers/${caregiverId}/reset-credentials`, {
        method: 'POST',
      });
      setResetModalData(res.temporaryCredentials);
    } catch (err: any) {
      alert(err?.message || 'Could not reset credentials.');
    }
  };

  // Bulk CSV Import Handlers
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

      const result = await apiFetch('/caregivers/bulk-import', {
        method: 'POST',
        body: formData,
      });

      setImportResult(result);
      showToast(`Import completed: ${result.successfulCount} staff onboarded!`);
      await fetchData();
    } catch (err: any) {
      setImportError(err?.message || 'Bulk import failed. Please check your CSV format.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportCredentials = () => {
    if (!importResult || !importResult.successfulImports?.length) return;

    const headers = ['Row', 'Full Name', 'Phone', 'Email', 'Login Username', 'Temporary Password', 'Access Code', 'Portal URL'];
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

  const handleCloseImportModal = () => {
    setShowImportModal(false);
    setImportFile(null);
    setImportPreviewRows([]);
    setImportResult(null);
    setImportError(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className="animate-fade-in"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid var(--primary-500)',
            boxShadow: 'var(--shadow-glow)',
            color: '#ffffff',
            padding: '0.85rem 1.4rem',
            borderRadius: 'var(--radius-lg)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.9rem',
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary-400)' }} />
          {toastMessage}
        </div>
      )}

      {/* Top Header & Quick Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span className="badge badge-teal">Caregiver Operations</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Kerala Agency Workforce Board
            </span>
          </div>
          <h1 style={{ fontSize: '1.95rem', color: '#ffffff', marginBottom: '0.25rem' }}>
            Caregiver Status Board
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '680px' }}>
            Live roster tracking across Available, Assigned, On Leave, and Inactive states. Drag cards or select status to update immediately.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={fetchData}
            className="btn-secondary"
            title="Refresh Status Board"
            style={{ padding: '0.65rem 0.9rem', fontSize: '0.85rem' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="btn-secondary"
            title="Bulk import staff from CSV"
            style={{
              padding: '0.65rem 1.05rem',
              fontSize: '0.875rem',
              borderColor: 'rgba(56, 189, 248, 0.45)',
              color: '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Import CSV</span>
          </button>

          <Link
            href="/dashboard/caregivers/new"
            className="btn-primary"
            style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add Caregiver & Login</span>
          </Link>
        </div>
      </div>

      {/* KPI Metrics Summary Bar */}
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
            <span style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff' }}>
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
            <span style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff' }}>
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
            <span style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff' }}>
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
            <span style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff' }}>
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
            background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.12), rgba(17, 26, 46, 0.75))',
            border: '1px solid rgba(20, 184, 166, 0.3)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-400)', textTransform: 'uppercase' }}>
              Workforce Occupancy
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Total: {counts.total}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff' }}>
              {counts.occupancyRate}%
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              assigned / active pool
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar: Filters & View Switcher */}
      <div
        className="glass-panel"
        style={{
          padding: '1rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        {/* Search & Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap', flex: 1 }}>
          <div style={{ position: 'relative', minWidth: '220px' }}>
            <input
              type="text"
              placeholder="Search name, phone, town..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{
                paddingLeft: '2.2rem',
                paddingTop: '0.45rem',
                paddingBottom: '0.45rem',
                fontSize: '0.875rem',
              }}
            />
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth="2"
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>

          {/* District Filter */}
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="form-select"
            style={{
              width: 'auto',
              minWidth: '160px',
              paddingTop: '0.45rem',
              paddingBottom: '0.45rem',
              fontSize: '0.875rem',
            }}
          >
            {KERALA_DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Skill Filter */}
          <select
            value={selectedSkill}
            onChange={(e) => setSelectedSkill(e.target.value)}
            className="form-select"
            style={{
              width: 'auto',
              minWidth: '170px',
              paddingTop: '0.45rem',
              paddingBottom: '0.45rem',
              fontSize: '0.875rem',
            }}
          >
            {SKILL_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {(selectedDistrict !== 'All Districts' || selectedSkill !== 'All Skills' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedDistrict('All Districts');
                setSelectedSkill('All Skills');
                setSearchQuery('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary-400)',
                fontSize: '0.8rem',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* View Switcher: Board vs Table */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'rgba(11, 17, 32, 0.7)',
            padding: '3px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-card)',
          }}
        >
          <button
            onClick={() => setViewMode('board')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.4rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              backgroundColor: viewMode === 'board' ? 'var(--primary-500)' : 'transparent',
              color: viewMode === 'board' ? '#ffffff' : 'var(--text-secondary)',
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="9" rx="1" />
              <rect x="14" y="3" width="7" height="5" rx="1" />
              <rect x="14" y="12" width="7" height="9" rx="1" />
              <rect x="3" y="16" width="7" height="5" rx="1" />
            </svg>
            <span>Kanban Board</span>
          </button>

          <button
            onClick={() => setViewMode('table')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.4rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              backgroundColor: viewMode === 'table' ? 'var(--primary-500)' : 'transparent',
              color: viewMode === 'table' ? '#ffffff' : 'var(--text-secondary)',
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            <span>List Table</span>
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#fca5a5',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          Loading live caregiver status board...
        </div>
      ) : viewMode === 'board' ? (
        /* ================= 4-COLUMN KANBAN BOARD ================= */
        <div className="status-board-grid">
          {(['available', 'assigned', 'on_leave', 'inactive'] as CaregiverStatusType[]).map(
            (statusKey) => {
              const cfg = STATUS_CONFIG[statusKey];
              const list = columnData[statusKey];
              const isOver = dragOverColumn === statusKey;

              return (
                <div
                  key={statusKey}
                  onDragOver={(e) => handleDragOver(e, statusKey)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, statusKey)}
                  className={`status-column ${isOver ? 'drag-over' : ''}`}
                >
                  {/* Column Header */}
                  <div
                    style={{
                      padding: '1.15rem 1.25rem',
                      borderBottom: '1px solid var(--border-subtle)',
                      borderTop: `3px solid ${cfg.accentColor}`,
                      borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
                      backgroundColor: 'rgba(11, 17, 32, 0.65)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: cfg.dotColor }} />
                        <h2 style={{ fontSize: '1rem', color: '#ffffff', fontWeight: 700 }}>
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
                            onDragStart={(e) => handleDragStart(e, cg.id)}
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
                                    onClick={() => openDrawer(cg)}
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
                                  handleUpdateStatus(cg.id, e.target.value as CaregiverStatusType)
                                }
                                style={{
                                  background: 'rgba(11, 17, 32, 0.9)',
                                  color: 'var(--text-secondary)',
                                  border: '1px solid var(--border-subtle)',
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
                                <a
                                  href={`https://wa.me/${cg.phone.replace(/[^0-9]/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Message on WhatsApp"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '26px',
                                    height: '26px',
                                    borderRadius: '6px',
                                    backgroundColor: 'rgba(37, 211, 102, 0.15)',
                                    color: '#25d366',
                                    border: '1px solid rgba(37, 211, 102, 0.3)',
                                  }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.697c1.002.547 1.777.848 2.806.848 3.181 0 5.767-2.586 5.768-5.766.001-3.182-2.585-5.77-5.768-5.77zm0 10.366c-.897 0-1.632-.249-2.368-.687l-.17-.101-1.57.412.42-1.53-.111-.176c-.477-.759-.728-1.503-.728-2.518.001-2.535 2.062-4.597 4.598-4.597 2.537 0 4.598 2.062 4.598 4.598 0 2.536-2.061 4.599-4.599 4.599z"/>
                                  </svg>
                                </a>

                                <button
                                  onClick={() => openDrawer(cg)}
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
      ) : (
        /* ================= DETAILED TABLE VIEW ================= */
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
              {filteredCaregivers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No caregivers match the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredCaregivers.map((cg) => {
                  const cfg = STATUS_CONFIG[cg.status as CaregiverStatusType] || STATUS_CONFIG.available;
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
                          onClick={() => openDrawer(cg)}
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
                        <select
                          value={cg.status}
                          onChange={(e) =>
                            handleUpdateStatus(cg.id, e.target.value as CaregiverStatusType)
                          }
                          style={{
                            background: cfg.bgBadge,
                            color: cfg.textColor,
                            border: `1px solid ${cfg.borderBadge}`,
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.775rem',
                            fontWeight: 600,
                            padding: '0.25rem 0.65rem',
                            cursor: 'pointer',
                          }}
                        >
                          <option value="available">Available</option>
                          <option value="assigned">Assigned</option>
                          <option value="on_leave">On Leave</option>
                          <option value="inactive">Inactive</option>
                        </select>
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
                            onClick={() => openDrawer(cg)}
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
      )}

      {/* ================= CAREGIVER DETAIL & EDIT DRAWER ================= */}
      {selectedCaregiver && (
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
          onClick={() => setSelectedCaregiver(null)}
        >
          <div
            className="animate-fade-in"
            style={{
              width: '100%',
              maxWidth: '520px',
              height: '100%',
              backgroundColor: 'var(--bg-surface-elevated)',
              borderLeft: '1px solid var(--border-card)',
              padding: '2.5rem 2rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '0.2rem 0.6rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    backgroundColor: STATUS_CONFIG[selectedCaregiver.status as CaregiverStatusType]?.bgBadge,
                    color: STATUS_CONFIG[selectedCaregiver.status as CaregiverStatusType]?.textColor,
                    border: `1px solid ${STATUS_CONFIG[selectedCaregiver.status as CaregiverStatusType]?.borderBadge}`,
                    marginBottom: '0.4rem',
                  }}
                >
                  {selectedCaregiver.status.replace('_', ' ')}
                </span>
                <h2 style={{ fontSize: '1.5rem', color: '#ffffff' }}>
                  {selectedCaregiver.fullName}
                </h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  ID: {selectedCaregiver.id}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '0.4rem', fontSize: '0.85rem' }}>
                  <span style={{ color: '#fbbf24', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    ★ {selectedCaregiver.averageRating ? Number(selectedCaregiver.averageRating).toFixed(1) : 'New'}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    ({selectedCaregiver.totalRatings || 0} customer {selectedCaregiver.totalRatings === 1 ? 'review' : 'reviews'})
                  </span>
                  <span style={{ color: 'var(--border-card)' }}>•</span>
                  <span style={{ color: 'var(--primary-400)', fontWeight: 600 }}>
                    {selectedCaregiver.jobsCompleted || 0} {selectedCaregiver.jobsCompleted === 1 ? 'job completed' : 'jobs completed'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedCaregiver(null)}
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
                backgroundColor: 'rgba(11, 17, 32, 0.7)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Change Operational Status:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                {(['available', 'assigned', 'on_leave', 'inactive'] as CaregiverStatusType[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      handleUpdateStatus(selectedCaregiver.id, st);
                      setSelectedCaregiver({ ...selectedCaregiver, status: st });
                    }}
                    style={{
                      padding: '0.45rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border:
                        selectedCaregiver.status === st
                          ? `1px solid ${STATUS_CONFIG[st].accentColor}`
                          : '1px solid var(--border-subtle)',
                      backgroundColor:
                        selectedCaregiver.status === st
                          ? STATUS_CONFIG[st].bgBadge
                          : 'rgba(255, 255, 255, 0.04)',
                      color: selectedCaregiver.status === st ? '#ffffff' : 'var(--text-secondary)',
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
              <h3 style={{ fontSize: '0.95rem', color: '#ffffff', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.4rem' }}>
                Contact & Geolocation
              </h3>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Phone / WhatsApp:</span>
                <span style={{ color: '#ffffff', fontWeight: 600 }}>{selectedCaregiver.phone}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>District:</span>
                <span style={{ color: '#ffffff' }}>{selectedCaregiver.district || 'Kerala'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>City / Town:</span>
                <span style={{ color: '#ffffff' }}>{selectedCaregiver.city || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Coordinates (PostGIS):</span>
                <span style={{ color: 'var(--primary-400)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  {selectedCaregiver.latitude && selectedCaregiver.longitude
                    ? `${selectedCaregiver.latitude.toFixed(4)}, ${selectedCaregiver.longitude.toFixed(4)}`
                    : 'Not geocoded'}
                </span>
              </div>
              {selectedCaregiver.address && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Address:</span>
                  <span style={{ color: '#ffffff', textAlign: 'right', maxWidth: '240px' }}>{selectedCaregiver.address}</span>
                </div>
              )}
            </div>

            {/* Clinical Skills */}
            <div>
              <h3 style={{ fontSize: '0.95rem', color: '#ffffff', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.4rem', marginBottom: '0.65rem' }}>
                Clinical Competencies
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {(selectedCaregiver.skills || []).map((sk: string) => (
                  <span
                    key={sk}
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.2rem 0.55rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'rgba(20, 184, 166, 0.15)',
                      border: '1px solid rgba(20, 184, 166, 0.3)',
                      color: 'var(--primary-400)',
                    }}
                  >
                    ✓ {sk}
                  </span>
                ))}
              </div>
            </div>

            {/* Certifications & Document Management (Object Storage) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.4rem' }}>
                <h3 style={{ fontSize: '0.95rem', color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>Certifications & ID Proof</span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      backgroundColor: 'rgba(20, 184, 166, 0.2)',
                      color: 'var(--primary-400)',
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
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px dashed var(--border-subtle)',
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
                          backgroundColor: 'rgba(11, 17, 32, 0.8)',
                          border: isExpired
                            ? '1px solid rgba(239, 68, 68, 0.4)'
                            : isExpiringSoon
                            ? '1px solid rgba(245, 158, 11, 0.4)'
                            : '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          padding: '0.75rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.85rem' }}>
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
                                  color: '#34d399',
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
                                  color: '#fbbf24',
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
                            <span style={{ color: '#34d399' }}>
                              ✓ Valid ({doc.daysUntilExpiry} days left)
                            </span>
                          )}
                          {isExpiringSoon && (
                            <span style={{ color: '#fbbf24', fontWeight: 600 }}>
                              ⚠️ Expiring Soon ({doc.daysUntilExpiry} days left!)
                            </span>
                          )}
                          {isExpired && (
                            <span style={{ color: '#f87171', fontWeight: 600 }}>
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
                              backgroundColor: 'rgba(255, 255, 255, 0.06)',
                              color: '#ffffff',
                              border: '1px solid var(--border-subtle)',
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
                                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                                color: '#34d399',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
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
                              color: '#f87171',
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
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  marginTop: '0.5rem',
                }}
              >
                <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#ffffff' }}>
                  + Upload Document or Certificate
                </div>

                {uploadError && (
                  <div style={{ padding: '0.5rem', borderRadius: '4px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: '0.75rem' }}>
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
                      style={{ fontSize: '0.775rem', padding: '0.4rem' }}
                    >
                      {Object.entries(DOCUMENT_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k} style={{ background: '#0b1120' }}>
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
                      style={{ fontSize: '0.775rem', padding: '0.4rem' }}
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
                    style={{ fontSize: '0.775rem', padding: '0.4rem' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Choose File (PDF, PNG, JPG, WEBP — Max 10MB)
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
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)',
                      width: '100%',
                    }}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={uploadingDoc}
                  className="btn-primary"
                  style={{ padding: '0.5rem', fontSize: '0.8rem', marginTop: '0.25rem' }}
                >
                  {uploadingDoc ? 'Uploading to Object Storage...' : 'Upload Document'}
                </button>
              </form>
            </div>

            {/* Daily Rate & Compensation Configuration */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.4rem' }}>
                <h3 style={{ fontSize: '0.95rem', color: '#ffffff', margin: 0 }}>
                  Daily Rate Configuration & Commission Split
                </h3>
                <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>Phase 6</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>
                    Standard Daily Rate (₹ / Day)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="1200"
                    value={editDailyRate}
                    onChange={(e) => setEditDailyRate(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>
                    24-Hr Live-in Rate (₹ / Day)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="1800"
                    value={editLiveInRate}
                    onChange={(e) => setEditLiveInRate(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>
                    Hourly / Overtime Rate (₹ / Hr)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="150"
                    value={editHourlyRate}
                    onChange={(e) => setEditHourlyRate(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>
                    Agency Commission Split (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="15"
                    value={editCommissionPercentage}
                    onChange={(e) => setEditCommissionPercentage(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Real-time Calculation Breakdown Preview */}
              {typeof editDailyRate === 'number' && editDailyRate > 0 && (
                <div
                  style={{
                    backgroundColor: 'rgba(52, 211, 153, 0.08)',
                    border: '1px solid rgba(52, 211, 153, 0.25)',
                    borderRadius: '8px',
                    padding: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Calculated Daily Split Preview
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>Gross Customer Daily Rate:</span>
                    <strong style={{ color: '#ffffff' }}>₹{editDailyRate.toLocaleString('en-IN')}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>Agency Commission ({(typeof editCommissionPercentage === 'number' ? editCommissionPercentage : 15)}%):</span>
                    <span style={{ color: '#f59e0b' }}>
                      - ₹{Math.round(editDailyRate * ((typeof editCommissionPercentage === 'number' ? editCommissionPercentage : 15) / 100)).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div
                    style={{
                      borderTop: '1px solid rgba(52, 211, 153, 0.2)',
                      paddingTop: '0.4rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: '#34d399',
                    }}
                  >
                    <span>Net Caregiver Payout:</span>
                    <span>
                      ₹{(editDailyRate - Math.round(editDailyRate * ((typeof editCommissionPercentage === 'number' ? editCommissionPercentage : 15) / 100))).toLocaleString('en-IN')} / day
                    </span>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Rate Tier / Terms Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Senior ICU nurse rate, weekend extra apply"
                  value={editRateNotes}
                  onChange={(e) => setEditRateNotes(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Staff Internal Notes</label>
                <textarea
                  rows={2}
                  placeholder="Internal notes about caregiver preferences or shifts..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="form-textarea"
                />
              </div>

              <button
                onClick={handleSaveDrawerDetails}
                disabled={updatingDrawer}
                className="btn-primary"
                style={{ padding: '0.65rem' }}
              >
                {updatingDrawer ? 'Saving Rate Configuration...' : 'Save Rate Configuration'}
              </button>
            </div>

            {/* Account & Credentials Management */}
            <div
              style={{
                marginTop: 'auto',
                paddingTop: '1.25rem',
                borderTop: '1px solid var(--border-card)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Portal Account: {selectedCaregiver.email || selectedCaregiver.phone}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => handleResetCredentials(selectedCaregiver.id)}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '0.55rem', fontSize: '0.825rem' }}
                >
                  Regenerate Password
                </button>

                <a
                  href={`https://wa.me/${selectedCaregiver.phone.replace(/[^0-9]/g, '')}`}
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
      )}

      {/* Reset Credentials Modal */}
      {resetModalData && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
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
              Portal Credentials Refreshed
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Share this updated password with the caregiver:
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
              <div>User: {resetModalData.username}</div>
              <div>Password: <strong style={{ color: '#fbbf24' }}>{resetModalData.temporaryPassword}</strong></div>
              <div>Access Code: {resetModalData.accessCode}</div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Portal: ${resetModalData.portalUrl}\nUser: ${resetModalData.username}\nPassword: ${resetModalData.temporaryPassword}`
                  );
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="btn-secondary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>

              <button
                onClick={() => setResetModalData(null)}
                className="btn-primary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk CSV Import Modal */}
      {showImportModal && (
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
                onClick={handleCloseImportModal}
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
                    border: '2px dashed rgba(255, 255, 255, 0.15)',
                    borderRadius: 'var(--radius-lg, 12px)',
                    padding: '1.75rem',
                    textAlign: 'center',
                    backgroundColor: importFile ? 'rgba(45, 212, 191, 0.05)' : 'rgba(15, 23, 42, 0.4)',
                    transition: 'all 0.2s',
                    marginBottom: '1.25rem',
                  }}
                >
                  <input
                    type="file"
                    id="bulk-csv-input"
                    accept=".csv,text/csv"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleSelectImportFile(e.target.files[0]);
                      }
                    }}
                  />
                  {importFile ? (
                    <div>
                      <div style={{ color: 'var(--primary-400, #2dd4bf)', fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                        Selected: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                      </div>
                      <label
                        htmlFor="bulk-csv-input"
                        style={{
                          display: 'inline-block',
                          color: 'var(--text-muted)',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          marginTop: '0.25rem',
                        }}
                      >
                        Change file
                      </label>
                    </div>
                  ) : (
                    <div>
                      <svg
                        width="36"
                        height="36"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.4)"
                        strokeWidth="1.5"
                        style={{ margin: '0 auto 0.75rem' }}
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <p style={{ color: '#ffffff', fontSize: '0.9rem', marginBottom: '0.35rem', fontWeight: 500 }}>
                        Drag & drop your CSV file here, or{' '}
                        <label
                          htmlFor="bulk-csv-input"
                          style={{ color: 'var(--primary-400, #2dd4bf)', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          browse
                        </label>
                      </p>
                      <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                        Columns supported: fullName, phone, email, dailyRate, district, competencies, status, notes
                      </span>
                    </div>
                  )}
                </div>

                {/* CSV Local Preview Table */}
                {importPreviewRows.length > 0 && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                      File Preview (First {Math.min(5, importPreviewRows.length - 1)} rows):
                    </div>
                    <div style={{ overflowX: 'auto', border: '1px solid var(--border-card)', borderRadius: '6px' }}>
                      <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <tbody>
                          {importPreviewRows.map((row, idx) => (
                            <tr
                              key={idx}
                              style={{
                                backgroundColor: idx === 0 ? 'rgba(30, 41, 59, 0.8)' : 'transparent',
                                borderBottom: '1px solid var(--border-card)',
                                fontWeight: idx === 0 ? 600 : 400,
                                color: idx === 0 ? '#38bdf8' : 'var(--text-secondary)',
                              }}
                            >
                              {row.slice(0, 6).map((cell, cIdx) => (
                                <td key={cIdx} style={{ padding: '0.4rem 0.6rem', whiteSpace: 'nowrap' }}>
                                  {cell || '-'}
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
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#f87171',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      marginBottom: '1rem',
                    }}
                  >
                    {importError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={handleCloseImportModal}
                    className="btn-secondary"
                    style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteBulkImport}
                    disabled={!importFile || isImporting}
                    className="btn-primary"
                    style={{ padding: '0.6rem 1.4rem', fontSize: '0.85rem' }}
                  >
                    {isImporting ? 'Processing Staff List...' : 'Import Staff Now'}
                  </button>
                </div>
              </>
            )}

            {/* Results Screen */}
            {importResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  <div
                    style={{
                      backgroundColor: 'rgba(30, 41, 59, 0.5)',
                      padding: '1rem',
                      borderRadius: '8px',
                      textAlign: 'center',
                      border: '1px solid var(--border-card)',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Rows</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ffffff' }}>
                      {importResult.totalProcessed}
                    </div>
                  </div>
                  <div
                    style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      padding: '1rem',
                      borderRadius: '8px',
                      textAlign: 'center',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: '#34d399' }}>Imported Staff</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>
                      {importResult.successfulCount}
                    </div>
                  </div>
                  <div
                    style={{
                      backgroundColor: importResult.skippedCount > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(30, 41, 59, 0.3)',
                      padding: '1rem',
                      borderRadius: '8px',
                      textAlign: 'center',
                      border: `1px solid ${importResult.skippedCount > 0 ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-card)'}`,
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: importResult.skippedCount > 0 ? '#f87171' : 'var(--text-muted)' }}>
                      Skipped / Duplicate
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: importResult.skippedCount > 0 ? '#ef4444' : '#94a3b8' }}>
                      {importResult.skippedCount}
                    </div>
                  </div>
                </div>

                {/* Handover Credentials Export */}
                {importResult.successfulCount > 0 && (
                  <div
                    style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      borderRadius: '8px',
                      padding: '1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '1rem',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: '#10b981', fontSize: '0.9rem' }}>
                        Portal Access Credentials Ready
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Temporary passwords & access codes generated for all {importResult.successfulCount} onboarded caregivers.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportCredentials}
                      className="btn-primary"
                      style={{
                        backgroundColor: '#10b981',
                        borderColor: '#059669',
                        padding: '0.55rem 1.1rem',
                        fontSize: '0.85rem',
                        whiteSpace: 'nowrap',
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
                      <span>Export Credentials (CSV)</span>
                    </button>
                  </div>
                )}

                {/* Skipped Rows Error Details */}
                {importResult.errors && importResult.errors.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f87171', marginBottom: '0.4rem' }}>
                      Skipped Rows Notice ({importResult.errors.length}):
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
                    onClick={handleCloseImportModal}
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
      )}
    </div>
  );
}
