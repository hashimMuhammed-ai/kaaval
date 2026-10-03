'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '../utils/api';

export interface CustomerData {
  id: string;
  tenantId: string;
  requestId?: string | null;
  referenceId: string;
  patientName: string;
  patientAge?: string | null;
  patientGender?: string | null;
  patientCondition?: string | null;
  mobilityStatus?: string | null;
  medicalEquipment?: string | null;
  primaryContactName: string;
  relationship?: string | null;
  phone: string;
  alternatePhone?: string | null;
  email?: string | null;
  isWhatsapp: boolean;
  address?: string | null;
  locality?: string | null;
  district: string;
  pincode?: string | null;
  serviceType: string;
  duration: string;
  engagementPeriod?: string | null;
  genderPreference?: string | null;
  startDate: string;
  status: 'active' | 'pending' | 'paused' | 'inactive' | 'discharged';
  assignedCaregiverId?: string | null;
  assignedCaregiver?: {
    id: string;
    fullName: string;
    phone: string;
    gender?: string;
    experienceYears?: number;
    dailyRate?: number;
    status?: string;
    averageRating?: number;
    totalRatings?: number;
    jobsCompleted?: number;
  } | null;
  request?: {
    id: string;
    referenceId: string;
    source?: string;
    createdAt?: string;
  } | null;
  assignments?: AssignmentHistoryItem[];
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentHistoryItem {
  id: string;
  caregiverId: string;
  startDate: string;
  endDate?: string | null;
  status: 'active' | 'completed' | 'cancelled' | 'replaced';
  replacedById?: string | null;
  replacementReason?: string | null;
  billingRate?: number;
  caregiverDailyRate?: number;
  notes?: string | null;
  caregiver?: {
    id: string;
    fullName: string;
    phone: string;
    gender?: string;
    experienceYears?: number;
    dailyRate?: number;
    averageRating?: number;
  } | null;
  replacedBy?: {
    id: string;
    caregiverId: string;
    startDate: string;
    caregiver?: {
      id: string;
      fullName: string;
      phone: string;
    } | null;
  } | null;
  replacedAssignments?: Array<{
    id: string;
    caregiverId: string;
    caregiver?: {
      id: string;
      fullName: string;
    } | null;
  }>;
  replacementRequestedAt?: string | null;
  replacementSlaMinutes?: number | null;
  replacementSlaEscalatedAt?: string | null;
  replacementSlaStatus?: 'none' | 'pending' | 'escalated' | 'resolved';
  absenceReason?: string | null;
  absenceNotes?: string | null;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; dot: string; desc: string }
> = {
  active: {
    label: 'Active Care',
    color: '#34d399',
    bg: 'rgba(16, 185, 129, 0.15)',
    border: 'rgba(16, 185, 129, 0.35)',
    dot: '#10b981',
    desc: 'Caregiver currently deployed and actively attending',
  },
  pending: {
    label: 'Pending Assignment',
    color: '#fbbf24',
    bg: 'rgba(245, 158, 11, 0.15)',
    border: 'rgba(245, 158, 11, 0.35)',
    dot: '#f59e0b',
    desc: 'Patient onboarded, awaiting staff or caregiver assignment',
  },
  paused: {
    label: 'Temporarily Paused',
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.15)',
    border: 'rgba(56, 189, 248, 0.35)',
    dot: '#38bdf8',
    desc: 'Care temporarily on hold (hospitalization/family travel)',
  },
  discharged: {
    label: 'Discharged / Completed',
    color: '#a78bfa',
    bg: 'rgba(167, 139, 250, 0.15)',
    border: 'rgba(167, 139, 250, 0.35)',
    dot: '#a78bfa',
    desc: 'Care plan completed successfully or patient recovered',
  },
  inactive: {
    label: 'Inactive',
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.15)',
    border: 'rgba(148, 163, 184, 0.35)',
    dot: '#64748b',
    desc: 'Account discontinued or cancelled',
  },
};

const SERVICE_LABELS: Record<string, string> = {
  elderly_care: 'Elderly Daily Assistance',
  bedridden_care: 'Bedridden & Palliative Care',
  post_op: 'Post-Operative Recovery',
  dementia_care: 'Dementia & Alzheimer’s Care',
  specialized_nursing: 'Specialized Nursing Care',
  mother_baby: 'Mother & Newborn Care',
};

const DURATION_LABELS: Record<string, string> = {
  '24_hours': '24 Hours Live-In Care',
  '12_day': '12h Day Shift (8 AM - 8 PM)',
  '12_night': '12h Night Shift (8 PM - 8 AM)',
  custom: 'Custom Flexible Shift',
};

const MOBILITY_LABELS: Record<string, { label: string; icon: string }> = {
  independent: { label: 'Independent Mobility', icon: '🚶‍♂️' },
  assisted: { label: 'Assisted Walking (Requires Help)', icon: '🦯' },
  wheelchair: { label: 'Wheelchair Dependent', icon: '♿' },
  bedridden: { label: 'Bedridden / Immobile', icon: '🛏️' },
};

export const ABSENCE_REASON_CONFIG: Record<
  string,
  { label: string; icon: string; bg: string; border: string; text: string }
> = {
  leave: {
    label: 'Medical / Sick Leave',
    icon: '🌿',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.35)',
    text: '#6ee7b7',
  },
  quit: {
    label: 'Caregiver Resigned / Left Post',
    icon: '🚪',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.35)',
    text: '#fcd34d',
  },
  complaint: {
    label: 'Customer Complaint / Quality Issue',
    icon: '⚠️',
    bg: 'rgba(244, 63, 94, 0.12)',
    border: 'rgba(244, 63, 94, 0.35)',
    text: '#fda4af',
  },
  emergency: {
    label: 'Emergency Backup Coverage',
    icon: '🚨',
    bg: 'rgba(239, 68, 68, 0.15)',
    border: 'rgba(239, 68, 68, 0.4)',
    text: '#fca5a5',
  },
  rotation: {
    label: 'Scheduled Rotation / Shift',
    icon: '🔄',
    bg: 'rgba(59, 130, 246, 0.12)',
    border: 'rgba(59, 130, 246, 0.35)',
    text: '#93c5fd',
  },
  other: {
    label: 'Administrative Reassignment',
    icon: 'ℹ️',
    bg: 'rgba(148, 163, 184, 0.12)',
    border: 'rgba(148, 163, 184, 0.35)',
    text: '#cbd5e1',
  },
};

