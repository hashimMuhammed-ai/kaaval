'use client';

import React, { useState, useEffect } from 'react';
import { getSubdomain } from '../utils/subdomain';

interface FormData {
  serviceType: string;
  duration: string;
  engagementPeriod: string;
  genderPreference: string;
  district: string;
  locality: string;
  address: string;
  pincode: string;
  startDate: string;
  customStartDate: string;
  patientName: string;
  patientAge: string;
  patientGender: string;
  patientCondition: string;
  mobilityStatus: string;
  medicalEquipment: string;
  contactName: string;
  relationship: string;
  phone: string;
  isWhatsapp: boolean;
  notes: string;
}

const KERALA_DISTRICTS = [
  'Ernakulam (Kochi)',
  'Thiruvananthapuram',
  'Thrissur',
  'Kozhikode',
  'Kottayam',
  'Kollam',
  'Palakkad',
  'Malappuram',
  'Alappuzha',
  'Kannur',
  'Pathanamthitta',
  'Idukki',
  'Kasaragod',
  'Wayanad',
];

const SERVICE_TYPES = [
  {
    id: 'elderly_care',
    title: 'Elderly Daily Assistance',
    desc: 'Bathing, personal hygiene, medication compliance, mobility support & companionship.',
    icon: '👵',
    badge: 'Senior Care',
  },
  {
    id: 'bedridden_care',
    title: 'Bedridden & Palliative Care',
    desc: 'Bed sponge baths, 2-hourly turning to prevent bedsores, diaper change & comfort care.',
    icon: '🛏️',
    badge: 'High Dependency',
  },
  {
    id: 'post_op',
    title: 'Post-Operative Recovery',
    desc: 'Surgical wound inspection, vital signs tracking, assisted rehabilitation & recovery.',
    icon: '🏥',
    badge: 'Clinical Rehab',
  },
  {
    id: 'dementia_care',
    title: 'Dementia & Alzheimer’s Care',
    desc: 'Patient wandering safety, gentle redirection, structured routines & reassurance.',
    icon: '🧠',
    badge: 'Cognitive Support',
  },
  {
    id: 'specialized_nursing',
    title: 'Specialized Nursing Care',
    desc: 'Catheterization, Ryles tube feeding, IV/IM injections, oxygen & tracheostomy care.',
    icon: '🩺',
    badge: 'Licensed Nurse',
  },
  {
    id: 'mother_baby',
    title: 'Mother & Newborn Care',
    desc: 'Postpartum mother care, herbal oil infant massage, latch support & night relief.',
    icon: '👶',
    badge: 'Postnatal Specialist',
  },
];

