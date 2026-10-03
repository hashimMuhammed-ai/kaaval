'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '../../../utils/api';

import { KERALA_DISTRICTS } from '../../../constants/kerala';
import { AVAILABLE_SKILLS } from '../../../constants/skills';
import { CaregiverStatusBadge } from '../../../components/caregiver-status-badge';
import { CaregiverStatusType } from '../../../constants/caregiver-status';

const COMMON_SKILLS = AVAILABLE_SKILLS;
const RADIUS_OPTIONS = [5, 10, 15, 25, 50, 100];

interface ScoreBreakdown {
  distanceScore: number;
  skillsScore: number;
  experienceScore: number;
  genderScore: number;
}

interface MatchedCaregiver {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  gender: string;
  district?: string;
  city?: string;
  address?: string;
  pincode?: string;
  skills: string[];
  experienceYears: number;
  status: string;
  dailyRate: number;
  languages: string[];
  latitude?: number;
  longitude?: number;
  profileSummary?: string;
  averageRating?: number;
  totalRatings?: number;
  jobsCompleted?: number;
}

interface MatchResultItem {
  caregiver: MatchedCaregiver;
  distanceKm: number | null;
  matchScore: number;
  scoreBreakdown: ScoreBreakdown;
  matchingSkills: string[];
  isAvailable: boolean;
}

interface MatchEngineResponse {
  targetLocation: {
    latitude: number | null;
    longitude: number | null;
    source: string;
    displayName?: string;
  };
  searchCriteria: {
    radiusKm: number;
    gender: string;
    minExperienceYears: number;
    requiredSkills: string[];
    statusFilter?: string;
  };
  totalMatches: number;
  matches: MatchResultItem[];
}

interface OpenRequestItem {
  id: string;
  referenceId?: string;
  patientName: string;
  patientAge?: number;
  patientGender?: string;
  serviceType?: string;
  district?: string;
  locality?: string;
  status: string;
  genderPreference?: string;
  startDate?: string;
  bystanderPhone?: string;
}

interface PatientItem {
  id: string;
  referenceId?: string;
  patientName: string;
  patientAge?: number;
  patientGender?: string;
  serviceType?: string;
  district?: string;
  locality?: string;
  status: string;
  assignedCaregiverId?: string | null;
  assignedCaregiver?: { fullName: string } | null;
  assignments?: any[];
}

function MatchingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const requestId = searchParams.get('requestId') || undefined;
  const customerId = searchParams.get('customerId') || undefined;
  const assignmentId = searchParams.get('assignmentId') || undefined;

  // Filter States
  const [district, setDistrict] = useState('Ernakulam');
  const [city, setCity] = useState('');
  const [radiusKm, setRadiusKm] = useState(25);
  const [gender, setGender] = useState('any');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [minExp, setMinExp] = useState(0);
  const [includeAllStatuses, setIncludeAllStatuses] = useState(false);
  const [sortBy, setSortBy] = useState<'distance' | 'score' | 'experience' | 'dailyRate'>('score');

  // Scoped Entity State
  const [scopedEntity, setScopedEntity] = useState<any>(null);
  const isScoped = !!(assignmentId || requestId || customerId || scopedEntity);

  // UI States
  const [data, setData] = useState<MatchEngineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Modals
  const [selectedCaregiverModal, setSelectedCaregiverModal] = useState<MatchedCaregiver | null>(null);
  const [assignModalCaregiver, setAssignModalCaregiver] = useState<MatchedCaregiver | null>(null);
  const [assignModalTab, setAssignModalTab] = useState<'patients' | 'requests'>('patients');
  const [openRequests, setOpenRequests] = useState<OpenRequestItem[]>([]);
  const [patientsList, setPatientsList] = useState<PatientItem[]>([]);
  const [loadingModalData, setLoadingModalData] = useState(false);
  const [requestSearchQuery, setRequestSearchQuery] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Count active non-default filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (district !== 'Ernakulam') count++;
    if (city.trim()) count++;
    if (radiusKm !== 25) count++;
    if (gender !== 'any') count++;
    if (minExp > 0) count++;
    if (selectedSkills.length > 0) count += selectedSkills.length;
    if (includeAllStatuses) count++;
    if (sortBy !== 'score') count++;
    return count;
  }, [district, city, radiusKm, gender, minExp, selectedSkills, includeAllStatuses, sortBy]);

  const resetFilters = () => {
    setDistrict('Ernakulam');
    setCity('');
    setRadiusKm(25);
    setGender('any');
    setMinExp(0);
    setSelectedSkills([]);
    setIncludeAllStatuses(false);
    setSortBy('score');
  };

  // 1. Fetch Request / Customer / Assignment Details if scoped
  useEffect(() => {
    const fetchScopedContext = async () => {
      if (assignmentId) {
        try {
          const res = await apiFetch(`/assignments/${assignmentId}`);
          if (res?.data) {
            setScopedEntity(res.data);
            const cust = res.data.customer;
            if (cust) {
              if (cust.district) setDistrict(cust.district);
              if (cust.locality) setCity(cust.locality);
              if (cust.genderPreference) setGender(cust.genderPreference);
              if (cust.serviceType) setSelectedSkills([cust.serviceType]);
            }
          }
        } catch {
          // Continue
        }
      } else if (requestId) {
        try {
          const res = await apiFetch(`/requests/${requestId}`);
          if (res?.data) {
            setScopedEntity(res.data);
            if (res.data.district) setDistrict(res.data.district);
            if (res.data.locality) setCity(res.data.locality);
            if (res.data.genderPreference) setGender(res.data.genderPreference);
            if (res.data.serviceType) setSelectedSkills([res.data.serviceType]);
          }
        } catch {
          // Continue
        }
      } else if (customerId) {
        try {
          const res = await apiFetch(`/customers/${customerId}`);
          if (res?.data) {
            setScopedEntity(res.data);
            if (res.data.district) setDistrict(res.data.district);
            if (res.data.locality) setCity(res.data.locality);
            if (res.data.genderPreference) setGender(res.data.genderPreference);
            if (res.data.serviceType) setSelectedSkills([res.data.serviceType]);
          }
        } catch {
          // Continue
        }
      }
    };

    fetchScopedContext();
  }, [requestId, customerId, assignmentId]);

  // 2. Perform Smart Matching Query
  const executeMatching = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (district && district !== 'All Districts') params.set('district', district);
      if (city.trim()) params.set('city', city.trim());
      params.set('radiusKm', radiusKm.toString());
      if (gender && gender !== 'any') params.set('gender', gender);
      if (minExp > 0) params.set('minExperienceYears', minExp.toString());
      if (selectedSkills.length > 0) params.set('skills', selectedSkills.join(','));
      if (includeAllStatuses) params.set('includeAllStatuses', 'true');
      params.set('sortBy', sortBy);

      if (assignmentId) {
        params.set('assignmentId', assignmentId);
      } else if (requestId) {
        params.set('requestId', requestId);
      } else if (customerId) {
        params.set('customerId', customerId);
      }

      const res = await apiFetch<MatchEngineResponse>(`/matching?${params.toString()}`);
      setData(res);
    } catch (err: any) {
      showToast(`Matching query failed: ${err?.message || 'Error executing search'}`);
    } finally {
      setLoading(false);
    }
  }, [district, city, radiusKm, gender, minExp, selectedSkills, includeAllStatuses, sortBy, requestId, customerId, assignmentId]);

  useEffect(() => {
    executeMatching();
  }, [executeMatching]);

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  // Fetch open requests and registered patients when unscoped Assign modal is opened
  const fetchModalData = async () => {
    setLoadingModalData(true);
    try {
      const [reqRes, custRes] = await Promise.allSettled([
        apiFetch('/requests'),
        apiFetch('/customers'),
      ]);
      if (reqRes.status === 'fulfilled' && reqRes.value?.data && Array.isArray(reqRes.value.data)) {
        const active = reqRes.value.data.filter((r: any) =>
          !['completed', 'cancelled'].includes(r.status?.toLowerCase())
        );
        setOpenRequests(active);
      }
      if (custRes.status === 'fulfilled' && custRes.value?.data && Array.isArray(custRes.value.data)) {
        setPatientsList(custRes.value.data);
      }
    } catch {
      // Fallback
    } finally {
      setLoadingModalData(false);
    }
  };

  // Assign Caregiver Handler
  const handleAssignCaregiver = async (caregiver: MatchedCaregiver) => {
    if (assignmentId) {
      const currentCgName = scopedEntity?.caregiver?.fullName || 'Current Caregiver';
      const patientName =
        scopedEntity?.customer?.patientName || scopedEntity?.patientName || 'Customer';
      if (
        !confirm(
          `Assign ${caregiver.fullName} as replacement for ${currentCgName} serving ${patientName}?`
        )
      )
        return;
      setAssigningId(caregiver.id);
      try {
        const today = new Date().toISOString().split('T')[0];
        const absenceReasonVal = scopedEntity?.absenceReason || 'leave';
        const absenceNotesVal = scopedEntity?.absenceNotes || '';
        await apiFetch(`/assignments/${assignmentId}/replace`, {
          method: 'POST',
          body: JSON.stringify({
            replacementCaregiverId: caregiver.id,
            startDate: today,
            replacementReason: scopedEntity?.absenceReason
              ? `${scopedEntity.absenceReason}${scopedEntity.absenceNotes ? `: ${scopedEntity.absenceNotes}` : ''}`
              : 'Replaced via Smart Matching',
            absenceReason: absenceReasonVal,
            absenceNotes: absenceNotesVal,
          }),
        });
        showToast(`Replacement caregiver ${caregiver.fullName} assigned!`);
        const targetCustId = scopedEntity?.customerId || scopedEntity?.customer?.id || customerId;
        setTimeout(
          () =>
            router.push(
              targetCustId ? `/dashboard/customers/${targetCustId}` : '/dashboard/customers'
            ),
          1000
        );
      } catch (err: any) {
        showToast(`Replacement failed: ${err.message}`);
      } finally {
        setAssigningId(null);
      }
    } else if (requestId) {
      const patientName = scopedEntity?.patientName || `Request #${scopedEntity?.referenceId || requestId}`;
      if (!confirm(`Assign ${caregiver.fullName} to Request #${scopedEntity?.referenceId || requestId}?`)) return;
      setAssigningId(caregiver.id);
      try {
        const today = new Date().toISOString().split('T')[0];

        // 1. Update request status to assigned
        await apiFetch(`/requests/${requestId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({
            assignedCaregiverId: caregiver.id,
            status: 'assigned',
          }),
        });

        // 2. Ensure Customer and Assignment exist so attendance, portal & CRM history are synchronized
        let targetCustomerId = scopedEntity?.customerId || scopedEntity?.customer?.id;
        if (!targetCustomerId) {
          try {
            const conv = await apiFetch(`/customers/from-request/${requestId}`, {
              method: 'POST',
              body: JSON.stringify({
                assignedCaregiverId: caregiver.id,
                status: 'active',
              }),
            });
            targetCustomerId = conv?.data?.id;
          } catch {
            // Already converted or fallback
          }
        }

        if (targetCustomerId) {
          try {
            await apiFetch('/assignments', {
              method: 'POST',
              body: JSON.stringify({
                customerId: targetCustomerId,
                caregiverId: caregiver.id,
                startDate: today,
                caregiverDailyRate: caregiver.dailyRate || 0,
                notes: `Assigned from Intake Request #${scopedEntity?.referenceId || requestId}`,
              }),
            });
          } catch {
            // Assignment already created
          }
        }

        showToast(`Caregiver ${caregiver.fullName} assigned to ${patientName}!`);
        setTimeout(() => router.push('/dashboard/requests'), 1000);
      } catch (err: any) {
        showToast(`Assignment failed: ${err.message}`);
      } finally {
        setAssigningId(null);
      }
    } else if (customerId) {
      const patientName = scopedEntity?.patientName || 'Patient';
      if (!confirm(`Assign ${caregiver.fullName} to Patient ${patientName}?`)) return;
      setAssigningId(caregiver.id);
      try {
        const today = new Date().toISOString().split('T')[0];

        // Check if customer already has an active assignment
        let activeAssignment = scopedEntity?.assignments?.find(
          (a: any) => a.status === 'active'
        );

        if (!activeAssignment && scopedEntity?.assignedCaregiverId) {
          try {
            const histRes = await apiFetch(`/assignments/customer/${customerId}/history`);
            if (Array.isArray(histRes?.data)) {
              activeAssignment = histRes.data.find((a: any) => a.status === 'active');
            }
          } catch {
            // Fallback
          }
        }

        if (activeAssignment?.id && scopedEntity?.assignedCaregiverId) {
          // Preserve assignment history chain via replace endpoint
          await apiFetch(`/assignments/${activeAssignment.id}/replace`, {
            method: 'POST',
            body: JSON.stringify({
              replacementCaregiverId: caregiver.id,
              startDate: today,
              replacementReason: 'Replaced via Smart Matching',
              absenceReason: 'rotation',
              absenceNotes: 'Replaced from Caregiver Matching page',
            }),
          });
        } else {
          // Create new active assignment linking customer and caregiver
          await apiFetch('/assignments', {
            method: 'POST',
            body: JSON.stringify({
              customerId,
              caregiverId: caregiver.id,
              startDate: today,
              caregiverDailyRate: caregiver.dailyRate || 0,
              notes: 'Assigned via Smart Matching',
            }),
          });
        }

        // Also ensure customer profile is set to active with assignedCaregiverId
        await apiFetch(`/customers/${customerId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            assignedCaregiverId: caregiver.id,
            status: 'active',
          }),
        });

        showToast(`Caregiver ${caregiver.fullName} assigned to Patient ${patientName}!`);
        setTimeout(() => router.push(`/dashboard/customers/${customerId}`), 1000);
      } catch (err: any) {
        showToast(`Assignment failed: ${err.message}`);
      } finally {
        setAssigningId(null);
      }
    } else {
      // Unscoped browsing: open the picker modal!
      setAssignModalCaregiver(caregiver);
      fetchModalData();
    }
  };

  // Assign to selected patient from modal
  const handleAssignToPatient = async (patient: PatientItem) => {
    if (!assignModalCaregiver) return;
    setAssigningId(patient.id);
    try {
      const today = new Date().toISOString().split('T')[0];

      let activeAssignment = patient.assignments?.find((a: any) => a.status === 'active');
      if (!activeAssignment && patient.assignedCaregiverId) {
        try {
          const histRes = await apiFetch(`/assignments/customer/${patient.id}/history`);
          if (Array.isArray(histRes?.data)) {
            activeAssignment = histRes.data.find((a: any) => a.status === 'active');
          }
        } catch {
          // Fallback
        }
      }

      if (activeAssignment?.id && patient.assignedCaregiverId) {
        await apiFetch(`/assignments/${activeAssignment.id}/replace`, {
          method: 'POST',
          body: JSON.stringify({
            replacementCaregiverId: assignModalCaregiver.id,
            startDate: today,
            replacementReason: 'Replaced via Smart Matching',
            absenceReason: 'rotation',
            absenceNotes: 'Replaced from Caregiver Matching page modal',
          }),
        });
      } else {
        await apiFetch('/assignments', {
          method: 'POST',
          body: JSON.stringify({
            customerId: patient.id,
            caregiverId: assignModalCaregiver.id,
            startDate: today,
            caregiverDailyRate: assignModalCaregiver.dailyRate || 0,
            notes: 'Assigned via Smart Matching modal',
          }),
        });
      }

      await apiFetch(`/customers/${patient.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          assignedCaregiverId: assignModalCaregiver.id,
          status: 'active',
        }),
      });

      showToast(`Assigned ${assignModalCaregiver.fullName} to Patient ${patient.patientName}!`);
      setAssignModalCaregiver(null);
      executeMatching();
    } catch (err: any) {
      showToast(`Failed to assign: ${err?.message || 'Error occurred'}`);
    } finally {
      setAssigningId(null);
    }
  };

  // Assign to selected open request from modal
  const handleAssignToOpenRequest = async (req: OpenRequestItem) => {
    if (!assignModalCaregiver) return;
    setAssigningId(req.id);
    try {
      const today = new Date().toISOString().split('T')[0];

      await apiFetch(`/requests/${req.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          assignedCaregiverId: assignModalCaregiver.id,
          status: 'assigned',
        }),
      });

      // Synchronize CRM Customer & Assignment row
      try {
        const conv = await apiFetch(`/customers/from-request/${req.id}`, {
          method: 'POST',
          body: JSON.stringify({
            assignedCaregiverId: assignModalCaregiver.id,
            status: 'active',
          }),
        });
        if (conv?.data?.id) {
          await apiFetch('/assignments', {
            method: 'POST',
            body: JSON.stringify({
              customerId: conv.data.id,
              caregiverId: assignModalCaregiver.id,
              startDate: today,
              caregiverDailyRate: assignModalCaregiver.dailyRate || 0,
              notes: `Assigned from Intake Request #${req.referenceId || req.id}`,
            }),
          });
        }
      } catch {
        // Fallback
      }

      showToast(`Assigned ${assignModalCaregiver.fullName} to Request #${req.referenceId || req.patientName}!`);
      setAssignModalCaregiver(null);
      executeMatching();
    } catch (err: any) {
      showToast(`Failed to assign: ${err?.message || 'Error occurred'}`);
    } finally {
      setAssigningId(null);
    }
  };

  // Reusable Filter Controls for both Desktop Sidebar and Mobile Sheet (Light Theme)
  const renderFilterControls = (isMobileSheet = false) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header inside Mobile Sheet */}
      {isMobileSheet && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Matching Filters
            </h3>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              {activeFilterCount > 0 ? `${activeFilterCount} active filters` : 'Default criteria'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0d9488',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Reset All
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsMobileFiltersOpen(false)}
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#64748b',
                fontSize: '1rem',
                cursor: 'pointer',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* District Selection */}
      <div>
        <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.35rem', fontWeight: 600, color: '#334155' }}>
          Kerala District
        </label>
        <select
          id={isMobileSheet ? 'mobile-filter-district' : 'filter-district'}
          className="form-input"
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          style={{ fontSize: '0.85rem', minHeight: '44px', backgroundColor: '#ffffff', color: '#0f172a', borderColor: '#cbd5e1' }}
        >
          {KERALA_DISTRICTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* City / Locality Input */}
      <div>
        <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.35rem', fontWeight: 600, color: '#334155' }}>
          City / Locality (Optional)
        </label>
        <input
          id={isMobileSheet ? 'mobile-filter-city' : 'filter-city'}
          type="text"
          className="form-input"
          placeholder="e.g. Kakkanad, Aluva, Calicut"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          style={{ fontSize: '0.85rem', minHeight: '44px', backgroundColor: '#ffffff', color: '#0f172a', borderColor: '#cbd5e1' }}
        />
      </div>

      {/* Distance Radius */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
          <label className="form-label" style={{ fontSize: '0.8rem', margin: 0, fontWeight: 600, color: '#334155' }}>
            Search Distance
          </label>
          <span style={{ fontSize: '0.85rem', color: '#0d9488', fontWeight: 700 }}>
            Within {radiusKm} km
          </span>
        </div>

        <div style={{ margin: '0.5rem 0 0.65rem 0' }}>
          <input
            id={isMobileSheet ? 'mobile-filter-radius-slider' : 'filter-radius-slider'}
            type="range"
            min="5"
            max="100"
            step="5"
            value={radiusKm}
            onChange={(e) => setRadiusKm(parseInt(e.target.value, 10))}
            className="touch-range-slider"
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem' }}>
            <span>5 km</span>
            <span>25 km</span>
            <span>50 km</span>
            <span>100 km</span>
          </div>
        </div>

        {/* Preset Radius Pills */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', marginTop: '0.4rem' }}>
          {RADIUS_OPTIONS.map((r) => {
            const isSelected = radiusKm === r;
            return (
              <button
                key={r}
                type="button"
                id={`${isMobileSheet ? 'mobile-' : ''}btn-radius-${r}`}
                onClick={() => setRadiusKm(r)}
                style={{
                  padding: '0.45rem 0.25rem',
                  minHeight: '40px',
                  fontSize: '0.8rem',
                  fontWeight: isSelected ? 700 : 500,
                  borderRadius: 'var(--radius-md)',
                  border: isSelected ? '1px solid #0d9488' : '1px solid #cbd5e1',
                  backgroundColor: isSelected ? 'rgba(13, 148, 136, 0.12)' : '#ffffff',
                  color: isSelected ? '#0f766e' : '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                }}
              >
                {r} km
              </button>
            );
          })}
        </div>
      </div>

      {/* Gender Preference */}
      <div>
        <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.35rem', fontWeight: 600, color: '#334155' }}>
          Caregiver Gender
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
          {[
            { key: 'any', label: 'Any' },
            { key: 'female', label: 'Female' },
            { key: 'male', label: 'Male' },
          ].map((g) => {
            const isSelected = gender.toLowerCase() === g.key;
            return (
              <button
                key={g.key}
                type="button"
                id={`${isMobileSheet ? 'mobile-' : ''}filter-gender-${g.key}`}
                onClick={() => setGender(g.key)}
                style={{
                  padding: '0.45rem 0.25rem',
                  minHeight: '42px',
                  fontSize: '0.8rem',
                  fontWeight: isSelected ? 700 : 500,
                  borderRadius: 'var(--radius-md)',
                  border: isSelected ? '1px solid #0d9488' : '1px solid #cbd5e1',
                  backgroundColor: isSelected ? 'rgba(13, 148, 136, 0.12)' : '#ffffff',
                  color: isSelected ? '#0f766e' : '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                }}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Minimum Experience */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
          <label className="form-label" style={{ fontSize: '0.8rem', margin: 0, fontWeight: 600, color: '#334155' }}>
            Minimum Experience
          </label>
          <span style={{ fontSize: '0.8rem', color: '#0d9488', fontWeight: 700 }}>
            {minExp === 0 ? 'Any Experience' : `${minExp}+ Years`}
          </span>
        </div>
        <input
          id={isMobileSheet ? 'mobile-filter-min-exp' : 'filter-min-exp'}
          type="range"
          min="0"
          max="10"
          step="1"
          value={minExp}
          onChange={(e) => setMinExp(parseInt(e.target.value, 10))}
          style={{ width: '100%', accentColor: '#0d9488', cursor: 'pointer', height: '24px' }}
        />
      </div>

      {/* Required Skills Chips */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
          <label className="form-label" style={{ fontSize: '0.8rem', margin: 0, fontWeight: 600, color: '#334155' }}>
            Care Skills & Services
          </label>
          {selectedSkills.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedSkills([])}
              style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.72rem', cursor: 'pointer' }}
            >
              Clear Skills
            </button>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '2px' }}>
          {COMMON_SKILLS.map((skill) => {
            const isSelected = selectedSkills.includes(skill);
            return (
              <button
                key={skill}
                type="button"
                onClick={() => toggleSkill(skill)}
                style={{
                  padding: '0.35rem 0.65rem',
                  minHeight: '34px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: isSelected ? 700 : 500,
                  backgroundColor: isSelected ? 'rgba(13, 148, 136, 0.12)' : '#f8fafc',
                  color: isSelected ? '#0f766e' : '#475569',
                  border: isSelected ? '1px solid #0d9488' : '1px solid #cbd5e1',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                {isSelected ? '✓ ' : ''}{skill}
              </button>
            );
          })}
        </div>
      </div>

      {/* Availability Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0', borderTop: '1px solid #e2e8f0' }}>
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a' }}>Include Assigned / On Leave</div>
          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Show all staff for replacement planning</div>
        </div>
        <input
          id={isMobileSheet ? 'mobile-filter-include-all' : 'filter-include-all-statuses'}
          type="checkbox"
          checked={includeAllStatuses}
          onChange={(e) => setIncludeAllStatuses(e.target.checked)}
          style={{ width: '22px', height: '22px', accentColor: '#0d9488', cursor: 'pointer' }}
        />
      </div>

      {/* Sort By Dropdown */}
      <div>
        <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.35rem', fontWeight: 600, color: '#334155' }}>
          Sort Results By
        </label>
        <select
          id={isMobileSheet ? 'mobile-filter-sort-by' : 'filter-sort-by'}
          className="form-input"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          style={{ fontSize: '0.85rem', minHeight: '44px', backgroundColor: '#ffffff', color: '#0f172a', borderColor: '#cbd5e1' }}
        >
          <option value="score">Best Match Score</option>
          <option value="distance">Proximity (Closest First)</option>
          <option value="experience">Experience (Highest First)</option>
          <option value="dailyRate">Daily Rate (Lowest First)</option>
        </select>
      </div>

      {/* Sheet Done Button */}
      {isMobileSheet && (
        <button
          type="button"
          onClick={() => setIsMobileFiltersOpen(false)}
          className="btn-primary"
          style={{
            width: '100%',
            justifyContent: 'center',
            padding: '0.85rem',
            fontWeight: 700,
            fontSize: '0.95rem',
            minHeight: '48px',
            marginTop: '0.5rem',
          }}
        >
          Show {data?.totalMatches || 0} Caregivers
        </button>
      )}
    </div>
  );

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          id="matching-toast"
          style={{
            position: 'fixed',
            bottom: '5rem',
            right: '1.5rem',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid #0d9488',
            color: '#ffffff',
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
            zIndex: 120,
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          <span style={{ color: '#2dd4bf', fontSize: '1.1rem' }}>✓</span>
          {toastMessage}
        </div>
      )}

      {/* Header Area */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            width: '100%',
            minWidth: 0,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className="badge badge-teal">Smart Dispatch</span>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Proximity & Competency Matching
              </span>
            </div>
            <h1
              style={{
                fontSize: 'clamp(1.35rem, 3.5vw, 1.85rem)',
                fontWeight: 800,
                color: '#0f172a',
                letterSpacing: '-0.02em',
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Caregiver Matching
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }} className="desktop-only">
              Find available caregivers nearby filtered by distance, skills, and availability.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexShrink: 0 }}>
            <button
              onClick={() => executeMatching()}
              className="btn-secondary"
              id="btn-refresh-matching"
              title="Refresh Caregiver Matches"
              style={{
                padding: '0.45rem 0.75rem',
                fontSize: '0.8rem',
                minHeight: '38px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: '#ffffff',
                borderColor: '#cbd5e1',
                color: '#0f172a',
                whiteSpace: 'nowrap',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Scoped Context Banner (if coming from a Request, Customer, or Replacement) */}
        {(assignmentId || requestId || customerId) && (
          <div
            id="scoped-context-banner"
            style={{
              marginTop: '1rem',
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: assignmentId ? '#fffbeb' : '#f0fdfa',
              border: assignmentId ? '1px solid #fde68a' : '1px solid #ccfbf1',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: assignmentId ? 'rgba(245, 158, 11, 0.2)' : 'rgba(13, 148, 136, 0.15)',
                  color: assignmentId ? '#d97706' : '#0d9488',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem',
                  flexShrink: 0,
                }}
              >
                {assignmentId ? '🔄' : '👤'}
              </div>
              <div>
                <div
                  style={{
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: assignmentId ? '#b45309' : '#0f766e',
                    fontWeight: 700,
                  }}
                >
                  {assignmentId
                    ? 'Replacement Mode: Finding Replacement Caregiver'
                    : requestId
                    ? 'Scoped To Intake Request'
                    : 'Scoped To Customer Profile'}
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                  {scopedEntity?.customer?.patientName ||
                    scopedEntity?.patientName ||
                    'Patient'}
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400, marginLeft: '0.4rem' }}>
                    ({scopedEntity?.referenceId || assignmentId || requestId || customerId})
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                  {assignmentId && scopedEntity?.caregiver ? (
                    <span style={{ color: '#b45309', marginRight: '0.4rem', fontWeight: 600 }}>
                      Replacing: {scopedEntity.caregiver.fullName} •
                    </span>
                  ) : null}
                  📍 {scopedEntity?.customer?.locality || scopedEntity?.locality || 'Kerala'} • Service: <strong>{scopedEntity?.customer?.serviceType || scopedEntity?.serviceType || 'General Care'}</strong>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Link
                href={
                  assignmentId
                    ? `/dashboard/customers/${
                        scopedEntity?.customerId || scopedEntity?.customer?.id || customerId || ''
                      }`
                    : requestId
                    ? `/dashboard/requests`
                    : `/dashboard/customers/${customerId}`
                }
                className="btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.4rem 0.65rem', minHeight: '34px', backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a' }}
              >
                Back
              </Link>
              <Link
                href="/dashboard/matching"
                className="btn-secondary"
                id="btn-clear-scope"
                style={{ fontSize: '0.75rem', padding: '0.4rem 0.65rem', minHeight: '34px', color: '#64748b', backgroundColor: '#ffffff', borderColor: '#cbd5e1' }}
              >
                ✕ Clear
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* MOBILE QUICK FILTER BAR (Light Theme, matches Requests & Caregivers) */}
      <div className="show-on-mobile" style={{ flexDirection: 'column', gap: '0.65rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
          {/* Quick District Select */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <select
              id="mobile-quick-district"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              style={{
                padding: '0.45rem 1.6rem 0.45rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#0f172a',
                fontSize: '0.8rem',
                fontWeight: 600,
                appearance: 'none',
                WebkitAppearance: 'none',
                cursor: 'pointer',
                minHeight: '38px',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
              }}
            >
              {KERALA_DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  📍 {d}
                </option>
              ))}
            </select>
            <span style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '0.65rem', color: '#64748b' }}>
              ▼
            </span>
          </div>

          {/* Quick Radius Select */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <select
              id="mobile-quick-radius"
              value={radiusKm}
              onChange={(e) => setRadiusKm(parseInt(e.target.value, 10))}
              style={{
                padding: '0.45rem 1.6rem 0.45rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#0f172a',
                fontSize: '0.8rem',
                fontWeight: 500,
                appearance: 'none',
                WebkitAppearance: 'none',
                cursor: 'pointer',
                minHeight: '38px',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
              }}
            >
              {RADIUS_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r} km radius
                </option>
              ))}
            </select>
            <span style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '0.65rem', color: '#64748b' }}>
              ▼
            </span>
          </div>

          {/* Full Filters Button with Active Count Badge */}
          <button
            type="button"
            id="btn-open-mobile-filters"
            onClick={() => setIsMobileFiltersOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: activeFilterCount > 0 ? 'rgba(13, 148, 136, 0.12)' : '#ffffff',
              border: activeFilterCount > 0 ? '1px solid #0d9488' : '1px solid #cbd5e1',
              color: activeFilterCount > 0 ? '#0f766e' : '#0f172a',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              minHeight: '38px',
              flexShrink: 0,
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
            }}
          >
            <span>⚙️ Filters</span>
            {activeFilterCount > 0 && (
              <span
                style={{
                  backgroundColor: '#0d9488',
                  color: '#ffffff',
                  borderRadius: '9999px',
                  padding: '0.1rem 0.45rem',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                }}
              >
                {activeFilterCount}
              </span>
            )}
          </button>

          {activeFilterCount > 0 && (
            <button
              type="button"
              id="btn-mobile-reset-filters"
              onClick={resetFilters}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: '0.75rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                textDecoration: 'underline',
                flexShrink: 0,
                padding: '0 0.35rem',
              }}
            >
              Reset
            </button>
          )}
        </div>

        {/* Mobile Matches Count Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#64748b', padding: '0 0.2rem' }}>
          <span>
            Nearby <strong style={{ color: '#0f172a' }}>{city ? `${city}, ` : ''}{district}</strong>
          </span>
          <span style={{ fontWeight: 700, color: '#0d9488' }}>
            {data?.totalMatches || 0} caregivers available
          </span>
        </div>
      </div>

      {/* Main Layout: Desktop Sidebar & Results Section */}
      <div className="matching-layout-grid">
        {/* Desktop Filter Sidebar (Light Theme, hidden on mobile <= 768px via global.css .hide-on-mobile) */}
        <aside
          id="matching-filter-panel"
          className="hide-on-mobile"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 'var(--radius-xl)',
            padding: '1.25rem',
            position: 'sticky',
            top: '85px',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🔍</span> Matching Filters
            </h2>
            {activeFilterCount > 0 && (
              <button
                onClick={resetFilters}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0d9488',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Reset Filters
              </button>
            )}
          </div>

          {renderFilterControls(false)}
        </aside>

        {/* Right Match Results Section */}
        <section id="matching-results-section" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Desktop Summary Banner */}
          <div
            className="desktop-only"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-xl)',
              padding: '0.85rem 1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ fontSize: '1.25rem' }}>📍</span>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                  Nearby {city ? `${city}, ` : ''}{district}, Kerala
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Search radius: {radiusKm} km • {gender !== 'any' ? `Gender: ${gender} • ` : ''}{selectedSkills.length > 0 ? `${selectedSkills.length} skills required` : 'All skills'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Matching Caregivers</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0d9488' }}>
                  {data?.totalMatches || 0} Available
                </div>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div
              id="matching-loading"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3.5rem 1.5rem',
                backgroundColor: '#ffffff',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
                gap: '0.85rem',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  border: '3px solid rgba(13, 148, 136, 0.2)',
                  borderTop: '3px solid #0d9488',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
                Finding best matching caregivers...
              </div>
            </div>
          )}

          {/* Empty Results State */}
          {!loading && data?.matches.length === 0 && (
            <div
              id="matching-empty-state"
              style={{
                padding: '3rem 1.5rem',
                textAlign: 'center',
                backgroundColor: '#ffffff',
                borderRadius: 'var(--radius-xl)',
                border: '1px dashed #cbd5e1',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🗺️</div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                No Caregivers Matched Within {radiusKm} km
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.85rem', maxWidth: '440px', margin: '0 auto 1.25rem auto' }}>
                No staff members currently match your selected radius ({radiusKm} km) and criteria in {district}.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setRadiusKm(50)}
                  className="btn-primary"
                  id="btn-expand-radius"
                  style={{ fontSize: '0.8rem', minHeight: '40px' }}
                >
                  Expand Radius to 50 km
                </button>
                <button
                  onClick={() => setIncludeAllStatuses(true)}
                  className="btn-secondary"
                  id="btn-include-all-status"
                  style={{ fontSize: '0.8rem', minHeight: '40px', backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a' }}
                >
                  Include Assigned Staff
                </button>
              </div>
            </div>
          )}

          {/* Results Match Cards List (Light Theme, identical to CaregiverMobileFeed) */}
          {!loading && data && data.matches.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {data.matches.map((item, idx) => {
                const cg = item.caregiver;
                const isTopMatch = isScoped && idx === 0 && item.matchScore >= 80;

                const distanceColor =
                  item.distanceKm != null && item.distanceKm <= 5
                    ? '#059669'
                    : item.distanceKm != null && item.distanceKm <= 15
                    ? '#0d9488'
                    : '#d97706';

                const initials = cg.fullName
                  ? cg.fullName
                      .trim()
                      .split(/\s+/)
                      .map((n: string) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()
                  : 'CG';

                // Display up to 4 skills, prioritizing matching ones
                const matchingSkillsSet = new Set(item.matchingSkills.map((s) => s.toLowerCase()));
                const sortedSkills = [...(cg.skills || [])].sort((a, b) => {
                  const aMatch = matchingSkillsSet.has(a.toLowerCase());
                  const bMatch = matchingSkillsSet.has(b.toLowerCase());
                  if (aMatch && !bMatch) return -1;
                  if (!aMatch && bMatch) return 1;
                  return 0;
                });
                const displaySkills = sortedSkills.slice(0, 4);
                const extraSkillsCount = Math.max(0, (cg.skills?.length || 0) - displaySkills.length);

                return (
                  <div
                    key={cg.id}
                    id={`match-card-${cg.id}`}
                    style={{
                      backgroundColor: '#ffffff',
                      border: isTopMatch ? '1px solid #5eead4' : '1px solid #e2e8f0',
                      borderRadius: 'var(--radius-xl)',
                      padding: '1.15rem 1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.85rem',
                      boxShadow: isTopMatch
                        ? '0 4px 14px rgba(13, 148, 136, 0.12)'
                        : '0 2px 8px rgba(15, 23, 42, 0.05)',
                      position: 'relative',
                    }}
                  >
                    {/* Top Match Ribbon (Top Left to balance Top Right Match Score) */}
                    {isTopMatch && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '-9px',
                          left: '16px',
                          backgroundColor: '#0d9488',
                          color: '#ffffff',
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          padding: '0.15rem 0.55rem',
                          borderRadius: 'var(--radius-full)',
                          boxShadow: '0 2px 6px rgba(13, 148, 136, 0.35)',
                        }}
                      >
                        ⭐ Top Match
                      </div>
                    )}

                    {/* Card Header Row: Avatar, Name & Top-Right Match Score */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                        {/* Avatar */}
                        <div
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #ccfbf1, #99f6e4)',
                            border: '1px solid #5eead4',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            color: '#0f766e',
                            flexShrink: 0,
                          }}
                        >
                          {initials}
                        </div>

                        {/* Name (Full Width, bold, never squeezed) */}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <h3
                            id={`match-cg-name-${cg.id}`}
                            style={{
                              fontSize: '1.05rem',
                              fontWeight: 700,
                              color: '#0f172a',
                              margin: 0,
                              lineHeight: 1.25,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {cg.fullName}
                          </h3>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            📍 {cg.district || 'Kerala'}{cg.city ? `, ${cg.city}` : ''}
                          </div>
                        </div>
                      </div>

                      {/* Match Score Pill (Only when matching for a patient / isScoped) */}
                      {isScoped && (
                        <div
                          style={{
                            padding: '0.35rem 0.65rem',
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: 'rgba(13, 148, 136, 0.08)',
                            border: '1px solid rgba(13, 148, 136, 0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            flexShrink: 0,
                          }}
                        >
                          <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f766e' }}>
                            {item.matchScore}%
                          </span>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#0d9488' }}>
                            Match
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Metadata Subtitle Row: Status, Gender & Distance (Full Card Width) */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.85rem',
                        fontSize: '0.8rem',
                        color: '#64748b',
                        padding: '0.1rem 0',
                      }}
                    >
                      <CaregiverStatusBadge status={cg.status as CaregiverStatusType} size="sm" />
                      <span style={{ textTransform: 'capitalize' }}>{cg.gender}</span>
                      {isScoped && (
                        <span style={{ fontWeight: 600, color: distanceColor }}>
                          {item.distanceKm != null ? `${item.distanceKm} km from patient` : 'Same District'}
                        </span>
                      )}
                    </div>

                    {/* Key Specs Grid: 4-Box Balanced Row (Zero Wrapping) */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '0.35rem',
                        fontSize: '0.78rem',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.45rem 0.5rem',
                        textAlign: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Exp</div>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{cg.experienceYears || 0} yrs</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Rate</div>
                        <div style={{ fontWeight: 700, color: '#059669' }}>
                          ₹{cg.dailyRate ? cg.dailyRate.toLocaleString() : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Rating</div>
                        <div style={{ fontWeight: 700, color: '#b45309' }}>
                          ★ {cg.averageRating ? Number(cg.averageRating).toFixed(1) : 'New'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Jobs</div>
                        <div style={{ fontWeight: 700, color: '#0f766e' }}>
                          {cg.jobsCompleted || 0}
                        </div>
                      </div>
                    </div>

                    {/* Skills Chips (Subtle, Clean Tags) */}
                    {displaySkills.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
                        {displaySkills.map((skill) => {
                          const isMatch = item.matchingSkills.some(
                            (ms) => ms.toLowerCase() === skill.toLowerCase()
                          );
                          return (
                            <span
                              key={skill}
                              style={{
                                fontSize: '0.72rem',
                                padding: '0.2rem 0.55rem',
                                borderRadius: 'var(--radius-full)',
                                backgroundColor: isMatch ? 'rgba(13, 148, 136, 0.1)' : '#f8fafc',
                                color: isMatch ? '#0f766e' : '#475569',
                                border: isMatch ? '1px solid #99f6e4' : '1px solid #e2e8f0',
                                fontWeight: isMatch ? 600 : 500,
                              }}
                            >
                              {isMatch ? '✓ ' : ''}{skill}
                            </span>
                          );
                        })}
                        {extraSkillsCount > 0 && (
                          <span style={{ fontSize: '0.7rem', color: '#64748b', padding: '0.1rem 0.35rem' }}>
                            +{extraSkillsCount} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Action Buttons: 2-Tier Visual Hierarchy */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        borderTop: '1px solid #e2e8f0',
                        paddingTop: '0.75rem',
                      }}
                    >
                      {/* Secondary Actions: Quick Contacts & Profile */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: '0.45rem',
                        }}
                      >
                        {/* Call Button */}
                        <a
                          href={`tel:${cg.phone}`}
                          id={`mobile-match-call-${cg.id}`}
                          className="btn-secondary"
                          title={`Call ${cg.fullName}`}
                          style={{
                            fontSize: '0.8rem',
                            padding: '0.45rem 0.5rem',
                            minHeight: '38px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.35rem',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: '#ffffff',
                            borderColor: '#cbd5e1',
                            color: '#0f172a',
                            fontWeight: 600,
                          }}
                        >
                          <span>📞</span> <span>Call</span>
                        </a>

                        {/* WhatsApp Button */}
                        <a
                          href={`https://wa.me/${cg.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          id={`mobile-match-wa-${cg.id}`}
                          className="btn-secondary"
                          title={`WhatsApp ${cg.fullName}`}
                          style={{
                            fontSize: '0.8rem',
                            padding: '0.45rem 0.5rem',
                            minHeight: '38px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.35rem',
                            borderRadius: 'var(--radius-md)',
                            color: '#16a34a',
                            borderColor: '#bbf7d0',
                            backgroundColor: '#f0fdf4',
                            fontWeight: 600,
                          }}
                        >
                          <span>💬</span> <span>WhatsApp</span>
                        </a>

                        {/* Profile Button */}
                        <button
                          type="button"
                          onClick={() => setSelectedCaregiverModal(cg)}
                          id={`mobile-match-profile-${cg.id}`}
                          className="btn-secondary"
                          style={{
                            fontSize: '0.8rem',
                            padding: '0.45rem 0.5rem',
                            minHeight: '38px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.35rem',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: '#ffffff',
                            borderColor: '#cbd5e1',
                            color: '#0f172a',
                            fontWeight: 600,
                          }}
                        >
                          <span>👤</span> <span>Profile</span>
                        </button>
                      </div>

                      {/* Primary Assign Action (Full Width, Prominent, Clear Label) */}
                      <button
                        type="button"
                        onClick={() => handleAssignCaregiver(cg)}
                        disabled={assigningId === cg.id}
                        className="btn-primary"
                        id={`btn-assign-${cg.id}`}
                        style={{
                          width: '100%',
                          fontSize: '0.875rem',
                          padding: '0.6rem 1rem',
                          minHeight: '44px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.45rem',
                          fontWeight: 700,
                          backgroundColor: assignmentId ? '#f59e0b' : '#0d9488',
                          borderColor: assignmentId ? '#d97706' : '#0d9488',
                          color: '#ffffff',
                          borderRadius: 'var(--radius-md)',
                          boxShadow: assignmentId
                            ? '0 2px 8px rgba(245, 158, 11, 0.28)'
                            : '0 2px 8px rgba(13, 148, 136, 0.28)',
                          cursor: assigningId === cg.id ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {assigningId === cg.id ? (
                          <span>Assigning...</span>
                        ) : (
                          <>
                            <span style={{ fontSize: '1rem' }}>{assignmentId ? '🔄' : '✓'}</span>
                            <span style={{ letterSpacing: '0.01em' }}>
                              {assignmentId
                                ? 'Assign Replacement'
                                : requestId
                                ? 'Assign to Request'
                                : customerId
                                ? 'Assign to Patient'
                                : 'Assign Caregiver...'}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* MOBILE FILTER BOTTOM SHEET / DRAWER (Light Theme, when isMobileFiltersOpen is true) */}
      {isMobileFiltersOpen && (
        <div
          id="mobile-filters-drawer-overlay"
          className="matching-filter-drawer-overlay animate-fade-in"
          onClick={() => setIsMobileFiltersOpen(false)}
        >
          <div
            className="matching-filter-drawer-content"
            onClick={(e) => e.stopPropagation()}
          >
            {renderFilterControls(true)}
          </div>
        </div>
      )}

      {/* UNSCOPED "ASSIGN CAREGIVER" MODAL (Supports both Patients and Requests) */}
      {assignModalCaregiver && (
        <div
          id="assign-to-request-modal"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 120,
            padding: '1rem',
          }}
          onClick={() => setAssignModalCaregiver(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-xl)',
              maxWidth: '580px',
              width: '100%',
              maxHeight: '88vh',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
              boxShadow: '0 20px 45px rgba(15, 23, 42, 0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#0d9488', fontWeight: 700, textTransform: 'uppercase' }}>
                  Assign Caregiver
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0.15rem 0' }}>
                  Assign {assignModalCaregiver.fullName}
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Select a registered patient from CRM or an open intake request.
                </div>
              </div>
              <button
                onClick={() => setAssignModalCaregiver(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '1.4rem',
                  cursor: 'pointer',
                  padding: '2px',
                }}
              >
                ✕
              </button>
            </div>

            {/* Target Selection Tabs */}
            <div style={{ display: 'flex', gap: '0.4rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.45rem' }}>
              <button
                type="button"
                id="tab-modal-patients"
                onClick={() => setAssignModalTab('patients')}
                style={{
                  padding: '0.45rem 0.95rem',
                  borderRadius: 'var(--radius-md)',
                  border: assignModalTab === 'patients' ? '1px solid #0d9488' : '1px solid transparent',
                  backgroundColor: assignModalTab === 'patients' ? 'rgba(13, 148, 136, 0.12)' : '#f8fafc',
                  color: assignModalTab === 'patients' ? '#0f766e' : '#64748b',
                  fontWeight: assignModalTab === 'patients' ? 700 : 500,
                  fontSize: '0.825rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <span>👤 Patients (CRM)</span>
                <span
                  style={{
                    backgroundColor: assignModalTab === 'patients' ? '#0d9488' : '#e2e8f0',
                    color: assignModalTab === 'patients' ? '#ffffff' : '#475569',
                    borderRadius: '9999px',
                    padding: '0.1rem 0.45rem',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                  }}
                >
                  {patientsList.length}
                </span>
              </button>

              <button
                type="button"
                id="tab-modal-requests"
                onClick={() => setAssignModalTab('requests')}
                style={{
                  padding: '0.45rem 0.95rem',
                  borderRadius: 'var(--radius-md)',
                  border: assignModalTab === 'requests' ? '1px solid #0d9488' : '1px solid transparent',
                  backgroundColor: assignModalTab === 'requests' ? 'rgba(13, 148, 136, 0.12)' : '#f8fafc',
                  color: assignModalTab === 'requests' ? '#0f766e' : '#64748b',
                  fontWeight: assignModalTab === 'requests' ? 700 : 500,
                  fontSize: '0.825rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <span>📋 Intake Requests</span>
                <span
                  style={{
                    backgroundColor: assignModalTab === 'requests' ? '#0d9488' : '#e2e8f0',
                    color: assignModalTab === 'requests' ? '#ffffff' : '#475569',
                    borderRadius: '9999px',
                    padding: '0.1rem 0.45rem',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                  }}
                >
                  {openRequests.length}
                </span>
              </button>
            </div>

            {/* Search Filter */}
            <input
              type="text"
              id="input-modal-search"
              placeholder={
                assignModalTab === 'patients'
                  ? 'Search patients by name, reference, location, or service...'
                  : 'Search intake requests by patient name, reference or location...'
              }
              value={requestSearchQuery}
              onChange={(e) => setRequestSearchQuery(e.target.value)}
              className="form-input"
              style={{ fontSize: '0.85rem', minHeight: '42px', backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a' }}
            />

            {/* Results List */}
            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '380px', paddingRight: '2px' }}>
              {loadingModalData && (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b', fontSize: '0.85rem' }}>
                  Loading {assignModalTab === 'patients' ? 'patients' : 'requests'}...
                </div>
              )}

              {/* PATIENTS TAB */}
              {!loadingModalData && assignModalTab === 'patients' && (
                <>
                  {patientsList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.85rem' }}>
                      No registered patients found in CRM.
                      <div style={{ marginTop: '0.75rem' }}>
                        <Link href="/dashboard/customers" className="btn-secondary" style={{ fontSize: '0.8rem', backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a' }}>
                          Open CRM Directory
                        </Link>
                      </div>
                    </div>
                  ) : (
                    patientsList
                      .filter((p) => {
                        if (!requestSearchQuery.trim()) return true;
                        const q = requestSearchQuery.toLowerCase();
                        return (
                          p.patientName?.toLowerCase().includes(q) ||
                          p.referenceId?.toLowerCase().includes(q) ||
                          p.district?.toLowerCase().includes(q) ||
                          p.locality?.toLowerCase().includes(q) ||
                          p.serviceType?.toLowerCase().includes(q)
                        );
                      })
                      .map((p) => {
                        const isAssigned = !!p.assignedCaregiverId;
                        const currentCgName = p.assignedCaregiver?.fullName;

                        return (
                          <div
                            key={p.id}
                            id={`modal-patient-item-${p.id}`}
                            style={{
                              padding: '0.85rem',
                              backgroundColor: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: 'var(--radius-lg)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '0.75rem',
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>{p.patientName}</strong>
                                <span style={{ fontSize: '0.75rem', color: '#0d9488', fontFamily: 'monospace', fontWeight: 600 }}>
                                  #{p.referenceId || p.id.slice(0, 8)}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.2rem' }}>
                                📍 {p.locality ? `${p.locality}, ` : ''}{p.district || 'Kerala'} • Service: <strong>{p.serviceType || 'General Care'}</strong>
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
                                Status: <span style={{ textTransform: 'capitalize', color: '#0d9488', fontWeight: 600 }}>{p.status}</span>
                                {isAssigned && (
                                  <span style={{ color: '#d97706', marginLeft: '0.45rem', fontWeight: 600 }}>
                                    • Current: {currentCgName || 'Assigned'}
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              id={`btn-modal-assign-patient-${p.id}`}
                              onClick={() => handleAssignToPatient(p)}
                              disabled={assigningId === p.id}
                              className="btn-primary"
                              style={{
                                fontSize: '0.78rem',
                                padding: '0.45rem 0.85rem',
                                minHeight: '38px',
                                flexShrink: 0,
                                backgroundColor: isAssigned ? '#f59e0b' : '#0d9488',
                                borderColor: isAssigned ? '#d97706' : '#0d9488',
                              }}
                            >
                              {assigningId === p.id
                                ? 'Assigning...'
                                : isAssigned
                                ? 'Replace'
                                : 'Assign'}
                            </button>
                          </div>
                        );
                      })
                  )}
                </>
              )}

              {/* REQUESTS TAB */}
              {!loadingModalData && assignModalTab === 'requests' && (
                <>
                  {openRequests.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.85rem' }}>
                      No open requests available right now.
                      <div style={{ marginTop: '0.75rem' }}>
                        <Link href="/dashboard/requests" className="btn-secondary" style={{ fontSize: '0.8rem', backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a' }}>
                          View Requests Board
                        </Link>
                      </div>
                    </div>
                  ) : (
                    openRequests
                      .filter((r) => {
                        if (!requestSearchQuery.trim()) return true;
                        const q = requestSearchQuery.toLowerCase();
                        return (
                          r.patientName?.toLowerCase().includes(q) ||
                          r.referenceId?.toLowerCase().includes(q) ||
                          r.district?.toLowerCase().includes(q) ||
                          r.locality?.toLowerCase().includes(q) ||
                          r.serviceType?.toLowerCase().includes(q)
                        );
                      })
                      .map((req) => (
                        <div
                          key={req.id}
                          id={`modal-request-item-${req.id}`}
                          style={{
                            padding: '0.85rem',
                            backgroundColor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: 'var(--radius-lg)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '0.75rem',
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>{req.patientName}</strong>
                              <span style={{ fontSize: '0.75rem', color: '#0d9488', fontFamily: 'monospace', fontWeight: 600 }}>
                                #{req.referenceId || req.id.slice(0, 8)}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.2rem' }}>
                              📍 {req.locality ? `${req.locality}, ` : ''}{req.district || 'Kerala'} • Service: <strong>{req.serviceType || 'General Care'}</strong>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
                              Status: <span style={{ textTransform: 'capitalize', color: '#0d9488', fontWeight: 600 }}>{req.status}</span> • Pref: {req.genderPreference || 'Any'}
                            </div>
                          </div>

                          <button
                            type="button"
                            id={`btn-modal-assign-request-${req.id}`}
                            onClick={() => handleAssignToOpenRequest(req)}
                            disabled={assigningId === req.id}
                            className="btn-primary"
                            style={{ fontSize: '0.78rem', padding: '0.45rem 0.85rem', minHeight: '38px', flexShrink: 0, backgroundColor: '#0d9488' }}
                          >
                            {assigningId === req.id ? 'Assigning...' : 'Assign'}
                          </button>
                        </div>
                      ))
                  )}
                </>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0' }}>
              <button
                type="button"
                onClick={() => setAssignModalCaregiver(null)}
                className="btn-secondary"
                style={{ fontSize: '0.8rem', minHeight: '38px', backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CAREGIVER PROFILE MODAL (Light Theme, matches CaregiverDetailDrawer) */}
      {selectedCaregiverModal && (
        <div
          id="caregiver-profile-modal"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 120,
            padding: '1.25rem',
          }}
          onClick={() => setSelectedCaregiverModal(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-xl)',
              maxWidth: '560px',
              width: '100%',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.15rem',
              boxShadow: '0 20px 45px rgba(15, 23, 42, 0.15)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {selectedCaregiverModal.fullName}
                </h3>
                <div style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '0.15rem' }}>
                  {selectedCaregiverModal.gender} • {selectedCaregiverModal.district || 'Kerala'} {selectedCaregiverModal.city ? `• ${selectedCaregiverModal.city}` : ''}
                </div>
              </div>
              <button
                onClick={() => setSelectedCaregiverModal(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '1.4rem',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: 'var(--radius-lg)', border: '1px solid #e2e8f0' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.2rem' }}>Status</div>
                <CaregiverStatusBadge status={selectedCaregiverModal.status as CaregiverStatusType} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Experience</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                  {selectedCaregiverModal.experienceYears} Years
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Daily Rate</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#059669' }}>
                  ₹{selectedCaregiverModal.dailyRate || 0} / day
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Languages</div>
                <div style={{ fontSize: '0.9rem', color: '#0f172a' }}>
                  {selectedCaregiverModal.languages?.join(', ') || 'Malayalam'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Rating</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#b45309' }}>
                  ★ {selectedCaregiverModal.averageRating ? Number(selectedCaregiverModal.averageRating).toFixed(1) : 'New'}{' '}
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 400 }}>
                    ({selectedCaregiverModal.totalRatings || 0})
                  </span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Jobs Completed</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0d9488' }}>
                  {selectedCaregiverModal.jobsCompleted || 0} Completed
                </div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem' }}>
                Skills & Care Competencies
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {selectedCaregiverModal.skills?.map((skill) => (
                  <span
                    key={skill}
                    style={{
                      fontSize: '0.72rem',
                      padding: '0.2rem 0.55rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: '#f1f5f9',
                      color: '#0f766e',
                      border: '1px solid #e2e8f0',
                      fontWeight: 500,
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {selectedCaregiverModal.profileSummary && (
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.2rem' }}>
                  Profile Summary
                </div>
                <p style={{ fontSize: '0.825rem', color: '#475569', margin: 0, fontStyle: 'italic' }}>
                  "{selectedCaregiverModal.profileSummary}"
                </p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.4rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setSelectedCaregiverModal(null)}
                className="btn-secondary"
                style={{ fontSize: '0.8rem', minHeight: '38px', backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a' }}
              >
                Close
              </button>
              <Link
                href={`/dashboard/caregivers`}
                className="btn-primary"
                style={{ fontSize: '0.8rem', minHeight: '38px', backgroundColor: '#0d9488' }}
              >
                Open Full Record
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SmartMatchingPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          Loading Matching Engine...
        </div>
      }
    >
      <MatchingPageContent />
    </Suspense>
  );
}