export function getAbsenceReasonConfig(reason?: string | null) {
  if (!reason) return ABSENCE_REASON_CONFIG.other;
  const lower = reason.toLowerCase();
  if (lower.includes('quit')) return ABSENCE_REASON_CONFIG.quit;
  if (lower.includes('complaint')) return ABSENCE_REASON_CONFIG.complaint;
  if (lower.includes('leave') || lower.includes('sick')) return ABSENCE_REASON_CONFIG.leave;
  if (lower.includes('emergency')) return ABSENCE_REASON_CONFIG.emergency;
  if (lower.includes('rotation')) return ABSENCE_REASON_CONFIG.rotation;
  return ABSENCE_REASON_CONFIG[reason] || ABSENCE_REASON_CONFIG.other;
}

export interface CustomerDetailViewProps {
  customer: CustomerData;
  onUpdate?: (updated: CustomerData) => void;
  onBack?: () => void;
}

export default function CustomerDetailView({
  customer: initialCustomer,
  onUpdate,
  onBack,
}: CustomerDetailViewProps) {
  const [customer, setCustomer] = useState<CustomerData>(initialCustomer);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesText, setNotesText] = useState(customer.notes || '');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Caregiver assignment modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [availableCaregivers, setAvailableCaregivers] = useState<any[]>([]);
  const [loadingCaregivers, setLoadingCaregivers] = useState(false);
  const [selectedCaregiverId, setSelectedCaregiverId] = useState<string>('');
  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false);
  const [isSendingFeedbackRequest, setIsSendingFeedbackRequest] = useState(false);
  const [feedbackData, setFeedbackData] = useState<any | null>(null);

  // Assignment history state
  const [assignmentHistory, setAssignmentHistory] = useState<AssignmentHistoryItem[]>(
    Array.isArray(initialCustomer?.assignments) ? initialCustomer.assignments : []
  );
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [replacementReason, setReplacementReason] = useState<string>('leave');
  const [replacementNotes, setReplacementNotes] = useState<string>('');
  const [replacementDate, setReplacementDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const historyList = Array.isArray(assignmentHistory) ? assignmentHistory : [];
  const activeAssignment = historyList.find((a) => a.status === 'active');

  // Replacement SLA state
  const [showSlaModal, setShowSlaModal] = useState(false);
  const [absenceReasonInput, setAbsenceReasonInput] = useState('leave');
  const [absenceNotesInput, setAbsenceNotesInput] = useState('');
  const [slaMinutesInput, setSlaMinutesInput] = useState(120);
  const [isRequestingReplacement, setIsRequestingReplacement] = useState(false);
  const [isEscalatingSla, setIsEscalatingSla] = useState(false);

  const handleRequestReplacementSla = async () => {
    if (!activeAssignment) return;
    setIsRequestingReplacement(true);
    try {
      await apiFetch(`/assignments/${activeAssignment.id}/request-replacement`, {
        method: 'POST',
        body: JSON.stringify({
          absenceReason: absenceReasonInput,
          absenceNotes: absenceNotesInput,
          slaMinutes: Number(slaMinutesInput),
        }),
      });
      // Refresh history
      const res = await apiFetch(`/assignments/customer/${customer.id}/history`);
      if (Array.isArray(res?.data)) {
        setAssignmentHistory(res.data);
      }
      setShowSlaModal(false);
    } catch (err: any) {
      console.warn('Request replacement SLA failed:', err.message);
    } finally {
      setIsRequestingReplacement(false);
    }
  };

  const handleEscalateSlaNow = async () => {
    if (!activeAssignment) return;
    setIsEscalatingSla(true);
    try {
      await apiFetch(`/assignments/${activeAssignment.id}/escalate`, {
        method: 'POST',
      });
      // Refresh history
      const res = await apiFetch(`/assignments/customer/${customer.id}/history`);
      if (Array.isArray(res?.data)) {
        setAssignmentHistory(res.data);
      }
    } catch (err: any) {
      console.warn('Escalate SLA failed:', err.message);
    } finally {
      setIsEscalatingSla(false);
    }
  };

  useEffect(() => {
    setCustomer(initialCustomer);
    setNotesText(initialCustomer.notes || '');

    const fetchFeedback = async () => {
      try {
        const res = await apiFetch(`/feedback?customerId=${initialCustomer.id}&limit=1`);
        if (res?.data && res.data.length > 0) {
          setFeedbackData(res.data[0]);
        }
      } catch {
        // Feedback not submitted yet
      }
    };

    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const res = await apiFetch(`/assignments/customer/${initialCustomer.id}/history`);
        if (Array.isArray(res?.data)) {
          setAssignmentHistory(res.data);
        } else if (Array.isArray(initialCustomer?.assignments)) {
          setAssignmentHistory(initialCustomer.assignments);
        } else {
          setAssignmentHistory([]);
        }
      } catch {
        if (Array.isArray(initialCustomer?.assignments)) {
          setAssignmentHistory(initialCustomer.assignments);
        } else {
          setAssignmentHistory([]);
        }
      } finally {
        setLoadingHistory(false);
      }
    };

    if (initialCustomer?.id) {
      fetchFeedback();
      fetchHistory();
    }
  }, [initialCustomer]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const currentStatus = STATUS_CONFIG[customer.status] || STATUS_CONFIG.pending;

  // Handle post-assignment WhatsApp rating request dispatch
  const handleSendFeedbackRequest = async () => {
    setIsSendingFeedbackRequest(true);
    try {
      const res = await apiFetch('/whatsapp/feedback-request', {
        method: 'POST',
        body: JSON.stringify({
          assignmentId: customer.id,
          customerPhone: customer.phone,
          contactName: customer.primaryContactName,
          patientName: customer.patientName,
          caregiverName: customer.assignedCaregiver?.fullName || 'Assigned Caregiver',
        }),
      });
      if (res?.success) {
        showToast(`WhatsApp rating request dispatched to ${customer.primaryContactName} (${customer.phone})`);
      } else {
        showToast(res?.message || 'Feedback request dispatched successfully.');
      }
    } catch (err: any) {
      showToast(`Failed to dispatch feedback request: ${err.message}`);
    } finally {
      setIsSendingFeedbackRequest(false);
    }
  };

  // Handle status update
  const handleStatusChange = async (newStatus: CustomerData['status']) => {
    if (newStatus === customer.status) return;
    setIsUpdatingStatus(true);
    try {
      const res = await apiFetch(`/customers/${customer.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (res?.data) {
        setCustomer(res.data);
        if (onUpdate) onUpdate(res.data);
        showToast(`Status updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      }
    } catch (err: any) {
      showToast(`Failed to update status: ${err.message}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle saving notes
  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    try {
      const res = await apiFetch(`/customers/${customer.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ notes: notesText }),
      });
      if (res?.data) {
        setCustomer(res.data);
        if (onUpdate) onUpdate(res.data);
        showToast('Clinical & care notes saved successfully.');
      }
    } catch (err: any) {
      showToast(`Failed to save notes: ${err.message}`);
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Open Caregiver Selector Modal
  const handleOpenAssignModal = async () => {
    setShowAssignModal(true);
    setLoadingCaregivers(true);
    try {
      const res = await apiFetch('/caregivers?limit=100');
      const list = res?.data || [];
      setAvailableCaregivers(list);
      setSelectedCaregiverId(customer.assignedCaregiverId || (list[0]?.id || ''));
    } catch {
      setAvailableCaregivers([]);
    } finally {
      setLoadingCaregivers(false);
    }
  };

  // Submit caregiver assignment or replacement
  const handleConfirmAssignment = async () => {
    if (!selectedCaregiverId) return;
    setIsSubmittingAssignment(true);
    try {
      // If customer has an active assignment, use replacement API
      const activeAssignment = assignmentHistory.find(
        (a) => a.status === 'active'
      );

      if (activeAssignment?.id && customer.assignedCaregiverId) {
        try {
          await apiFetch(`/assignments/${activeAssignment.id}/replace`, {
            method: 'POST',
            body: JSON.stringify({
              replacementCaregiverId: selectedCaregiverId,
              startDate: replacementDate,
              replacementReason,
              absenceReason: replacementReason,
              absenceNotes: replacementNotes,
              notes: replacementNotes,
            }),
          });
        } catch (err: any) {
          console.warn('API replace assignment:', err.message);
        }
      } else {
        try {
          await apiFetch(`/assignments`, {
            method: 'POST',
            body: JSON.stringify({
              customerId: customer.id,
              caregiverId: selectedCaregiverId,
              startDate: replacementDate,
              notes: replacementNotes,
            }),
          });
        } catch (err: any) {
          console.warn('API create assignment:', err.message);
        }
      }

      const res = await apiFetch(`/customers/${customer.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          assignedCaregiverId: selectedCaregiverId,
          status: customer.status === 'pending' ? 'active' : customer.status,
        }),
      });

      if (res?.data) {
        setCustomer(res.data);
        if (onUpdate) onUpdate(res.data);
      }

      // Refresh history
      try {
        const histRes = await apiFetch(`/assignments/customer/${customer.id}/history`);
        if (Array.isArray(histRes?.data)) {
          setAssignmentHistory(histRes.data);
        }
      } catch {
        // Mock fallback
      }

      setShowAssignModal(false);
      showToast(
        activeAssignment && customer.assignedCaregiverId
          ? 'Replacement caregiver assigned & history chain updated.'
          : 'Caregiver assigned and schedule synchronized.'
      );
    } catch (err: any) {
      showToast(`Failed to assign caregiver: ${err.message}`);
    } finally {
      setIsSubmittingAssignment(false);
    }
  };

  // Remove caregiver assignment
  const handleUnassignCaregiver = async () => {
    if (!confirm('Are you sure you want to unassign this caregiver?')) return;
    try {
      const res = await apiFetch(`/customers/${customer.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          assignedCaregiverId: null,
          status: 'pending',
        }),
      });
      if (res?.data) {
        setCustomer(res.data);
        if (onUpdate) onUpdate(res.data);
        showToast('Caregiver removed. Status set to Pending.');
      }
    } catch (err: any) {
      showToast(`Failed to unassign: ${err.message}`);
    }
  };

  const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}?text=${encodeURIComponent(
    `Hello ${customer.primaryContactName}, regarding care services for ${customer.patientName} (${customer.referenceId})...`
  )}`;

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: '#0f172a',
            border: '1px solid #14b8a6',
            color: '#f8fafc',
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.9rem',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <span style={{ color: '#2dd4bf' }}>●</span>
          {toastMessage}
        </div>
      )}

      {/* Top Header / Breadcrumbs & Quick Actions */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.5rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid var(--border-card)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          {onBack ? (
            <button
              onClick={onBack}
              id="btn-back-to-list"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--text-secondary)',
                borderRadius: '8px',
                padding: '0.45rem 0.85rem',
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              ← Back
            </button>
          ) : (
            <Link
              href="/dashboard/customers"
              id="link-back-to-customers"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--text-secondary)',
                borderRadius: '8px',
                padding: '0.45rem 0.85rem',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              ← All Customers
            </Link>
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h1
                id="customer-patient-name-title"
                style={{
                  fontSize: '1.65rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                  margin: 0,
                }}
              >
                {customer.patientName}
              </h1>
              <span
                id="customer-reference-pill"
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(20, 184, 166, 0.12)',
                  color: '#2dd4bf',
                  border: '1px solid rgba(20, 184, 166, 0.25)',
                }}
              >
                {customer.referenceId}
              </span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Customer Account • Registered on{' '}
              {new Date(customer.createdAt).toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
          </div>
        </div>

        {/* Status Dropdown & Communication Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Status Badge & Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status:</span>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <select
                id="customer-status-select"
                value={customer.status}
                disabled={isUpdatingStatus}
                onChange={(e) => handleStatusChange(e.target.value as any)}
                style={{
                  backgroundColor: currentStatus.bg,
                  color: currentStatus.color,
                  border: `1px solid ${currentStatus.border}`,
                  padding: '0.45rem 1rem 0.45rem 0.85rem',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: isUpdatingStatus ? 'not-allowed' : 'pointer',
                  outline: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  appearance: 'none',
                }}
              >
                <option value="active">Active Care</option>
                <option value="pending">Pending Assignment</option>
                <option value="paused">Temporarily Paused</option>
                <option value="discharged">Discharged / Completed</option>
                <option value="inactive">Inactive</option>
              </select>
              <span
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  fontSize: '0.7rem',
                  color: currentStatus.color,
                }}
              >
                ▼
              </span>
            </div>
          </div>

          <a
            id="btn-whatsapp-family"
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#10b981',
              color: '#ffffff',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
            }}
          >
            <span>💬</span> WhatsApp Family
          </a>

          {customer.assignedCaregiver && (
            <button
              id="btn-request-whatsapp-rating"
              onClick={handleSendFeedbackRequest}
              disabled={isSendingFeedbackRequest}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                color: '#fbbf24',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                padding: '0.5rem 0.95rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: isSendingFeedbackRequest ? 'wait' : 'pointer',
              }}
            >
              <span>⭐</span> {isSendingFeedbackRequest ? 'Sending...' : 'Request Rating'}
            </button>
          )}

          <a
            id="btn-call-family"
            href={`tel:${customer.phone}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              padding: '0.5rem 0.9rem',
              borderRadius: '8px',
              fontSize: '0.875rem',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              textDecoration: 'none',
            }}
          >
            <span>📞</span> Call
          </a>
        </div>
      </div>

      {/* Grid: 2 Columns (Patient Details & Requirements on Left, Caregiver & Contact on Right) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        {/* LEFT COLUMN: Patient Info & Care Requirements */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* 1. Patient Clinical Profile Card */}
          <div
            id="card-patient-info"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: '14px',
              padding: '1.5rem',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.25rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                paddingBottom: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.25rem' }}>🧑‍⚕️</span>
                <h2
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    margin: 0,
                  }}
                >
                  Patient Healthcare Profile
                </h2>
              </div>

              {/* Data Sensitivity Shield Pill (PROJECT_BRIEF.md compliance) */}
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.72rem',
                  color: '#38bdf8',
                  backgroundColor: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  fontWeight: 500,
                }}
              >
                🔒 Sensitive Health Data
              </span>
            </div>

            {/* Core Patient Demographics */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem',
                marginBottom: '1.25rem',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                padding: '1rem',
                borderRadius: '10px',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Full Name
                </div>
                <div
                  id="patient-name-value"
                  style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ffffff', marginTop: '2px' }}
                >
                  {customer.patientName}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Age
                </div>
                <div
                  id="patient-age-value"
                  style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ffffff', marginTop: '2px' }}
                >
                  {customer.patientAge ? `${customer.patientAge} Years` : 'Not specified'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Gender
                </div>
                <div
                  id="patient-gender-value"
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: '#ffffff',
                    marginTop: '2px',
                    textTransform: 'capitalize',
                  }}
                >
                  {customer.patientGender || 'Unspecified'}
                </div>
              </div>
            </div>

            {/* Medical Condition & Diagnosis */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <span>📋</span> Medical Diagnosis & Health Condition
              </div>
              <div
                id="patient-condition-box"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#fca5a5',
                  padding: '0.85rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  lineHeight: '1.5',
                }}
              >
                {customer.patientCondition || 'No specific medical condition or diagnosis noted.'}
              </div>
            </div>

            {/* Mobility Status & Medical Equipment */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    marginBottom: '0.35rem',
                  }}
                >
                  Mobility Level
                </div>
                <div
                  id="patient-mobility-pill"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    backgroundColor: 'rgba(20, 184, 166, 0.12)',
                    color: '#2dd4bf',
                    border: '1px solid rgba(20, 184, 166, 0.3)',
                  }}
                >
                  <span>
                    {MOBILITY_LABELS[customer.mobilityStatus || 'assisted']?.icon || '🚶‍♂️'}
                  </span>
                  {MOBILITY_LABELS[customer.mobilityStatus || 'assisted']?.label ||
                    customer.mobilityStatus ||
                    'Assisted'}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    marginBottom: '0.35rem',
                  }}
                >
                  Medical Equipment
                </div>
                <div
                  id="patient-equipment-pill"
                  style={{
                    display: 'inline-block',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: '#f8fafc',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  {customer.medicalEquipment && customer.medicalEquipment !== 'none'
                    ? customer.medicalEquipment
                    : 'None required'}
                </div>
              </div>
            </div>

            {/* Care Location Details */}
            <div
              style={{
                marginTop: '1.25rem',
                paddingTop: '1rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <div
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '0.4rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <span>📍</span> Care Delivery Address
              </div>
              <div id="patient-location-details" style={{ fontSize: '0.9rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                {customer.address && <div>{customer.address}</div>}
                <div>
                  {customer.locality ? `${customer.locality}, ` : ''}
                  <strong style={{ color: '#2dd4bf' }}>{customer.district}</strong>
                  {customer.pincode ? ` — ${customer.pincode}` : ''}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Care Requirement & Service Specifications Card */}
          <div
            id="card-requirement-info"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: '14px',
              padding: '1.5rem',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.25rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                paddingBottom: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.25rem' }}>🩺</span>
                <h2
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    margin: 0,
                  }}
                >
                  Care Requirements & Schedule
                </h2>
              </div>

              {customer.request?.referenceId && (
                <Link
                  id="link-intake-request"
                  href={`/dashboard/requests`}
                  style={{
                    fontSize: '0.75rem',
                    color: '#2dd4bf',
                    textDecoration: 'underline',
                  }}
                >
                  Intake Ref: {customer.request.referenceId}
                </Link>
              )}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
              }}
            >
              {/* Service Type */}
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '0.85rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Care Service Type
                </div>
                <div
                  id="requirement-service-type"
                  style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ffffff', marginTop: '3px' }}
                >
                  {SERVICE_LABELS[customer.serviceType] || customer.serviceType}
                </div>
              </div>

              {/* Shift Duration */}
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '0.85rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Shift / Duration
                </div>
                <div
                  id="requirement-duration"
                  style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ffffff', marginTop: '3px' }}
                >
                  {DURATION_LABELS[customer.duration] || customer.duration}
                </div>
              </div>

              {/* Engagement Period */}
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '0.85rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Engagement Period
                </div>
                <div
                  id="requirement-period"
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: '#ffffff',
                    marginTop: '3px',
                    textTransform: 'capitalize',
                  }}
                >
                  {customer.engagementPeriod?.replace(/_/g, ' ') || 'Ongoing'}
                </div>
              </div>

              {/* Gender Preference */}
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '0.85rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Caregiver Preference
                </div>
                <div
                  id="requirement-gender-pref"
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: '#ffffff',
                    marginTop: '3px',
                    textTransform: 'capitalize',
                  }}
                >
                  {customer.genderPreference === 'female'
                    ? 'Female Caregiver'
                    : customer.genderPreference === 'male'
                    ? 'Male Caregiver'
                    : 'Any Qualified Caregiver'}
                </div>
              </div>

              {/* Start Date */}
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '0.85rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Commencement Date
                </div>
                <div
                  id="requirement-start-date"
                  style={{ fontSize: '0.95rem', fontWeight: 600, color: '#38bdf8', marginTop: '3px' }}
                >
                  {customer.startDate}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Clinical Notes & Special Instructions */}
          <div
            id="card-notes"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: '14px',
              padding: '1.5rem',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.15rem' }}>📝</span>
                <h2
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    margin: 0,
                  }}
                >
                  Care Coordination Notes
                </h2>
              </div>

              <button
                id="btn-save-notes"
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
                style={{
                  backgroundColor: '#14b8a6',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.35rem 0.85rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: isSavingNotes ? 'wait' : 'pointer',
                }}
              >
                {isSavingNotes ? 'Saving...' : 'Save Notes'}
              </button>
            </div>

            <textarea
              id="customer-notes-input"
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Record care coordination notes, dietary requirements, doctor advice, or family preferences..."
              rows={4}
              style={{
                width: '100%',
                backgroundColor: 'rgba(11, 17, 32, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                padding: '0.75rem',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Assigned Caregiver & Family Contact */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* 1. Assigned Caregiver Card */}
          <div
            id="card-assigned-caregiver"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: customer.assignedCaregiver
                ? '1px solid rgba(16, 185, 129, 0.35)'
                : '1px solid rgba(245, 158, 11, 0.35)',
              borderRadius: '14px',
              padding: '1.5rem',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
              position: 'relative',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.25rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                paddingBottom: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.25rem' }}>👩‍⚕️</span>
                <h2
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    margin: 0,
                  }}
                >
                  Assigned Caregiver
                </h2>
              </div>

              {customer.assignedCaregiver ? (
                <span
                  id="caregiver-assigned-status-badge"
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#34d399',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    padding: '3px 10px',
                    borderRadius: '12px',
                  }}
                >
                  ● Assigned & Deployed
                </span>
              ) : (
                <span
                  id="caregiver-unassigned-status-badge"
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#fbbf24',
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    padding: '3px 10px',
                    borderRadius: '12px',
                  }}
                >
                  ● Unassigned
                </span>
              )}
            </div>

            {customer.assignedCaregiver ? (
              <div>
                {/* Caregiver Name & Profile Summary */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    marginBottom: '1rem',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(16, 185, 129, 0.2)',
                      border: '2px solid #10b981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.3rem',
                    }}
                  >
                    👩‍⚕️
                  </div>
                  <div>
                    <div
                      id="caregiver-full-name"
                      style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}
                    >
                      {customer.assignedCaregiver.fullName}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Phone: <a href={`tel:${customer.assignedCaregiver.phone}`} style={{ color: '#2dd4bf' }}>{customer.assignedCaregiver.phone}</a>
                    </div>
                  </div>
                </div>

                {/* Metrics: Experience, Rate */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.75rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    padding: '0.85rem',
                    borderRadius: '8px',
                    marginBottom: '1.25rem',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Experience</div>
                    <div id="caregiver-experience" style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ffffff' }}>
                      {customer.assignedCaregiver.experienceYears || '2+'} Years
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Agreed Daily Rate</div>
                    <div id="caregiver-daily-rate" style={{ fontSize: '0.95rem', fontWeight: 600, color: '#34d399' }}>
                      ₹{customer.assignedCaregiver.dailyRate ? customer.assignedCaregiver.dailyRate.toLocaleString('en-IN') : '950'}/day
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Customer Rating</div>
                    <div id="caregiver-rating" style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fbbf24' }}>
                      ★ {customer.assignedCaregiver.averageRating ? Number(customer.assignedCaregiver.averageRating).toFixed(1) : 'New'}{' '}
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                        ({customer.assignedCaregiver.totalRatings || 0})
                      </span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Jobs Completed</div>
                    <div id="caregiver-jobs-done" style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--primary-400)' }}>
                      {customer.assignedCaregiver.jobsCompleted || 0} Finished
                    </div>
                  </div>
                </div>

                {/* Actions: Contact & Reassign */}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    id="btn-reassign-caregiver"
                    onClick={handleOpenAssignModal}
                    style={{
                      flex: 1,
                      backgroundColor: 'rgba(20, 184, 166, 0.15)',
                      border: '1px solid rgba(20, 184, 166, 0.35)',
                      color: '#2dd4bf',
                      borderRadius: '8px',
                      padding: '0.55rem',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    🔄 Change Caregiver
                  </button>
                  <button
                    id="btn-remove-caregiver"
                    onClick={handleUnassignCaregiver}
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#f87171',
                      borderRadius: '8px',
                      padding: '0.55rem 0.85rem',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    Unassign
                  </button>
                </div>

                {/* Find Replacement via PostGIS Smart Matching Engine */}
                <Link
                  id="btn-find-replacement-matching"
                  href={`/dashboard/matching?assignmentId=${
                    historyList.find((a) => a.status === 'active')?.id || ''
                  }&customerId=${customer.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    width: '100%',
                    marginTop: '0.75rem',
                    backgroundColor: 'rgba(99, 102, 241, 0.15)',
                    border: '1px solid rgba(99, 102, 241, 0.4)',
                    color: '#a5b4fc',
                    borderRadius: '8px',
                    padding: '0.6rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span>🎯</span> Find Replacement (Smart Matching)
                </Link>

                {/* Replacement SLA Tracking & Escalation Card (Phase 10) */}
                {activeAssignment && (activeAssignment.replacementSlaStatus === 'pending' || activeAssignment.replacementSlaStatus === 'escalated') ? (
                  <div
                    id="box-replacement-sla-status"
                    style={{
                      marginTop: '0.75rem',
                      padding: '0.85rem',
                      borderRadius: '8px',
                      backgroundColor:
                        activeAssignment.replacementSlaStatus === 'escalated'
                          ? 'rgba(239, 68, 68, 0.15)'
                          : 'rgba(245, 158, 11, 0.15)',
                      border:
                        activeAssignment.replacementSlaStatus === 'escalated'
                          ? '1px solid rgba(239, 68, 68, 0.45)'
                          : '1px solid rgba(245, 158, 11, 0.45)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '1.1rem' }}>
                          {activeAssignment.replacementSlaStatus === 'escalated' ? '🚨' : '⏱️'}
                        </span>
                        <strong
                          style={{
                            fontSize: '0.85rem',
                            color:
                              activeAssignment.replacementSlaStatus === 'escalated'
                                ? '#fca5a5'
                                : '#fde047',
                          }}
                        >
                          {activeAssignment.replacementSlaStatus === 'escalated'
                            ? 'SLA Breached: Escalated to Owner'
                            : `Replacement SLA Active (${activeAssignment.replacementSlaMinutes || 120}m Window)`}
                        </strong>
                      </div>
                      <span
                        id="badge-sla-status"
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor:
                            activeAssignment.replacementSlaStatus === 'escalated'
                              ? 'rgba(239, 68, 68, 0.3)'
                              : 'rgba(245, 158, 11, 0.3)',
                          color:
                            activeAssignment.replacementSlaStatus === 'escalated'
                              ? '#f87171'
                              : '#fbbf24',
                        }}
                      >
                        {activeAssignment.replacementSlaStatus}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#e2e8f0', marginBottom: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span>Absence Reason: <strong style={{ color: '#ffffff' }}>{activeAssignment.absenceReason || 'Absence / Leave'}</strong></span>
                        {(() => {
                          const rCfg = getAbsenceReasonConfig(activeAssignment.absenceReason);
                          return (
                            <span
                              id="active-sla-absence-badge"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                backgroundColor: rCfg.bg,
                                border: `1px solid ${rCfg.border}`,
                                color: rCfg.text,
                              }}
                            >
                              <span>{rCfg.icon}</span> {rCfg.label}
                            </span>
                          );
                        })()}
                      </div>
                      {activeAssignment.absenceNotes ? (
                        <div style={{ color: 'rgba(254, 243, 199, 0.9)', fontSize: '0.75rem' }}>
                          Context Notes: {activeAssignment.absenceNotes}
                        </div>
                      ) : null}
                    </div>

                    {activeAssignment.replacementSlaStatus === 'pending' && (
                      <button
                        id="btn-escalate-sla-now"
                        onClick={handleEscalateSlaNow}
                        disabled={isEscalatingSla}
                        style={{
                          width: '100%',
                          padding: '0.45rem',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          backgroundColor: 'rgba(239, 68, 68, 0.2)',
                          border: '1px solid rgba(239, 68, 68, 0.5)',
                          color: '#fca5a5',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        {isEscalatingSla ? 'Escalating...' : '🚨 Escalate to Owner Now via WhatsApp/Push'}
                      </button>
                    )}
                  </div>
                ) : activeAssignment ? (
                  <button
                    id="btn-report-absence-trigger"
                    onClick={() => setShowSlaModal(true)}
                    style={{
                      width: '100%',
                      marginTop: '0.5rem',
                      padding: '0.55rem',
                      backgroundColor: 'rgba(245, 158, 11, 0.12)',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      color: '#fbbf24',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <span>⚠️</span> Report Absence / Start SLA Timer
                  </button>
                ) : null}
              </div>
            ) : (
              <div>
                <div
                  style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.08)',
                    border: '1px dashed rgba(245, 158, 11, 0.3)',
                    borderRadius: '8px',
                    padding: '1.25rem',
                    textAlign: 'center',
                    marginBottom: '1rem',
                  }}
                >
                  <div style={{ fontSize: '1.8rem', marginBottom: '0.4rem' }}>⏳</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fbbf24' }}>
                    No Caregiver Assigned
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Assign an active staff member to commence daily attendance and payroll logging.
                  </div>
                </div>

                <button
                  id="btn-assign-caregiver-trigger"
                  onClick={handleOpenAssignModal}
                  style={{
                    width: '100%',
                    backgroundColor: '#14b8a6',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.7rem',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span>+</span> Assign Available Caregiver
                </button>
              </div>
            )}
          </div>

          {/* Caregiver Assignment & Replacement History Timeline (Phase 10) */}
          <div
            id="card-assignment-history"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: '14px',
              padding: '1.5rem',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                paddingBottom: '0.65rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>📜</span>
                <h2
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    margin: 0,
                  }}
                >
                  Assignment & Replacement History
                </h2>
              </div>

              <span
                id="assignment-count-badge"
                style={{
                  fontSize: '0.72rem',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(20, 184, 166, 0.15)',
                  color: '#2dd4bf',
                  border: '1px solid rgba(20, 184, 166, 0.3)',
                  fontWeight: 600,
                }}
              >
                {historyList.length}{' '}
                {historyList.length === 1 ? 'Placement' : 'Placements'}
              </span>
            </div>

            {loadingHistory ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                Loading placement history...
              </div>
                ) : historyList.length === 0 ? (
                  <div
                    style={{
                      padding: '1.25rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: '8px',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '0.85rem',
                    }}
                  >
                    No placement history recorded yet. When caregivers are assigned or replaced, their full service timeline will appear here.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {historyList.map((item, idx) => {
                  const isActive = item.status === 'active';
                  const isReplaced = item.status === 'replaced';
                  const caregiverName = item.caregiver?.fullName || 'Assigned Caregiver';

                  return (
                    <div
                      key={item.id || idx}
                      id={`assignment-history-item-${idx}`}
                      style={{
                        padding: '1rem',
                        borderRadius: '10px',
                        backgroundColor: isActive
                          ? 'rgba(16, 185, 129, 0.08)'
                          : isReplaced
                          ? 'rgba(245, 158, 11, 0.06)'
                          : 'rgba(255, 255, 255, 0.02)',
                        border: isActive
                          ? '1px solid rgba(16, 185, 129, 0.3)'
                          : isReplaced
                          ? '1px solid rgba(245, 158, 11, 0.25)'
                          : '1px solid rgba(255, 255, 255, 0.08)',
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '0.4rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '1rem' }}>
                            {isActive ? '🟢' : isReplaced ? '🔄' : '⏱️'}
                          </span>
                          <span
                            style={{
                              fontWeight: 700,
                              color: '#ffffff',
                              fontSize: '0.95rem',
                            }}
                          >
                            {caregiverName}
                          </span>
                        </div>

                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            textTransform: 'capitalize',
                            backgroundColor: isActive
                              ? 'rgba(16, 185, 129, 0.2)'
                              : isReplaced
                              ? 'rgba(245, 158, 11, 0.2)'
                              : 'rgba(148, 163, 184, 0.2)',
                            color: isActive
                              ? '#34d399'
                              : isReplaced
                              ? '#fbbf24'
                              : '#94a3b8',
                            border: `1px solid ${
                              isActive
                                ? 'rgba(16, 185, 129, 0.4)'
                                : isReplaced
                                ? 'rgba(245, 158, 11, 0.4)'
                                : 'rgba(148, 163, 184, 0.3)'
                            }`,
                          }}
                        >
                          {item.status}
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--text-secondary)',
                          marginBottom: '0.4rem',
                        }}
                      >
                        📅 Period: <strong>{item.startDate}</strong>{' '}
                        {item.endDate ? (
                          <>
                            to <strong>{item.endDate}</strong>
                          </>
                        ) : (
                          <>– Present</>
                        )}
                        {item.caregiverDailyRate ? (
                          <span style={{ marginLeft: '0.8rem', color: '#34d399' }}>
                            ₹{item.caregiverDailyRate}/day
                          </span>
                        ) : null}
                      </div>

                      {/* If replaced, display replacement chain link and reason */}
                      {isReplaced && (
                        <div
                          id={`replacement-chain-box-${idx}`}
                          style={{
                            marginTop: '0.5rem',
                            padding: '0.6rem 0.75rem',
                            backgroundColor: 'rgba(245, 158, 11, 0.1)',
                            border: '1px dashed rgba(245, 158, 11, 0.35)',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            color: '#fef3c7',
                          }}
                        >
                          <div style={{ fontWeight: 600, color: '#fbbf24' }}>
                            ↳ Replaced by:{' '}
                            <span style={{ color: '#ffffff' }}>
                              {item.replacedBy?.caregiver?.fullName || 'Replacement Caregiver'}
                            </span>
                          </div>
                          {/* Absence context badge */}
                          <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            {(() => {
                              const rCfg = getAbsenceReasonConfig(item.absenceReason || item.replacementReason);
                              return (
                                <span
                                  id={`absence-badge-${idx}`}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    padding: '2px 7px',
                                    borderRadius: '4px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    backgroundColor: rCfg.bg,
                                    border: `1px solid ${rCfg.border}`,
                                    color: rCfg.text,
                                  }}
                                >
                                  <span>{rCfg.icon}</span> Absence Context: {rCfg.label}
                                </span>
                              );
                            })()}
                          </div>
                          {item.replacementReason && (
                            <div style={{ marginTop: '3px', color: '#fde68a' }}>
                              Reason: {item.replacementReason}
                            </div>
                          )}
                          {item.absenceNotes && (
                            <div style={{ marginTop: '2px', color: 'rgba(254, 243, 199, 0.85)', fontSize: '0.75rem' }}>
                              Context Notes: {item.absenceNotes}
                            </div>
                          )}
                        </div>
                      )}

                      {item.notes && (
                        <div
                          style={{
                            fontSize: '0.78rem',
                            color: 'var(--text-muted)',
                            marginTop: '0.4rem',
                            fontStyle: 'italic',
                          }}
                        >
                          Note: {item.notes}
                        </div>
                      )}

                      {/* Find Replacement for Active Assignment */}
                      {isActive && (
                        <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
                          <Link
                            id={`btn-replace-assignment-${item.id}`}
                            href={`/dashboard/matching?assignmentId=${item.id}&customerId=${customer.id}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.4rem 0.8rem',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              borderRadius: '6px',
                              backgroundColor: 'rgba(99, 102, 241, 0.15)',
                              border: '1px solid rgba(99, 102, 241, 0.35)',
                              color: '#a5b4fc',
                              textDecoration: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            <span>🎯</span> Find Replacement (Smart Matching)
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Customer Feedback & Rating Card (Phase 8) */}
          {feedbackData && (
            <div
              id="card-customer-feedback"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                borderRadius: '14px',
                padding: '1.5rem',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  paddingBottom: '0.65rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>⭐</span>
                  <h2
                    style={{
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      color: '#ffffff',
                      margin: 0,
                    }}
                  >
                    Customer Rating & Review
                  </h2>
                </div>
                <span
                  id="feedback-source-badge"
                  style={{
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    color: '#34d399',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    textTransform: 'capitalize',
                  }}
                >
                  Via {feedbackData.source || 'WhatsApp'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                <div style={{ color: '#fbbf24', fontSize: '1.25rem', letterSpacing: '2px' }}>
                  {'★'.repeat(feedbackData.rating || 5)}
                  {'☆'.repeat(Math.max(0, 5 - (feedbackData.rating || 5)))}
                </div>
                <span id="feedback-rating-value" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                  {feedbackData.rating} / 5 Stars
                </span>
              </div>

              {feedbackData.comment && (
                <div
                  id="feedback-customer-comment"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    fontSize: '0.875rem',
                    color: '#e2e8f0',
                    lineHeight: 1.5,
                    fontStyle: 'italic',
                  }}
                >
                  &ldquo;{feedbackData.comment}&rdquo;
                </div>
              )}
            </div>
          )}

          {/* 2. Primary Family Contact Card */}
          <div
            id="card-contact-info"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: '14px',
              padding: '1.5rem',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.25rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                paddingBottom: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.25rem' }}>📞</span>
                <h2
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    margin: 0,
                  }}
                >
                  Family & Primary Contact
                </h2>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Contact Person
                </div>
                <div
                  id="contact-name-value"
                  style={{ fontSize: '1.05rem', fontWeight: 600, color: '#ffffff', marginTop: '2px' }}
                >
                  {customer.primaryContactName}
                </div>
                <div
                  id="contact-relationship-value"
                  style={{ fontSize: '0.8rem', color: '#2dd4bf', textTransform: 'capitalize' }}
                >
                  Relationship: {customer.relationship?.replace(/_/g, ' ') || 'Family Member'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Phone Number
                </div>
                <div
                  id="contact-phone-value"
                  style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff', marginTop: '2px' }}
                >
                  <a href={`tel:${customer.phone}`} style={{ color: '#ffffff', textDecoration: 'none' }}>
                    {customer.phone}
                  </a>
                </div>
                {customer.alternatePhone && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Alt: {customer.alternatePhone}
                  </div>
                )}
              </div>

              {customer.email && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Email
                  </div>
                  <div id="contact-email-value" style={{ fontSize: '0.9rem', color: '#e2e8f0' }}>
                    {customer.email}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Caregiver Selection Modal */}
      {showAssignModal && (
        <div
          id="modal-assign-caregiver"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: '16px',
              padding: '1.75rem',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.25rem',
              }}
            >
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                Select Caregiver for {customer.patientName}
              </h3>
              <button
                onClick={() => setShowAssignModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Requirement: {SERVICE_LABELS[customer.serviceType] || customer.serviceType} in{' '}
              <strong style={{ color: '#2dd4bf' }}>{customer.district}</strong> (
              {customer.genderPreference} preferred)
            </div>

            {loadingCaregivers ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                Loading agency caregiver roster...
              </div>
            ) : availableCaregivers.length === 0 ? (
              <div
                style={{
                  padding: '1.5rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '8px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                }}
              >
                No active caregivers found in this agency. Please add caregivers first.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '300px', overflowY: 'auto' }}>
                {availableCaregivers.map((cg) => {
                  const isSelected = selectedCaregiverId === cg.id;
                  return (
                    <div
                      key={cg.id}
                      onClick={() => setSelectedCaregiverId(cg.id)}
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        border: isSelected
                          ? '1px solid #14b8a6'
                          : '1px solid rgba(255, 255, 255, 0.08)',
                        backgroundColor: isSelected
                          ? 'rgba(20, 184, 166, 0.15)'
                          : 'rgba(255, 255, 255, 0.02)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.95rem' }}>
                          {cg.fullName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {cg.gender || 'caregiver'} • {cg.district || 'Kerala'} • {cg.experienceYears || '2+'} yrs exp • ★ {cg.averageRating ? Number(cg.averageRating).toFixed(1) : 'New'} ({cg.jobsCompleted || 0} jobs)
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#34d399' }}>
                          ₹{cg.dailyRate || 950}/day
                        </div>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            color: cg.status === 'available' ? '#34d399' : '#fbbf24',
                            textTransform: 'capitalize',
                          }}
                        >
                          {cg.status || 'available'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Replacement Reason & Handover Fields if Caregiver already assigned */}
            {customer.assignedCaregiverId && (
              <div
                style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  backgroundColor: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  borderRadius: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fbbf24' }}>
                  Replacement Context (History Tracking)
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      marginBottom: '4px',
                    }}
                  >
                    Effective Replacement Date
                  </label>
                  <input
                    type="date"
                    id="input-replacement-date"
                    value={replacementDate}
                    onChange={(e) => setReplacementDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.45rem',
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="select-replacement-reason"
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      marginBottom: '4px',
                    }}
                  >
                    Absence / Replacement Reason
                  </label>
                  <select
                    id="select-replacement-reason"
                    value={replacementReason}
                    onChange={(e) => setReplacementReason(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.45rem',
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                    }}
                  >
                    <option value="leave">Medical / Sick Leave / Family Leave</option>
                    <option value="quit">Caregiver Resigned / Quit</option>
                    <option value="complaint">Family / Customer Request or Complaint</option>
                    <option value="emergency">Emergency Backup Coverage</option>
                    <option value="rotation">Planned Rotation / Schedule Shift</option>
                    <option value="other">Other Administrative Reassignment</option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      marginBottom: '4px',
                    }}
                  >
                    Handover Notes (Optional)
                  </label>
                  <input
                    type="text"
                    id="input-replacement-notes"
                    value={replacementNotes}
                    onChange={(e) => setReplacementNotes(e.target.value)}
                    placeholder="e.g. Needs coverage until Friday / Bed mobility briefing completed"
                    style={{
                      width: '100%',
                      padding: '0.45rem',
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                onClick={() => setShowAssignModal(false)}
                style={{
                  flex: 1,
                  padding: '0.65rem',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                id="btn-confirm-assign-caregiver"
                disabled={!selectedCaregiverId || isSubmittingAssignment}
                onClick={handleConfirmAssignment}
                style={{
                  flex: 1.5,
                  padding: '0.65rem',
                  borderRadius: '8px',
                  backgroundColor: '#14b8a6',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 600,
                  cursor: !selectedCaregiverId || isSubmittingAssignment ? 'not-allowed' : 'pointer',
                  opacity: !selectedCaregiverId || isSubmittingAssignment ? 0.6 : 1,
                }}
              >
                {isSubmittingAssignment
                  ? 'Assigning...'
                  : customer.assignedCaregiverId
                  ? 'Confirm Replacement'
                  : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Absence / Start Replacement SLA Modal */}
      {showSlaModal && (
        <div
          id="modal-report-absence-sla"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: '14px',
              padding: '1.75rem',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}
            >
              <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.15rem' }}>
                ⚠️ Report Absence & Start SLA Timer
              </h3>
              <button
                onClick={() => setShowSlaModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Record caregiver unavailability and activate the SLA window. If unresolved before expiry,
              the platform escalates directly to the Agency Owner via WhatsApp and Web Push.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label
                  htmlFor="select-absence-reason"
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    marginBottom: '4px',
                  }}
                >
                  Absence Reason
                </label>
                <select
                  id="select-absence-reason"
                  value={absenceReasonInput}
                  onChange={(e) => setAbsenceReasonInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                  }}
                >
                  <option value="leave">Medical / Sick Leave / Family Leave</option>
                  <option value="quit">Caregiver Resigned / Left Post</option>
                  <option value="complaint">Customer Complaint / Reassignment Request</option>
                  <option value="emergency">Family Emergency / Urgent Unavailability</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="select-sla-window"
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    marginBottom: '4px',
                  }}
                >
                  SLA Window (Minutes)
                </label>
                <select
                  id="select-sla-window"
                  value={slaMinutesInput}
                  onChange={(e) => setSlaMinutesInput(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                  }}
                >
                  <option value={60}>60 Minutes (Urgent 1-Hour SLA)</option>
                  <option value={120}>120 Minutes (Standard 2-Hour SLA)</option>
                  <option value={240}>240 Minutes (Extended 4-Hour SLA)</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="input-absence-notes"
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    marginBottom: '4px',
                  }}
                >
                  Absence Notes
                </label>
                <textarea
                  id="input-absence-notes"
                  value={absenceNotesInput}
                  onChange={(e) => setAbsenceNotesInput(e.target.value)}
                  placeholder="e.g. Caregiver called in with fever, patient needs 24hr bedridden assistance"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    resize: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowSlaModal(false)}
                  style={{
                    flex: 1,
                    padding: '0.65rem',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-report-absence"
                  disabled={isRequestingReplacement}
                  onClick={handleRequestReplacementSla}
                  style={{
                    flex: 1.5,
                    padding: '0.65rem',
                    borderRadius: '8px',
                    backgroundColor: '#f59e0b',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: isRequestingReplacement ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isRequestingReplacement ? 'Activating SLA...' : 'Activate SLA Timer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