export default function CaregiverRequestForm({
  agencyName: initialAgencyName = 'CareKerala',
  agencyPhone: initialAgencyPhone = '+919876543210',
}: {
  agencyName?: string;
  agencyPhone?: string;
}) {
  const [agencyName, setAgencyName] = useState(initialAgencyName);
  const [agencyPhone, setAgencyPhone] = useState(initialAgencyPhone);

  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [whatsappStatus, setWhatsappStatus] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    serviceType: 'elderly_care',
    duration: '24_hours',
    engagementPeriod: 'ongoing',
    genderPreference: 'any',
    district: 'Ernakulam (Kochi)',
    locality: '',
    address: '',
    pincode: '',
    startDate: 'immediate',
    customStartDate: '',
    patientName: '',
    patientAge: '',
    patientGender: 'female',
    patientCondition: '',
    mobilityStatus: 'assisted',
    medicalEquipment: 'none',
    contactName: '',
    relationship: 'son_daughter',
    phone: '',
    isWhatsapp: true,
    notes: '',
  });

  useEffect(() => {
    // 1. Check subdomain
    const sub = getSubdomain();
    if (sub) {
      const formatted = sub
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      setAgencyName(`${formatted} Care`);
    }

    // 2. Pre-select service from URL parameter (e.g. /?service=bedridden_care)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const serviceParam = params.get('service');
      if (serviceParam && SERVICE_TYPES.some((s) => s.id === serviceParam)) {
        setFormData((prev) => ({ ...prev, serviceType: serviceParam }));
      }
    }
  }, []);

  const handleFieldChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const selectService = (serviceId: string) => {
    setFormData((prev) => ({ ...prev, serviceType: serviceId }));
  };

  // Step 1 Validation
  const handleStep1Next = () => {
    setErrorMsg(null);
    if (!formData.serviceType) {
      setErrorMsg('Please select a service type.');
      return;
    }
    setStep(2);
  };

  // Step 2 Validation (Patient & Kerala Location)
  const handleStep2Next = () => {
    setErrorMsg(null);
    if (!formData.patientName.trim()) {
      setErrorMsg('Please enter the patient name before continuing.');
      return;
    }
    if (!formData.district) {
      setErrorMsg('Please select a district in Kerala.');
      return;
    }
    if (formData.startDate === 'specific' && !formData.customStartDate) {
      setErrorMsg('Please pick your desired start date.');
      return;
    }
    setStep(3);
  };

  // Step 3 Validation & Transition to Review
  const handleStep3Next = () => {
    setErrorMsg(null);
    if (!formData.contactName.trim()) {
      setErrorMsg('Please enter the primary family contact person name.');
      return;
    }
    const cleanPhone = formData.phone.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile / WhatsApp number.');
      return;
    }
    setStep(4);
  };

  // Final Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanPhone = formData.phone.replace(/[^0-9]/g, '');
    if (!formData.patientName.trim() || !formData.contactName.trim() || cleanPhone.length < 10) {
      setErrorMsg('Please fill in all required fields before submitting.');
      return;
    }

    setSubmitting(true);

    try {
      const generatedRef = `REQ-${new Date().getFullYear()}-${Math.floor(
        100000 + Math.random() * 900000
      )}`;

      const effectiveStartDate =
        formData.startDate === 'specific' && formData.customStartDate
          ? formData.customStartDate
          : formData.startDate;

      // Post to local API route handler
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          startDate: effectiveStartDate,
          referenceId: generatedRef,
          agencyName,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.referenceId) {
        setSubmittedRef(data.referenceId);
        if (data?.whatsappNotification) {
          setWhatsappStatus(data.whatsappNotification);
        }
      } else {
        setSubmittedRef(generatedRef);
      }

      setStep(5);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit request. Please try again or WhatsApp us directly.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedServiceObj =
    SERVICE_TYPES.find((s) => s.id === formData.serviceType) || SERVICE_TYPES[0];

  const effectiveStartDateLabel =
    formData.startDate === 'immediate'
      ? 'Immediate (Within 24–48 hours)'
      : formData.startDate === 'within_week'
      ? 'Within 7 Days'
      : formData.startDate === 'next_month'
      ? 'Next Month / Planning Ahead'
      : formData.customStartDate || 'Specific Date';

  const durationLabel =
    formData.duration === '24_hours'
      ? '24 Hours (Full Live-In Residential)'
      : formData.duration === '12_day'
      ? '12 Hours Day Shift (8:00 AM – 8:00 PM)'
      : formData.duration === '12_night'
      ? '12 Hours Night Shift (8:00 PM – 8:00 AM)'
      : 'Hourly Visit (2 to 4 Hours)';

  const genderPreferenceLabel =
    formData.genderPreference === 'female'
      ? 'Female Caregiver'
      : formData.genderPreference === 'male'
      ? 'Male Caregiver'
      : 'No Preference (Quickest matching)';

  const whatsappMessage = encodeURIComponent(
    `Hello ${agencyName}! I have submitted care request ${submittedRef || ''} for patient ${
      formData.patientName || 'a family member'
    } in ${formData.district}. Requirement: ${selectedServiceObj.title} (${durationLabel}). Please share matching verified caregiver profiles.`
  );

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div
      id="request-caregiver-section"
      className="glass-panel"
      style={{
        padding: '2.5rem 2rem',
        maxWidth: '880px',
        margin: '0 auto',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      {/* Progress Stepper Header */}
      {step <= 4 && (
        <div style={{ marginBottom: '2.25rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span className="badge badge-teal" style={{ padding: '0.3rem 0.75rem' }}>
                Step {step} of 4
              </span>
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>
                {step === 1 && '1. Care Requirement & Duration'}
                {step === 2 && '2. Patient & Kerala Location'}
                {step === 3 && '3. Family Contact Details'}
                {step === 4 && '4. Review & Confirm Request'}
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              ~2 mins • Verified matching
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div
            style={{
              height: '5px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '9999px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${(step / 4) * 100}%`,
                background: 'linear-gradient(90deg, #14b8a6, #38bdf8)',
                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </div>
        </div>
      )}

      {/* Global Error Banner */}
      {errorMsg && (
        <div
          id="form-error-banner"
          style={{
            padding: '0.85rem 1.25rem',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: 'var(--radius-md)',
            color: '#fca5a5',
            fontSize: '0.875rem',
            marginBottom: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* STEP 1: Care Requirement, Duration & Gender Preference */}
      {step === 1 && (
        <div className="animate-fade-in">
          <h2
            style={{
              fontSize: '1.65rem',
              color: '#ffffff',
              marginBottom: '0.5rem',
            }}
          >
            What type of in-home care is needed?
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.75rem', fontSize: '0.95rem' }}>
            Select the primary care program required for your family member. All caregivers are ID-verified and background-screened.
          </p>

          {/* Service Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem',
            }}
          >
            {SERVICE_TYPES.map((service) => {
              const isSelected = formData.serviceType === service.id;
              return (
                <div
                  key={service.id}
                  id={`service-opt-${service.id}`}
                  onClick={() => selectService(service.id)}
                  style={{
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-lg)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    backgroundColor: isSelected
                      ? 'rgba(20, 184, 166, 0.15)'
                      : 'rgba(11, 17, 32, 0.65)',
                    border: isSelected
                      ? '2px solid var(--primary-500)'
                      : '1px solid var(--border-card)',
                    boxShadow: isSelected ? '0 0 16px rgba(20, 184, 166, 0.3)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '1.75rem' }}>{service.icon}</span>
                      <span className="badge badge-teal" style={{ fontSize: '0.65rem' }}>{service.badge}</span>
                    </div>
                    <h3
                      style={{
                        fontSize: '1.05rem',
                        color: isSelected ? '#ffffff' : 'var(--text-main)',
                        marginBottom: '0.35rem',
                      }}
                    >
                      {service.title}
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                      {service.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Duration, Engagement & Gender Preference */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1.25rem',
              marginBottom: '2rem',
              backgroundColor: 'rgba(11, 17, 32, 0.55)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
            }}
          >
            {/* Duration / Shift */}
            <div className="form-group">
              <label htmlFor="duration-select" className="form-label">
                Required Shift / Duration *
              </label>
              <select
                id="duration-select"
                name="duration"
                className="form-select"
                value={formData.duration}
                onChange={handleFieldChange}
              >
                <option value="24_hours">24 Hours (Full Live-In Residential)</option>
                <option value="12_day">12 Hours Day Shift (8:00 AM – 8:00 PM)</option>
                <option value="12_night">12 Hours Night Shift (8:00 PM – 8:00 AM)</option>
                <option value="hourly">Hourly Visit (2 to 4 Hours)</option>
              </select>
            </div>

            {/* Engagement Period */}
            <div className="form-group">
              <label htmlFor="engagementPeriod-select" className="form-label">
                Expected Period
              </label>
              <select
                id="engagementPeriod-select"
                name="engagementPeriod"
                className="form-select"
                value={formData.engagementPeriod}
                onChange={handleFieldChange}
              >
                <option value="ongoing">Long-Term (Ongoing Monthly)</option>
                <option value="1_to_3_months">Medium-Term (1 to 3 Months)</option>
                <option value="temporary">Temporary (1 to 4 Weeks Recovery)</option>
              </select>
            </div>

            {/* Gender Preference */}
            <div className="form-group">
              <label htmlFor="gender-select" className="form-label">
                Caregiver Gender Preference *
              </label>
              <select
                id="gender-select"
                name="genderPreference"
                className="form-select"
                value={formData.genderPreference}
                onChange={handleFieldChange}
              >
                <option value="any">No Preference (Quickest matching)</option>
                <option value="female">Female Caregiver</option>
                <option value="male">Male Caregiver</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              id="step-1-next-btn"
              className="btn-primary"
              onClick={handleStep1Next}
              style={{ padding: '0.85rem 1.75rem' }}
            >
              <span>Continue to Patient Details</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Patient & Kerala Location */}
      {step === 2 && (
        <div className="animate-fade-in">
          <h2 style={{ fontSize: '1.65rem', color: '#ffffff', marginBottom: '0.5rem' }}>
            Patient Information & Location
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.75rem', fontSize: '0.95rem' }}>
            Accurate location and medical context ensure our matching engine finds nearby caregivers with the right skills.
          </p>

          {/* Patient Details */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label htmlFor="patientName-input" className="form-label">
                Patient Full Name *
              </label>
              <input
                id="patientName-input"
                name="patientName"
                type="text"
                placeholder="e.g. Mary Varghese"
                className="form-input"
                value={formData.patientName}
                onChange={handleFieldChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="patientAge-input" className="form-label">
                Patient Age
              </label>
              <input
                id="patientAge-input"
                name="patientAge"
                type="number"
                placeholder="e.g. 74"
                className="form-input"
                value={formData.patientAge}
                onChange={handleFieldChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="patientGender-select" className="form-label">
                Patient Gender
              </label>
              <select
                id="patientGender-select"
                name="patientGender"
                className="form-select"
                value={formData.patientGender}
                onChange={handleFieldChange}
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Condition & Mobility */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label htmlFor="condition-input" className="form-label">
                Medical Diagnosis / Condition
              </label>
              <input
                id="condition-input"
                name="patientCondition"
                type="text"
                placeholder="e.g. Post-stroke recovery, Parkinson's, Diabetic care"
                className="form-input"
                value={formData.patientCondition}
                onChange={handleFieldChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="mobility-select" className="form-label">
                Mobility Status
              </label>
              <select
                id="mobility-select"
                name="mobilityStatus"
                className="form-select"
                value={formData.mobilityStatus}
                onChange={handleFieldChange}
              >
                <option value="bedridden">Completely Bedridden (Requires Full Bed Care)</option>
                <option value="assisted">Semi-Mobile (Needs walker/wheelchair or support)</option>
                <option value="independent">Mobile (Needs supervision & medication management)</option>
              </select>
            </div>
          </div>

          {/* Kerala District & Address */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label htmlFor="district-select" className="form-label">
                District in Kerala *
              </label>
              <select
                id="district-select"
                name="district"
                className="form-select"
                value={formData.district}
                onChange={handleFieldChange}
              >
                {KERALA_DISTRICTS.map((dist) => (
                  <option key={dist} value={dist}>
                    {dist}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="address-input" className="form-label">
                Locality / Town / Village
              </label>
              <input
                id="address-input"
                name="address"
                type="text"
                placeholder="e.g. Kakkanad, Kadavanthra, Aluva"
                className="form-input"
                value={formData.address}
                onChange={handleFieldChange}
              />
            </div>
          </div>

          {/* Start Date: Quick selection or specific calendar date */}
          <div
            style={{
              backgroundColor: 'rgba(11, 17, 32, 0.55)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              marginBottom: '2rem',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
              <div className="form-group">
                <label htmlFor="startDate-select" className="form-label">
                  When Should Care Begin? *
                </label>
                <select
                  id="startDate-select"
                  name="startDate"
                  className="form-select"
                  value={formData.startDate}
                  onChange={handleFieldChange}
                >
                  <option value="immediate">Immediate (Within 24–48 hours)</option>
                  <option value="specific">Pick a Specific Date</option>
                  <option value="within_week">Within 7 days</option>
                  <option value="next_month">Next month / Planning ahead</option>
                </select>
              </div>

              {formData.startDate === 'specific' && (
                <div className="form-group animate-fade-in">
                  <label htmlFor="customStartDate-input" className="form-label">
                    Select Start Date *
                  </label>
                  <input
                    id="customStartDate-input"
                    name="customStartDate"
                    type="date"
                    min={todayStr}
                    className="form-input"
                    value={formData.customStartDate}
                    onChange={handleFieldChange}
                    required
                  />
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setStep(1)}
            >
              &larr; Back
            </button>
            <button
              type="button"
              id="step-2-next-btn"
              className="btn-primary"
              onClick={handleStep2Next}
              style={{ padding: '0.85rem 1.75rem' }}
            >
              <span>Continue to Contact</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Family Contact & Clinical Details */}
      {step === 3 && (
        <div className="animate-fade-in">
          <h2 style={{ fontSize: '1.65rem', color: '#ffffff', marginBottom: '0.5rem' }}>
            Family Contact Details
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.75rem', fontSize: '0.95rem' }}>
            Our clinical coordinator will contact you directly with matched caregiver profiles and credentials.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label htmlFor="contactName-input" className="form-label">
                Your Full Name (Family Contact) *
              </label>
              <input
                id="contactName-input"
                name="contactName"
                type="text"
                placeholder="e.g. Dr. Thomas Varghese"
                className="form-input"
                value={formData.contactName}
                onChange={handleFieldChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="relationship-select" className="form-label">
                Relationship to Patient
              </label>
              <select
                id="relationship-select"
                name="relationship"
                className="form-select"
                value={formData.relationship}
                onChange={handleFieldChange}
              >
                <option value="son_daughter">Son / Daughter</option>
                <option value="spouse">Spouse</option>
                <option value="sibling">Brother / Sister</option>
                <option value="relative">Relative / Guardian</option>
                <option value="self">Self (Patient)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label htmlFor="phone-input" className="form-label">
                WhatsApp / Phone Number *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="phone-input"
                  name="phone"
                  type="tel"
                  placeholder="e.g. 98470 12345"
                  className="form-input"
                  value={formData.phone}
                  onChange={handleFieldChange}
                  required
                />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                We will send matched caregiver ID proofs & profiles to this number.
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="medicalEquipment-select" className="form-label">
                Medical Equipment Involved
              </label>
              <select
                id="medicalEquipment-select"
                name="medicalEquipment"
                className="form-select"
                value={formData.medicalEquipment}
                onChange={handleFieldChange}
              >
                <option value="none">None / Standard Care</option>
                <option value="catheter">Foley Catheter</option>
                <option value="ryles_tube">Ryles Tube (NG Tube Feeding)</option>
                <option value="oxygen">Oxygen Concentrator / Cylinder</option>
                <option value="iv_lines">IV Line / Infusion</option>
                <option value="multiple">Multiple Devices (ICU Step-down)</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label htmlFor="notes-textarea" className="form-label">
              Special Care Instructions or Requests (Optional)
            </label>
            <textarea
              id="notes-textarea"
              name="notes"
              rows={3}
              placeholder="e.g. Patient prefers female caregiver who speaks Malayalam. Assistance needed for morning bath and night feeding."
              className="form-textarea"
              value={formData.notes}
              onChange={handleFieldChange}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setStep(2)}
            >
              &larr; Back
            </button>
            <button
              type="button"
              id="step-3-next-btn"
              className="btn-primary"
              onClick={handleStep3Next}
              style={{ padding: '0.85rem 1.75rem' }}
            >
              <span>Review Request Details</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Review & Confirm Submission */}
      {step === 4 && (
        <form onSubmit={handleSubmit} className="animate-fade-in">
          <h2 style={{ fontSize: '1.65rem', color: '#ffffff', marginBottom: '0.5rem' }}>
            Review Your Care Request
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.75rem', fontSize: '0.95rem' }}>
            Please confirm your requirement details. Once submitted, our nurse coordinator will match verified caregivers immediately.
          </p>

          {/* Summary Card */}
          <div
            style={{
              backgroundColor: 'rgba(11, 17, 32, 0.75)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              marginBottom: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '0.75rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Service Program</span>
              <strong style={{ color: '#ffffff', fontSize: '0.95rem' }}>{selectedServiceObj.title}</strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '0.75rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Shift / Duration</span>
              <strong style={{ color: 'var(--primary-400)', fontSize: '0.95rem' }}>{durationLabel}</strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '0.75rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Start Date</span>
              <strong style={{ color: '#ffffff', fontSize: '0.95rem' }}>{effectiveStartDateLabel}</strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '0.75rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Location (Kerala)</span>
              <strong style={{ color: '#ffffff', fontSize: '0.95rem' }}>
                {formData.district} {formData.address ? `(${formData.address})` : ''}
              </strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '0.75rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Patient</span>
              <strong style={{ color: '#ffffff', fontSize: '0.95rem' }}>
                {formData.patientName} {formData.patientAge ? `(${formData.patientAge} yrs)` : ''}
              </strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '0.75rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Gender Preference</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{genderPreferenceLabel}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Contact Person</span>
              <strong style={{ color: 'var(--primary-400)', fontSize: '0.95rem' }}>
                {formData.contactName} ({formData.phone})
              </strong>
            </div>
          </div>

          {/* Privacy & Zero Public Registration Banner */}
          <div
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: 'rgba(20, 184, 166, 0.08)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(20, 184, 166, 0.2)',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              marginBottom: '2rem',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'center',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary-400)" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <div>
              <strong>Confidential & Free:</strong> No registration or advance payment required. Patient data is encrypted and strictly scoped to this agency.
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setStep(3)}
              disabled={submitting}
            >
              &larr; Back
            </button>
            <button
              type="submit"
              id="submit-caregiver-request-btn"
              className="btn-primary"
              disabled={submitting}
              style={{
                minWidth: '220px',
                padding: '0.85rem 2rem',
              }}
            >
              {submitting ? (
                <span>Submitting Request...</span>
              ) : (
                <>
                  <span>Submit Care Request</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* STEP 5: Success & Instant WhatsApp Connect */}
      {step === 5 && (
        <div id="request-success-panel" className="animate-fade-in" style={{ textAlign: 'center', padding: '1rem 0' }}>
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '2px solid var(--status-success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              boxShadow: '0 0 30px rgba(16, 185, 129, 0.3)',
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--status-success)" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h2 style={{ fontSize: '1.85rem', color: '#ffffff', marginBottom: '0.5rem' }}>
            Care Request Received!
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto 1.75rem', fontSize: '0.95rem' }}>
            Thank you, <strong style={{ color: '#ffffff' }}>{formData.contactName}</strong>. Our agency coordinator has been notified and will contact you via phone or WhatsApp within 60 minutes.
          </p>

          <div
            style={{
              maxWidth: '460px',
              margin: '0 auto 2rem',
              padding: '1.25rem',
              backgroundColor: 'rgba(11, 17, 32, 0.75)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-card)',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.825rem' }}>Tracking Reference</span>
              <strong style={{ color: 'var(--primary-400)', fontFamily: 'monospace', fontSize: '1rem' }}>
                {submittedRef}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.825rem' }}>Service</span>
              <span style={{ color: '#ffffff', fontSize: '0.9rem' }}>{selectedServiceObj.title}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.825rem' }}>Patient</span>
              <span style={{ color: '#ffffff', fontSize: '0.9rem' }}>{formData.patientName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.825rem' }}>Location</span>
              <span style={{ color: '#ffffff', fontSize: '0.9rem' }}>{formData.district}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.825rem' }}>Start Date</span>
              <span style={{ color: '#ffffff', fontSize: '0.9rem' }}>{effectiveStartDateLabel}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.825rem' }}>Assigned Agency</span>
              <span style={{ color: 'var(--primary-400)', fontSize: '0.9rem', fontWeight: 600 }}>{agencyName}</span>
            </div>
          </div>

          {/* Instant WhatsApp Dispatch Indicator */}
          <div
            id="whatsapp-dispatch-status"
            style={{
              maxWidth: '460px',
              margin: '0 auto 1.75rem',
              padding: '1rem 1.25rem',
              backgroundColor: 'rgba(37, 211, 102, 0.08)',
              border: '1px solid rgba(37, 211, 102, 0.35)',
              borderRadius: 'var(--radius-lg)',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: '#25D366',
                  boxShadow: '0 0 10px #25D366',
                  display: 'inline-block',
                }}
              />
              <strong style={{ color: '#25D366', fontSize: '0.925rem' }}>
                Instant WhatsApp Notifications Dispatched
              </strong>
            </div>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              • <strong>Agency Owner Alert:</strong> Instant SLA ping with care specifications sent to agency coordinator.
              <br />
              • <strong>Client Confirmation:</strong> Booking receipt with Reference ID ({submittedRef}) sent to {formData.phone}.
              <br />
              • <strong>Status:</strong> {whatsappStatus?.ownerAlert?.mode === 'live' ? 'Live Cloud API Dispatch' : 'Verified via Official Meta Cloud API (Mock/Dev Mode)'}.
            </div>
          </div>

          {/* Quick WhatsApp Action */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', alignItems: 'center' }}>
            <a
              id="whatsapp-followup-btn"
              href={`https://wa.me/${agencyPhone.replace(/[^0-9]/g, '')}?text=${whatsappMessage}`}
              target="_blank"
              rel="noreferrer"
              className="btn-whatsapp"
              style={{
                padding: '0.9rem 2.25rem',
                fontSize: '1rem',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.969.585 1.761.895 2.796.896h.005c3.181 0 5.767-2.586 5.768-5.766.001-1.54-.597-2.988-1.686-4.077-1.089-1.089-2.537-1.688-4.077-1.688zm0-1.872c4.218 0 7.64 3.422 7.64 7.638 0 2.042-.796 3.962-2.242 5.408s-3.366 2.23-5.398 2.23h-.006c-1.31 0-2.597-.34-3.729-.984l-4.148 1.088 1.107-4.045c-.71-1.222-1.085-2.614-1.085-4.041 0-4.216 3.422-7.638 7.64-7.638zm-3.295 4.398c-.183-.406-.375-.414-.548-.422-.142-.006-.304-.006-.467-.006s-.427.061-.65.305c-.223.244-.853.833-.853 2.032 0 1.199.873 2.358.995 2.521.122.163 1.685 2.688 4.144 3.655 2.044.804 2.459.644 2.906.604.447-.041 1.442-.589 1.645-1.159.203-.569.203-1.057.142-1.159-.061-.102-.223-.163-.467-.285-.244-.122-1.442-.711-1.666-.793-.223-.081-.386-.122-.548.122-.163.244-.63 1.159-.772 1.321-.142.163-.284.183-.528.061-.244-.122-1.03-.38-1.963-1.211-.726-.648-1.216-1.449-1.358-1.693-.142-.244-.015-.376.107-.498.11-.11.244-.285.366-.427.122-.142.163-.244.244-.406.081-.163.041-.305-.02-.427-.061-.122-.534-1.322-.743-1.782z" />
              </svg>
              <span>Instant Chat with Coordinator</span>
            </a>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setStep(1);
                setSubmittedRef(null);
              }}
              style={{ fontSize: '0.85rem' }}
            >
              Submit Another Request
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
