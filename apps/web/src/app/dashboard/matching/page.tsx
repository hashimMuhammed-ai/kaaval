'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '../../../utils/api';

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

const COMMON_SKILLS = [
  'Elderly Care',
  'Bedridden Care',
  'Dementia Care',
  'Post-Op Recovery',
  'Palliative Care',
  'Injection / IV',
  'Vital Signs Monitoring',
  'Stroke Patient Care',
  'Catheter Care',
  'Medication Management',
  'Physical Therapy Assistance',
];

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

  // Request / Customer context state
  const [scopedEntity, setScopedEntity] = useState<any>(null);

  // Results State
  const [data, setData] = useState<MatchEngineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedCaregiverModal, setSelectedCaregiverModal] = useState<MatchedCaregiver | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
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

  // Direct Assignment / Replacement Handler
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
              : 'Replaced via Smart Matching Engine',
            absenceReason: absenceReasonVal,
            absenceNotes: absenceNotesVal,
          }),
        });
        showToast(`Replacement caregiver ${caregiver.fullName} assigned! Lineage updated.`);
        const targetCustId = scopedEntity?.customerId || scopedEntity?.customer?.id || customerId;
        setTimeout(
          () =>
            router.push(
              targetCustId ? `/dashboard/customers/${targetCustId}` : '/dashboard/customers'
            ),
          1200
        );
      } catch (err: any) {
        showToast(`Replacement failed: ${err.message}`);
      } finally {
        setAssigningId(null);
      }
    } else if (requestId) {
      if (!confirm(`Assign ${caregiver.fullName} to Request ${scopedEntity?.referenceId || requestId}?`)) return;
      setAssigningId(caregiver.id);
      try {
        await apiFetch(`/requests/${requestId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            assignedCaregiverId: caregiver.id,
            status: 'assigned',
          }),
        });
        showToast(`Caregiver ${caregiver.fullName} assigned to request!`);
        setTimeout(() => router.push('/dashboard/requests'), 1200);
      } catch (err: any) {
        showToast(`Assignment failed: ${err.message}`);
      } finally {
        setAssigningId(null);
      }
    } else if (customerId) {
      if (!confirm(`Assign ${caregiver.fullName} to Customer ${scopedEntity?.patientName || customerId}?`)) return;
      setAssigningId(caregiver.id);
      try {
        await apiFetch(`/customers/${customerId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            assignedCaregiverId: caregiver.id,
            status: 'active',
          }),
        });
        showToast(`Caregiver ${caregiver.fullName} assigned to customer profile!`);
        setTimeout(() => router.push(`/dashboard/customers/${customerId}`), 1200);
      } catch (err: any) {
        showToast(`Assignment failed: ${err.message}`);
      } finally {
        setAssigningId(null);
      }
    } else {
      setSelectedCaregiverModal(caregiver);
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem', width: '100%' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          id="matching-toast"
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid #14b8a6',
            color: '#ffffff',
            padding: '1rem 1.5rem',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(20, 184, 166, 0.3)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.9rem',
            fontWeight: 500,
          }}
        >
          <span style={{ color: '#2dd4bf', fontSize: '1.2rem' }}>✓</span>
          {toastMessage}
        </div>
      )}

      {/* Header with Title and Scoped Banner */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)',
                  color: '#ffffff',
                  fontSize: '1.1rem',
                }}
              >
                🎯
              </div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', margin: 0 }}>
                Smart Caregiver Matching Engine
              </h1>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
              PostGIS GiST spatial queries with distance-aware ranking, competency filtering, and availability scoring.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Link
              href="/dashboard/caregivers"
              className="btn-secondary"
              id="btn-view-all-caregivers"
              style={{ fontSize: '0.85rem' }}
            >
              Caregivers Roster
            </Link>
            <button
              onClick={() => executeMatching()}
              className="btn-primary"
              id="btn-refresh-matching"
              style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <span>🔄</span> Refresh Matches
            </button>
          </div>
        </div>

        {/* Scoped Context Banner if navigating from Request, Customer, or Assignment Replacement */}
        {(assignmentId || requestId || customerId) && (
          <div
            id="scoped-context-banner"
            style={{
              marginTop: '1.25rem',
              padding: '1rem 1.25rem',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: assignmentId
                ? 'rgba(245, 158, 11, 0.12)'
                : 'rgba(20, 184, 166, 0.1)',
              border: assignmentId
                ? '1px solid rgba(245, 158, 11, 0.4)'
                : '1px solid rgba(20, 184, 166, 0.35)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: assignmentId
                    ? 'rgba(245, 158, 11, 0.25)'
                    : 'rgba(20, 184, 166, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                }}
              >
                {assignmentId ? '🔄' : '👤'}
              </div>
              <div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: assignmentId ? '#fbbf24' : '#2dd4bf',
                    fontWeight: 700,
                  }}
                >
                  {assignmentId
                    ? '🔄 Replacement Match Mode: Scoped To Assignment Replacement'
                    : requestId
                    ? 'Scoped To Intake Request'
                    : 'Scoped To Active Customer CRM'}
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
                  {scopedEntity?.customer?.patientName ||
                    scopedEntity?.patientName ||
                    'Loading Patient...'}
                  <span
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                      fontWeight: 400,
                      marginLeft: '0.5rem',
                    }}
                  >
                    ({scopedEntity?.referenceId || assignmentId || requestId || customerId})
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {assignmentId && scopedEntity?.caregiver ? (
                    <span style={{ color: '#fbbf24', marginRight: '0.5rem' }}>
                      Replacing: <strong>{scopedEntity.caregiver.fullName}</strong> •
                    </span>
                  ) : null}
                  📍{' '}
                  {scopedEntity?.customer?.locality || scopedEntity?.locality
                    ? `${scopedEntity?.customer?.locality || scopedEntity?.locality}, `
                    : ''}
                  {scopedEntity?.customer?.district || scopedEntity?.district || 'Kerala'} • Service:{' '}
                  <strong>
                    {scopedEntity?.customer?.serviceType ||
                      scopedEntity?.serviceType ||
                      'General Care'}
                  </strong>{' '}
                  • Gender Pref:{' '}
                  <strong>
                    {scopedEntity?.customer?.genderPreference ||
                      scopedEntity?.genderPreference ||
                      'Any'}
                  </strong>
                  {assignmentId ? ' • (Current caregiver excluded)' : ''}
                </div>
                {assignmentId && scopedEntity?.replacementSlaStatus && scopedEntity.replacementSlaStatus !== 'none' ? (
                  <div style={{ marginTop: '3px', fontSize: '0.75rem' }}>
                    <span
                      style={{
                        color:
                          scopedEntity.replacementSlaStatus === 'escalated' ? '#f87171' : '#fbbf24',
                        fontWeight: 700,
                      }}
                    >
                      {scopedEntity.replacementSlaStatus === 'escalated'
                        ? '🚨 SLA Breached: Escalated to Owner via WhatsApp & Push'
                        : `⏱️ Active Replacement SLA: ${scopedEntity.replacementSlaMinutes || 120}m window`}
                    </span>
                    {scopedEntity.absenceReason ? ` • Reason: ${scopedEntity.absenceReason}` : ''}
                  </div>
                ) : null}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                style={{ fontSize: '0.8rem', padding: '0.45rem 0.8rem' }}
              >
                Back to {assignmentId ? 'Assignment / Customer' : requestId ? 'Request' : 'Customer'}
              </Link>
              <Link
                href="/dashboard/matching"
                className="btn-secondary"
                id="btn-clear-scope"
                style={{
                  fontSize: '0.8rem',
                  padding: '0.45rem 0.8rem',
                  color: 'var(--text-muted)',
                }}
              >
                ✕ Clear Scope
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Main Layout: Left Filter Panel & Right Results Section */}
      <div className="matching-layout-grid">
        {/* Left Filter Card */}
        <aside
          id="matching-filter-panel"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            position: 'sticky',
            top: '85px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-card)', paddingBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🔍</span> Matching Filters
            </h2>
            <button
              onClick={() => {
                setDistrict('Ernakulam');
                setCity('');
                setRadiusKm(25);
                setGender('any');
                setMinExp(0);
                setSelectedSkills([]);
                setIncludeAllStatuses(false);
                setSortBy('score');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary-400)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Reset Filters
            </button>
          </div>

          {/* District Selection */}
          <div>
            <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.35rem' }}>
              Kerala District
            </label>
            <select
              id="filter-district"
              className="form-input"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              style={{ fontSize: '0.85rem' }}
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
            <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.35rem' }}>
              City / Locality (Optional)
            </label>
            <input
              id="filter-city"
              type="text"
              className="form-input"
              placeholder="e.g. Kakkanad, Aluva, Calicut"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            />
          </div>

          {/* Distance Radius */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label className="form-label" style={{ fontSize: '0.8rem', margin: 0 }}>
                Spatial Radius (PostGIS GiST)
              </label>
              <span style={{ fontSize: '0.85rem', color: '#2dd4bf', fontWeight: 700 }}>
                {radiusKm} km
              </span>
            </div>

            {/* Thumb-friendly Range Slider */}
            <div style={{ margin: '0.5rem 0 0.65rem 0' }}>
              <input
                id="filter-radius-slider"
                type="range"
                min="5"
                max="100"
                step="5"
                value={radiusKm}
                onChange={(e) => setRadiusKm(parseInt(e.target.value, 10))}
                className="touch-range-slider"
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                <span>5 km</span>
                <span>25 km</span>
                <span>50 km</span>
                <span>100 km</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', marginTop: '0.4rem' }}>
              {RADIUS_OPTIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  id={`btn-radius-${r}`}
                  onClick={() => setRadiusKm(r)}
                  style={{
                    padding: '0.45rem 0.25rem',
                    minHeight: '42px',
                    fontSize: '0.78rem',
                    fontWeight: radiusKm === r ? 700 : 500,
                    borderRadius: 'var(--radius-md)',
                    border: radiusKm === r ? '1px solid #14b8a6' : '1px solid var(--border-card)',
                    backgroundColor: radiusKm === r ? 'rgba(20, 184, 166, 0.25)' : 'rgba(15, 23, 42, 0.5)',
                    color: radiusKm === r ? '#ffffff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {r} km
                </button>
              ))}
            </div>
          </div>

          {/* Gender Preference */}
          <div>
            <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.35rem' }}>
              Gender Preference
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
              {[
                { key: 'any', label: 'Any' },
                { key: 'female', label: 'Female' },
                { key: 'male', label: 'Male' },
              ].map((g) => (
                <button
                  key={g.key}
                  type="button"
                  id={`filter-gender-${g.key}`}
                  onClick={() => setGender(g.key)}
                  style={{
                    padding: '0.45rem 0.25rem',
                    minHeight: '42px',
                    fontSize: '0.78rem',
                    fontWeight: gender.toLowerCase() === g.key ? 700 : 500,
                    borderRadius: 'var(--radius-md)',
                    border: gender.toLowerCase() === g.key ? '1px solid #14b8a6' : '1px solid var(--border-card)',
                    backgroundColor: gender.toLowerCase() === g.key ? 'rgba(20, 184, 166, 0.25)' : 'rgba(15, 23, 42, 0.5)',
                    color: gender.toLowerCase() === g.key ? '#ffffff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Minimum Experience */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label className="form-label" style={{ fontSize: '0.8rem', margin: 0 }}>
                Min Experience
              </label>
              <span style={{ fontSize: '0.8rem', color: '#2dd4bf', fontWeight: 700 }}>
                {minExp === 0 ? 'Any Experience' : `${minExp}+ Years`}
              </span>
            </div>
            <input
              id="filter-min-exp"
              type="range"
              min="0"
              max="10"
              step="1"
              value={minExp}
              onChange={(e) => setMinExp(parseInt(e.target.value, 10))}
              style={{ width: '100%', accentColor: '#14b8a6', cursor: 'pointer' }}
            />
          </div>

          {/* Required Skills Chips */}
          <div>
            <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.35rem' }}>
              Care Competencies & Skills
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto' }}>
              {COMMON_SKILLS.map((skill) => {
                const isSelected = selectedSkills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    style={{
                      padding: '0.4rem 0.7rem',
                      minHeight: '36px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.75rem',
                      fontWeight: isSelected ? 600 : 400,
                      backgroundColor: isSelected ? '#14b8a6' : 'rgba(255, 255, 255, 0.05)',
                      color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                      border: isSelected ? '1px solid #14b8a6' : '1px solid var(--border-card)',
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderTop: '1px solid var(--border-card)' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ffffff' }}>Include Non-Available Staff</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Useful for replacement & backup planning</div>
            </div>
            <input
              id="filter-include-all-statuses"
              type="checkbox"
              checked={includeAllStatuses}
              onChange={(e) => setIncludeAllStatuses(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: '#14b8a6', cursor: 'pointer' }}
            />
          </div>

          {/* Sort By Dropdown */}
          <div>
            <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.35rem' }}>
              Sort Results By
            </label>
            <select
              id="filter-sort-by"
              className="form-input"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{ fontSize: '0.85rem' }}
            >
              <option value="score">Smart Match Score (Recommended)</option>
              <option value="distance">Proximity (Closest First)</option>
              <option value="experience">Experience (Highest First)</option>
              <option value="dailyRate">Daily Rate (Lowest First)</option>
            </select>
          </div>

          {/* Execute Button */}
          <button
            id="btn-execute-matching"
            onClick={() => executeMatching()}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontWeight: 700 }}
          >
            Apply Filters & Match
          </button>
        </aside>

        {/* Right Match Results Section */}
        <section id="matching-results-section" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Spatial Target Banner */}
          {data?.targetLocation && (
            <div
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-xl)',
                padding: '1rem 1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>📍</span>
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary-400)', fontWeight: 600 }}>
                    Target Geocoded Proximity Center
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ffffff' }}>
                    {data.targetLocation.displayName || `${city || district}, Kerala`}
                  </div>
                  {data.targetLocation.latitude != null && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      Coordinates: {data.targetLocation.latitude.toFixed(4)}° N, {data.targetLocation.longitude?.toFixed(4)}° E • Source: {data.targetLocation.source}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Search Radius</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2dd4bf' }}>{radiusKm} km</div>
                </div>
                <div style={{ width: '1px', height: '30px', backgroundColor: 'var(--border-card)' }} />
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Caregivers Found</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>{data?.totalMatches || 0}</div>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div
              id="matching-loading"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4rem 2rem',
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--border-card)',
                gap: '1rem',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  border: '3px solid rgba(20, 184, 166, 0.2)',
                  borderTop: '3px solid #14b8a6',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Executing PostGIS GiST proximity query across Kerala caregiver network...
              </div>
            </div>
          )}

          {/* Empty Results State */}
          {!loading && data?.matches.length === 0 && (
            <div
              id="matching-empty-state"
              style={{
                padding: '4rem 2rem',
                textAlign: 'center',
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-xl)',
                border: '1px dashed var(--border-card)',
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗺️</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
                No Caregivers Matched Within {radiusKm} km
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '500px', margin: '0 auto 1.5rem auto' }}>
                No staff members currently match your selected distance radius ({radiusKm} km) and competency criteria in {district}.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                <button
                  onClick={() => setRadiusKm(50)}
                  className="btn-primary"
                  id="btn-expand-radius"
                  style={{ fontSize: '0.85rem' }}
                >
                  Expand Radius to 50 km
                </button>
                <button
                  onClick={() => setIncludeAllStatuses(true)}
                  className="btn-secondary"
                  id="btn-include-all-status"
                  style={{ fontSize: '0.85rem' }}
                >
                  Include Assigned / On Leave Staff
                </button>
              </div>
            </div>
          )}

          {/* Results Match Cards Grid */}
          {!loading && data && data.matches.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {data.matches.map((item, idx) => {
                const cg = item.caregiver;
                const isTopMatch = idx === 0 && item.matchScore >= 80;

                // Status Badge Color
                let statusBg = 'rgba(16, 185, 129, 0.15)';
                let statusBorder = 'rgba(16, 185, 129, 0.3)';
                let statusColor = '#34d399';
                let statusLabel = 'Available';

                if (cg.status === 'assigned') {
                  statusBg = 'rgba(59, 130, 246, 0.15)';
                  statusBorder = 'rgba(59, 130, 246, 0.3)';
                  statusColor = '#60a5fa';
                  statusLabel = 'Assigned';
                } else if (cg.status === 'on_leave') {
                  statusBg = 'rgba(245, 158, 11, 0.15)';
                  statusBorder = 'rgba(245, 158, 11, 0.3)';
                  statusColor = '#fbbf24';
                  statusLabel = 'On Leave';
                } else if (cg.status === 'inactive') {
                  statusBg = 'rgba(148, 163, 184, 0.15)';
                  statusBorder = 'rgba(148, 163, 184, 0.3)';
                  statusColor = '#94a3b8';
                  statusLabel = 'Inactive';
                }

                // Distance color
                const distanceColor =
                  item.distanceKm != null && item.distanceKm <= 5
                    ? '#34d399'
                    : item.distanceKm != null && item.distanceKm <= 15
                    ? '#2dd4bf'
                    : '#fbbf24';

                return (
                  <div
                    key={cg.id}
                    id={`match-card-${cg.id}`}
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      border: isTopMatch ? '1px solid rgba(20, 184, 166, 0.5)' : '1px solid var(--border-card)',
                      borderRadius: 'var(--radius-xl)',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                      boxShadow: isTopMatch ? '0 10px 25px -5px rgba(20, 184, 166, 0.15)' : 'none',
                      transition: 'transform 0.15s ease, border-color 0.15s ease',
                      position: 'relative',
                    }}
                  >
                    {/* Top Match Ribbon */}
                    {isTopMatch && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '-10px',
                          right: '24px',
                          backgroundColor: '#14b8a6',
                          color: '#ffffff',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          padding: '0.2rem 0.65rem',
                          borderRadius: 'var(--radius-full)',
                          boxShadow: '0 2px 8px rgba(20, 184, 166, 0.4)',
                        }}
                      >
                        ⭐ Highest Ranked Match
                      </div>
                    )}

                    {/* Card Header Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {/* Avatar */}
                        <div
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.15rem',
                            fontWeight: 700,
                            color: '#2dd4bf',
                          }}
                        >
                          {cg.fullName.slice(0, 2).toUpperCase()}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
                              {cg.fullName}
                            </span>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                padding: '0.2rem 0.55rem',
                                borderRadius: 'var(--radius-full)',
                                backgroundColor: statusBg,
                                border: `1px solid ${statusBorder}`,
                                color: statusColor,
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                              }}
                            >
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: statusColor }} />
                              {statusLabel}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              • {cg.gender}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                            📍 {cg.district || 'Kerala'} {cg.city ? `• ${cg.city}` : ''}
                            {cg.address ? ` (${cg.address})` : ''}
                          </div>
                        </div>
                      </div>

                      {/* Distance & Score Badges */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                        {/* Distance Badge */}
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Proximity
                          </div>
                          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: distanceColor }}>
                            {item.distanceKm != null ? `${item.distanceKm} km` : 'Same District'}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>via PostGIS GiST</div>
                        </div>

                        {/* Match Score Circular Pill */}
                        <div
                          style={{
                            padding: '0.5rem 0.85rem',
                            borderRadius: 'var(--radius-lg)',
                            backgroundColor: 'rgba(20, 184, 166, 0.12)',
                            border: '1px solid rgba(20, 184, 166, 0.4)',
                            textAlign: 'center',
                          }}
                        >
                          <div style={{ fontSize: '0.72rem', color: 'var(--primary-400)', textTransform: 'uppercase', fontWeight: 700 }}>
                            Match
                          </div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ffffff' }}>
                            {item.matchScore}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Score Breakdown Pills */}
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 0.75rem',
                        backgroundColor: 'rgba(15, 23, 42, 0.4)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.75rem',
                      }}
                    >
                      <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Score Breakdown:</span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        📍 Distance: {item.scoreBreakdown.distanceScore}/40
                      </span>
                      <span style={{ color: 'var(--border-card)' }}>•</span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        🛠 Skills: {item.scoreBreakdown.skillsScore}/30
                      </span>
                      <span style={{ color: 'var(--border-card)' }}>•</span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        ⭐ Experience: {item.scoreBreakdown.experienceScore}/20
                      </span>
                      <span style={{ color: 'var(--border-card)' }}>•</span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        👥 Gender: {item.scoreBreakdown.genderScore}/10
                      </span>
                    </div>

                    {/* Key Attributes Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.85rem' }}>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Experience:</span>{' '}
                        <strong style={{ color: '#ffffff' }}>{cg.experienceYears || 0} years</strong>
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Daily Rate:</span>{' '}
                        <strong style={{ color: '#34d399' }}>₹{cg.dailyRate ? cg.dailyRate.toLocaleString() : 'N/A'}/day</strong>
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Languages:</span>{' '}
                        <span style={{ color: '#ffffff' }}>{cg.languages?.join(', ') || 'Malayalam'}</span>
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Phone:</span>{' '}
                        <span style={{ color: '#ffffff', fontFamily: 'monospace' }}>{cg.phone}</span>
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Rating:</span>{' '}
                        <strong style={{ color: '#fbbf24' }}>
                          ★ {cg.averageRating ? Number(cg.averageRating).toFixed(1) : 'New'}
                        </strong>{' '}
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          ({cg.totalRatings || 0} reviews)
                        </span>
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Jobs Done:</span>{' '}
                        <strong style={{ color: 'var(--primary-400)' }}>
                          {cg.jobsCompleted || 0} {cg.jobsCompleted === 1 ? 'completed' : 'completed'}
                        </strong>
                      </div>
                    </div>

                    {/* Skills Chips */}
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                        Competencies & Matching Skills:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {cg.skills?.map((skill) => {
                          const isMatch = item.matchingSkills.some(
                            (ms) => ms.toLowerCase() === skill.toLowerCase()
                          );
                          return (
                            <span
                              key={skill}
                              style={{
                                fontSize: '0.75rem',
                                padding: '0.2rem 0.55rem',
                                borderRadius: 'var(--radius-full)',
                                backgroundColor: isMatch ? 'rgba(20, 184, 166, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                color: isMatch ? '#2dd4bf' : 'var(--text-secondary)',
                                border: isMatch ? '1px solid rgba(20, 184, 166, 0.4)' : '1px solid var(--border-card)',
                                fontWeight: isMatch ? 700 : 400,
                              }}
                            >
                              {isMatch ? '✓ ' : ''}{skill}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Summary if present */}
                    {cg.profileSummary && (
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        "{cg.profileSummary}"
                      </p>
                    )}

                    {/* Action Buttons: Responsive & Touch-friendly */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                        gap: '0.5rem',
                        borderTop: '1px solid var(--border-card)',
                        paddingTop: '0.85rem',
                      }}
                    >
                      <a
                        href={`tel:${cg.phone}`}
                        id={`mobile-match-call-${cg.id}`}
                        className="btn-secondary"
                        style={{
                          fontSize: '0.825rem',
                          padding: '0.55rem 0.75rem',
                          minHeight: '44px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          borderRadius: 'var(--radius-md)',
                        }}
                      >
                        <span>📞</span> Call
                      </a>
                      <a
                        href={`https://wa.me/${cg.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        id={`mobile-match-wa-${cg.id}`}
                        className="btn-secondary"
                        style={{
                          fontSize: '0.825rem',
                          padding: '0.55rem 0.75rem',
                          minHeight: '44px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          borderRadius: 'var(--radius-md)',
                          color: '#22c55e',
                          borderColor: 'rgba(34, 197, 94, 0.4)',
                        }}
                      >
                        <span>💬</span> WhatsApp
                      </a>
                      <button
                        onClick={() => setSelectedCaregiverModal(cg)}
                        id={`mobile-match-profile-${cg.id}`}
                        className="btn-secondary"
                        style={{
                          fontSize: '0.825rem',
                          padding: '0.55rem 0.75rem',
                          minHeight: '44px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 'var(--radius-md)',
                        }}
                      >
                        View Profile
                      </button>
                      <button
                        onClick={() => handleAssignCaregiver(cg)}
                        disabled={assigningId === cg.id}
                        className="btn-primary"
                        id={`btn-assign-${cg.id}`}
                        style={{
                          fontSize: '0.825rem',
                          padding: '0.55rem 1rem',
                          minHeight: '44px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          fontWeight: 700,
                          backgroundColor: assignmentId ? '#f59e0b' : undefined,
                          borderColor: assignmentId ? '#d97706' : undefined,
                          borderRadius: 'var(--radius-md)',
                        }}
                      >
                        {assigningId === cg.id ? (
                          <span>{assignmentId ? 'Replacing...' : 'Assigning...'}</span>
                        ) : (
                          <>
                            <span>{assignmentId ? '🔄' : '✓'}</span>
                            <span>
                              {assignmentId
                                ? 'Assign as Replacement'
                                : requestId || customerId
                                ? 'Assign to Patient'
                                : 'Select for Assignment'}
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

      {/* Standalone Caregiver Profile Modal */}
      {selectedCaregiverModal && (
        <div
          id="caregiver-profile-modal"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
          }}
          onClick={() => setSelectedCaregiverModal(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-xl)',
              maxWidth: '600px',
              width: '100%',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  {selectedCaregiverModal.fullName}
                </h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  {selectedCaregiverModal.gender} • {selectedCaregiverModal.district || 'Kerala'} • {selectedCaregiverModal.city || ''}
                </div>
              </div>
              <button
                onClick={() => setSelectedCaregiverModal(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', backgroundColor: 'rgba(15, 23, 42, 0.5)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#34d399', textTransform: 'capitalize' }}>
                  {selectedCaregiverModal.status}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Experience</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                  {selectedCaregiverModal.experienceYears} Years
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Daily Rate</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#34d399' }}>
                  ₹{selectedCaregiverModal.dailyRate || 0} / day
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Languages</div>
                <div style={{ fontSize: '0.95rem', color: '#ffffff' }}>
                  {selectedCaregiverModal.languages?.join(', ') || 'Malayalam'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Customer Rating</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fbbf24' }}>
                  ★ {selectedCaregiverModal.averageRating ? Number(selectedCaregiverModal.averageRating).toFixed(1) : 'New'}{' '}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                    ({selectedCaregiverModal.totalRatings || 0} reviews)
                  </span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Jobs Completed</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary-400)' }}>
                  {selectedCaregiverModal.jobsCompleted || 0} Finished
                </div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.4rem' }}>
                Skills & Care Competencies
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {selectedCaregiverModal.skills?.map((skill) => (
                  <span
                    key={skill}
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.6rem',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'rgba(20, 184, 166, 0.15)',
                      color: '#2dd4bf',
                      border: '1px solid rgba(20, 184, 166, 0.3)',
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {selectedCaregiverModal.profileSummary && (
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.25rem' }}>
                  Profile Summary
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                  {selectedCaregiverModal.profileSummary}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                onClick={() => setSelectedCaregiverModal(null)}
                className="btn-secondary"
              >
                Close
              </button>
              <Link
                href={`/dashboard/caregivers`}
                className="btn-primary"
              >
                Open Full Roster Record
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
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading Smart Matching Engine...
        </div>
      }
    >
      <MatchingPageContent />
    </Suspense>
  );
}
