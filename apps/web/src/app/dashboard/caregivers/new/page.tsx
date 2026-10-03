'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../../../utils/api';

const KERALA_DISTRICTS = [
  { name: 'Alappuzha', lat: 9.4981, lng: 76.3388 },
  { name: 'Ernakulam', lat: 9.9816, lng: 76.2999 },
  { name: 'Idukki', lat: 9.8514, lng: 76.9698 },
  { name: 'Kannur', lat: 11.8745, lng: 75.3704 },
  { name: 'Kasaragod', lat: 12.5102, lng: 74.9852 },
  { name: 'Kollam', lat: 8.8932, lng: 76.6141 },
  { name: 'Kottayam', lat: 9.5916, lng: 76.5222 },
  { name: 'Kozhikode', lat: 11.2588, lng: 75.7804 },
  { name: 'Malappuram', lat: 11.0510, lng: 76.0711 },
  { name: 'Palakkad', lat: 10.7867, lng: 76.6548 },
  { name: 'Pathanamthitta', lat: 9.2648, lng: 76.7870 },
  { name: 'Thiruvananthapuram', lat: 8.5241, lng: 76.9366 },
  { name: 'Thrissur', lat: 10.5276, lng: 76.2144 },
  { name: 'Wayanad', lat: 11.6854, lng: 76.1320 },
];

const AVAILABLE_SKILLS = [
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
  'Infant Care',
];

const AVAILABLE_LANGUAGES = ['Malayalam', 'English', 'Tamil', 'Hindi', 'Kannada'];

export default function NewCaregiverPage() {
  const router = useRouter();

  // Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('female');
  const [dateOfBirth, setDateOfBirth] = useState('');

  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('Ernakulam');
  const [pincode, setPincode] = useState('');
  const [latitude, setLatitude] = useState<number | ''>(9.9816);
  const [longitude, setLongitude] = useState<number | ''>(76.2999);

  const [skills, setSkills] = useState<string[]>(['Elderly Care', 'Bedridden Care']);
  const [experienceYears, setExperienceYears] = useState<number | ''>(3);
  const [dailyRate, setDailyRate] = useState<number | ''>(1200);
  const [status, setStatus] = useState<'available' | 'assigned' | 'on_leave' | 'inactive'>('available');
  const [languages, setLanguages] = useState<string[]>(['Malayalam', 'English']);

  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [profileSummary, setProfileSummary] = useState('');
  const [notes, setNotes] = useState('');

  const [customPassword, setCustomPassword] = useState('');
  const [autoGenPassword, setAutoGenPassword] = useState(true);

  // Submission & Result State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  // Document Attachment for newly created caregiver
  const [attachedDocs, setAttachedDocs] = useState<any[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docType, setDocType] = useState('nursing_certificate');
  const [docTitle, setDocTitle] = useState('Kerala Nursing Council Registration');
  const [docExpiry, setDocExpiry] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const [docSuccess, setDocSuccess] = useState<string | null>(null);

  const handleUploadForNewCaregiver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdResult?.id || !docFile) {
      setDocError('Please select a document file.');
      return;
    }
    setUploadingDoc(true);
    setDocError(null);
    setDocSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', docFile);
      formData.append('documentType', docType);
      formData.append('title', docTitle.trim() || 'Document');
      if (docExpiry) formData.append('expiryDate', docExpiry);

      const uploaded = await apiFetch(`/caregivers/${createdResult.id}/documents`, {
        method: 'POST',
        body: formData,
      });

      setAttachedDocs((prev) => [...prev, uploaded]);
      setDocFile(null);
      setDocExpiry('');
      setDocSuccess(`Document "${uploaded.title}" uploaded to object storage.`);
      const input = document.getElementById('new-caregiver-file') as HTMLInputElement;
      if (input) input.value = '';
    } catch (err: any) {
      setDocError(err?.message || 'Failed to upload document.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDistrictChange = (dName: string) => {
    setDistrict(dName);
    const found = KERALA_DISTRICTS.find((d) => d.name === dName);
    if (found) {
      setLatitude(found.lat);
      setLongitude(found.lng);
    }
  };

  const toggleSkill = (skill: string) => {
    if (skills.includes(skill)) {
      setSkills(skills.filter((s) => s !== skill));
    } else {
      setSkills([...skills, skill]);
    }
  };

  const toggleLanguage = (lang: string) => {
    if (languages.includes(lang)) {
      setLanguages(languages.filter((l) => l !== lang));
    } else {
      setLanguages([...languages, lang]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('Please provide the caregiver full name.');
      return;
    }

    if (!phone.trim()) {
      setError('Please provide a valid contact / WhatsApp phone number.');
      return;
    }

    if (skills.length === 0) {
      setError('Please select at least one primary skill for caregiver matching.');
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() ? email.trim() : undefined,
        gender,
        dateOfBirth: dateOfBirth || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        district,
        state: 'Kerala',
        pincode: pincode.trim() || undefined,
        latitude: latitude !== '' ? Number(latitude) : undefined,
        longitude: longitude !== '' ? Number(longitude) : undefined,
        skills,
        experienceYears: experienceYears !== '' ? Number(experienceYears) : 0,
        status,
        dailyRate: dailyRate !== '' ? Number(dailyRate) : 0,
        emergencyContactName: emergencyContactName.trim() || undefined,
        emergencyContactPhone: emergencyContactPhone.trim() || undefined,
        languages,
        profileSummary: profileSummary.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (!autoGenPassword && customPassword.trim()) {
        payload.temporaryPassword = customPassword.trim();
      }

      const res = await apiFetch('/caregivers', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setCreatedResult(res.caregiver);
    } catch (err: any) {
      setError(err?.message || 'Failed to create caregiver profile. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdResult?.temporaryCredentials) return;
    const creds = createdResult.temporaryCredentials;
    const text = [
      `Caregiver Portal Credentials for ${createdResult.fullName}:`,
      `Portal: ${creds.portalUrl}`,
      `Username/Email: ${creds.username}`,
      `Temporary Password: ${creds.temporaryPassword}`,
      `Access Code: ${creds.accessCode}`,
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleResetForm = () => {
    setCreatedResult(null);
    setFullName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setCity('');
    setProfileSummary('');
    setNotes('');
    setEmergencyContactName('');
    setEmergencyContactPhone('');
    setCustomPassword('');
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', paddingBottom: '4rem' }}>
      {/* Breadcrumb & Title */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          <Link href="/dashboard" style={{ color: 'var(--text-secondary)' }}>Dashboard</Link>
          <span>/</span>
          <Link href="/dashboard/caregivers" style={{ color: 'var(--text-secondary)' }}>Caregivers</Link>
          <span>/</span>
          <span style={{ color: 'var(--primary-400)' }}>New Caregiver</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.9rem', color: '#ffffff', marginBottom: '0.35rem' }}>
              Add Caregiver & Generate Portal Login
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', maxWidth: '680px' }}>
              Creates the caregiver's complete profile and provisions their self-service portal account in a single combined action.
            </p>
          </div>

          <Link href="/dashboard/caregivers" className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            &larr; View Caregivers Roster
          </Link>
        </div>
      </div>

      {/* Success Modal / Credentials Handover Banner */}
      {createdResult && (
        <div
          id="credentials-handover-card"
          className="glass-panel animate-fade-in"
          style={{
            padding: '2rem',
            border: '2px solid var(--primary-500)',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            marginBottom: '2.5rem',
            boxShadow: 'var(--shadow-glow)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid var(--status-success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#34d399',
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <span className="badge badge-teal" style={{ marginBottom: '0.25rem' }}>Single Action Complete</span>
              <h2 style={{ fontSize: '1.35rem', color: '#ffffff' }}>
                {createdResult.fullName} Registered Successfully
              </h2>
            </div>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            The profile record and self-service portal account have been provisioned atomically. Share these temporary login credentials with the caregiver via WhatsApp or SMS.
          </p>

          {/* Credentials Box */}
          {createdResult.temporaryCredentials && (
            <div
              style={{
                backgroundColor: 'rgba(7, 11, 20, 0.85)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
                marginBottom: '1.75rem',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    Login Portal URL
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--primary-400)', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                    {createdResult.temporaryCredentials.portalUrl}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    Username / Login Identifier
                  </div>
                  <div style={{ fontSize: '0.95rem', color: '#ffffff', fontWeight: 600, fontFamily: 'monospace' }}>
                    {createdResult.temporaryCredentials.username}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    Temporary Password
                  </div>
                  <div style={{ fontSize: '1.05rem', color: '#fbbf24', fontWeight: 700, fontFamily: 'monospace' }}>
                    {createdResult.temporaryCredentials.temporaryPassword}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    Access Code
                  </div>
                  <div style={{ fontSize: '0.95rem', color: 'var(--accent-blue)', fontWeight: 600, fontFamily: 'monospace' }}>
                    {createdResult.temporaryCredentials.accessCode}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Document Attachment (Object Storage) */}
          <div
            style={{
              backgroundColor: 'rgba(11, 17, 32, 0.75)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-card)',
              padding: '1.25rem',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.925rem' }}>
                Attach Documents / Certifications (Object Storage)
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {attachedDocs.length} uploaded
              </span>
            </div>

            {attachedDocs.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {attachedDocs.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.3rem 0.6rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: '#34d399',
                    }}
                  >
                    ✓ {doc.title}
                  </div>
                ))}
              </div>
            )}

            {docSuccess && (
              <div style={{ padding: '0.5rem', borderRadius: '4px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontSize: '0.775rem', marginBottom: '0.5rem' }}>
                {docSuccess}
              </div>
            )}
            {docError && (
              <div style={{ padding: '0.5rem', borderRadius: '4px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: '0.775rem', marginBottom: '0.5rem' }}>
                {docError}
              </div>
            )}

            <form onSubmit={handleUploadForNewCaregiver} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Document Type
                  </label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="form-input"
                    style={{ fontSize: '0.825rem', padding: '0.5rem', minHeight: '42px' }}
                  >
                    <option value="nursing_certificate">Nursing Council Certificate</option>
                    <option value="aadhaar">Aadhaar / Photo ID</option>
                    <option value="police_clearance">Police Clearance Certificate</option>
                    <option value="experience_certificate">Experience Certificate</option>
                    <option value="cpr_first_aid">CPR & First Aid</option>
                    <option value="medical_fitness">Medical Fitness</option>
                    <option value="other">Other Document</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Title
                  </label>
                  <input
                    type="text"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    className="form-input"
                    style={{ fontSize: '0.825rem', padding: '0.5rem', minHeight: '42px' }}
                    placeholder="Document Label"
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Expiry Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={docExpiry}
                    onChange={(e) => setDocExpiry(e.target.value)}
                    className="form-input"
                    style={{ fontSize: '0.825rem', padding: '0.5rem', minHeight: '42px' }}
                  />
                </div>
              </div>

              {/* File / Camera Picker Triggers */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input
                  id="new-caregiver-file"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setDocFile(e.target.files[0]);
                    }
                  }}
                  style={{ display: 'none' }}
                />
                <input
                  id="new-caregiver-camera-file"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setDocFile(e.target.files[0]);
                    }
                  }}
                  style={{ display: 'none' }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' }}>
                  <button
                    type="button"
                    id="btn-upload-camera"
                    onClick={() => document.getElementById('new-caregiver-camera-file')?.click()}
                    className="btn-secondary"
                    style={{
                      minHeight: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                    }}
                  >
                    <span>📸</span> Snap with Camera
                  </button>
                  <button
                    type="button"
                    id="btn-upload-file"
                    onClick={() => document.getElementById('new-caregiver-file')?.click()}
                    className="btn-secondary"
                    style={{
                      minHeight: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                    }}
                  >
                    <span>📁</span> Browse Document / PDF
                  </button>
                </div>

                {docFile && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'rgba(20, 184, 166, 0.1)',
                      border: '1px solid rgba(20, 184, 166, 0.3)',
                      fontSize: '0.8rem',
                      color: '#2dd4bf',
                    }}
                  >
                    <span>📄 Selected: <strong>{docFile.name}</strong> ({(docFile.size / 1024).toFixed(0)} KB)</span>
                    <button
                      type="button"
                      onClick={() => setDocFile(null)}
                      style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      ✕ Remove
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={uploadingDoc || !docFile}
                  className="btn-primary"
                  id="btn-submit-doc-upload"
                  style={{ minHeight: '44px', fontSize: '0.85rem', fontWeight: 700, justifyContent: 'center' }}
                >
                  {uploadingDoc ? 'Uploading to Object Storage...' : 'Attach & Store Document'}
                </button>
              </div>
            </form>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
            <button
              onClick={handleCopyCredentials}
              className="btn-secondary"
              style={{ padding: '0.65rem 1.25rem' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>{copied ? 'Credentials Copied!' : 'Copy Credentials'}</span>
            </button>

            {createdResult.temporaryCredentials && (
              <a
                href={`https://wa.me/${createdResult.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                  createdResult.temporaryCredentials.whatsappOnboardingMessage
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-whatsapp"
                style={{ padding: '0.65rem 1.25rem' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.697c1.002.547 1.777.848 2.806.848 3.181 0 5.767-2.586 5.768-5.766.001-3.182-2.585-5.77-5.768-5.77zm0 10.366c-.897 0-1.632-.249-2.368-.687l-.17-.101-1.57.412.42-1.53-.111-.176c-.477-.759-.728-1.503-.728-2.518.001-2.535 2.062-4.597 4.598-4.597 2.537 0 4.598 2.062 4.598 4.598 0 2.536-2.061 4.599-4.599 4.599z"/>
                </svg>
                <span>Send via WhatsApp</span>
              </a>
            )}

            <button
              onClick={handleResetForm}
              className="btn-secondary"
              style={{ padding: '0.65rem 1.25rem', marginLeft: 'auto' }}
            >
              + Register Another Caregiver
            </button>

            <Link
              href="/dashboard/caregivers"
              className="btn-primary"
              style={{ padding: '0.65rem 1.25rem' }}
            >
              <span>Go to Caregiver Roster</span> &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* Main Creation Form */}
      <form onSubmit={handleSubmit} className="glass-panel responsive-form-container">
        {error && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#fca5a5',
              fontSize: '0.9rem',
              marginBottom: '2rem',
            }}
          >
            {error}
          </div>
        )}

        {/* Section 1: Personal & Contact Information */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <span
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                backgroundColor: 'rgba(20, 184, 166, 0.2)',
                color: 'var(--primary-400)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              1
            </span>
            <h2 style={{ fontSize: '1.2rem', color: '#ffffff' }}>Personal & Contact Details</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Priya Lakshmi"
                className="form-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone / WhatsApp Number *</label>
              <input
                type="tel"
                required
                placeholder="+91 98471 23456"
                className="form-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Used for sending WhatsApp onboarding link and SMS alerts.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Portal Login Email (Optional)</label>
              <input
                type="email"
                placeholder="name@agency.com (leave blank to auto-generate)"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                If left blank, an agency-scoped ID (e.g. cg_phone@subdomain.caregiver.local) will be generated.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Gender *</label>
              <select
                className="form-select"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input
                type="date"
                className="form-input"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Kerala Location & Coordinates for PostGIS Matching */}
        <div style={{ marginBottom: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <span
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                backgroundColor: 'rgba(20, 184, 166, 0.2)',
                color: 'var(--primary-400)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              2
            </span>
            <div>
              <h2 style={{ fontSize: '1.2rem', color: '#ffffff' }}>Location & Spatial Coordinates</h2>
              <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                Feeds PostGIS GiST spatial indexing for smart distance-aware customer matching.
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">District (Kerala) *</label>
              <select
                className="form-select"
                value={district}
                onChange={(e) => handleDistrictChange(e.target.value)}
              >
                {KERALA_DISTRICTS.map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">City / Town / Locality</label>
              <input
                type="text"
                placeholder="e.g. Kadavanthra / Aluva"
                className="form-input"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Pincode</label>
              <input
                type="text"
                placeholder="e.g. 682020"
                className="form-input"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
              />
            </div>

            <div className="form-group form-grid-span-2">
              <label className="form-label">Street Address</label>
              <input
                type="text"
                placeholder="House / Flat name, Street name"
                className="form-input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Latitude (GPS)</label>
              <input
                type="number"
                step="any"
                className="form-input"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value === '' ? '' : parseFloat(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Longitude (GPS)</label>
              <input
                type="number"
                step="any"
                className="form-input"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value === '' ? '' : parseFloat(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Professional Skills, Experience & Rate */}
        <div style={{ marginBottom: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <span
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                backgroundColor: 'rgba(20, 184, 166, 0.2)',
                color: 'var(--primary-400)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              3
            </span>
            <h2 style={{ fontSize: '1.2rem', color: '#ffffff' }}>Skills, Experience & Rate</h2>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label className="form-label" style={{ marginBottom: '0.75rem', display: 'block' }}>
              Clinical & Care Competencies (Click to select) *
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {AVAILABLE_SKILLS.map((skill) => {
                const selected = skills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    style={{
                      padding: '0.45rem 0.9rem',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: selected
                        ? '1px solid var(--primary-400)'
                        : '1px solid var(--border-card)',
                      backgroundColor: selected
                        ? 'rgba(20, 184, 166, 0.25)'
                        : 'rgba(255, 255, 255, 0.04)',
                      color: selected ? '#ffffff' : 'var(--text-secondary)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {selected ? '✓ ' : '+ '}
                    {skill}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Years of Experience</label>
              <input
                type="number"
                min="0"
                max="50"
                step="0.5"
                className="form-input"
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value === '' ? '' : parseFloat(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Daily Billing Rate (₹ / Day)</label>
              <input
                type="number"
                min="0"
                step="50"
                className="form-input"
                value={dailyRate}
                onChange={(e) => setDailyRate(e.target.value === '' ? '' : parseFloat(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Initial Status</label>
              <select
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <option value="available">Available</option>
                <option value="assigned">Assigned</option>
                <option value="on_leave">On Leave</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
              Spoken Languages
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {AVAILABLE_LANGUAGES.map((lang) => {
                const selected = languages.includes(lang);
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => toggleLanguage(lang)}
                    style={{
                      padding: '0.35rem 0.8rem',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      border: selected ? '1px solid var(--accent-blue)' : '1px solid var(--border-card)',
                      backgroundColor: selected ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                      color: selected ? '#ffffff' : 'var(--text-secondary)',
                    }}
                  >
                    {selected ? '✓ ' : ''}{lang}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 4: Emergency Contact & Profile Summary */}
        <div style={{ marginBottom: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <span
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                backgroundColor: 'rgba(20, 184, 166, 0.2)',
                color: 'var(--primary-400)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              4
            </span>
            <h2 style={{ fontSize: '1.2rem', color: '#ffffff' }}>Emergency Contact & Notes</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Emergency Contact Name</label>
              <input
                type="text"
                placeholder="e.g. Ramesh (Spouse / Guardian)"
                className="form-input"
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Emergency Contact Phone</label>
              <input
                type="tel"
                placeholder="+91 98471 00000"
                className="form-input"
                value={emergencyContactPhone}
                onChange={(e) => setEmergencyContactPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Professional Summary</label>
            <textarea
              rows={2}
              placeholder="e.g. 5 years nursing experience in geriatric wards, trained in feeding tube management and tracheostomy care."
              className="form-textarea"
              value={profileSummary}
              onChange={(e) => setProfileSummary(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Internal Office Notes (Staff view only)</label>
            <textarea
              rows={2}
              placeholder="Background check verified, Aadhaar copy collected, preferred shifts..."
              className="form-textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Section 5: Portal Account & Temporary Credentials Configuration */}
        <div
          style={{
            marginBottom: '2.5rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <span
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                backgroundColor: 'rgba(20, 184, 166, 0.2)',
                color: 'var(--primary-400)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              5
            </span>
            <div>
              <h2 style={{ fontSize: '1.2rem', color: '#ffffff' }}>Self-Service Portal Login Credentials</h2>
              <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                Configures the caregiver's first-time login credential generated upon creation.
              </span>
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'rgba(11, 17, 32, 0.65)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                id="auto-gen-password-checkbox"
                type="checkbox"
                checked={autoGenPassword}
                onChange={(e) => setAutoGenPassword(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary-500)', cursor: 'pointer' }}
              />
              <label htmlFor="auto-gen-password-checkbox" style={{ fontSize: '0.9rem', color: '#ffffff', cursor: 'pointer' }}>
                Auto-generate secure temporary password (e.g. Care@KRL7!)
              </label>
            </div>

            {!autoGenPassword && (
              <div className="form-group" style={{ maxWidth: '340px' }}>
                <label className="form-label">Custom Temporary Password</label>
                <input
                  type="text"
                  placeholder="Min 6 characters"
                  className="form-input"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Submit Action */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', alignItems: 'center' }}>
          <Link href="/dashboard/caregivers" className="btn-secondary">
            Cancel
          </Link>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ padding: '0.85rem 2rem', fontSize: '1rem' }}
          >
            {loading ? (
              <span>Creating Profile & Credentials...</span>
            ) : (
              <>
                <span>Save Profile & Issue Portal Login</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M5 12h14" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
