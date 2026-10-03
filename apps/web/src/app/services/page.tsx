'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Navbar from '../../components/navbar';
import Footer from '../../components/footer';

interface ServiceItem {
  id: string;
  category: 'elderly' | 'bedridden' | 'post_op' | 'dementia' | 'nursing' | 'mother_baby';
  title: string;
  badge: string;
  icon: string;
  shortDesc: string;
  targetPatient: string;
  qualification: string;
  shifts: string[];
  tasks: string[];
  rateEstimate: string;
  formServiceId: string;
}

const SERVICES_DATA: ServiceItem[] = [
  {
    id: 'elderly-care',
    category: 'elderly',
    title: 'Elderly Daily Assisted Living',
    badge: 'Most Requested',
    icon: '👵',
    shortDesc: 'Compassionate assistance with daily living activities, ensuring dignity, hygiene, and safe mobility at home.',
    targetPatient: 'Seniors living alone, experiencing mild frailty, or needing dependable daily support.',
    qualification: 'Certified Geriatric Attendant (2+ years home experience)',
    shifts: ['12-Hour Day (8 AM – 8 PM)', '12-Hour Night (8 PM – 8 AM)', '24-Hour Residential Live-in'],
    tasks: [
      'Assisted bathing, personal grooming, and oral hygiene',
      'Timely medication administration & compliance reminders',
      'Gentle mobility support, walking exercises & fall prevention',
      'Nutritious meal preparation & hydration monitoring',
      'Companionship, mental stimulation & empathetic listening',
      'Accompaniment to hospital OPD appointments & temple visits',
    ],
    rateEstimate: '₹850 – ₹1,100 / day (₹22,000 – ₹28,000 / mo)',
    formServiceId: 'elderly_care',
  },
  {
    id: 'bedridden-palliative',
    category: 'bedridden',
    title: 'Bedridden & Palliative Care',
    badge: 'High Dependency',
    icon: '🛏️',
    shortDesc: 'Comprehensive bedside nursing to prevent pressure sores, maintain skin integrity, and ensure patient comfort.',
    targetPatient: 'Completely bedridden, paralyzed, stroke recovery, or end-stage palliative care patients.',
    qualification: 'Senior Bedside Care Attendant / ANM with intensive bed-care training',
    shifts: ['12-Hour Dedicated Shift', '24-Hour Continuous Care'],
    tasks: [
      'Complete bed sponge bath, hair washing & skin moisture care',
      'Strict 2-hourly turning and positioning to avoid decubitus ulcers (bedsores)',
      'Diaper change, perineal hygiene & barrier cream application',
      'Passive limb range-of-motion physiotherapy movements',
      'Oral cavity suctioning and oral hygiene maintenance',
      'Assisted feeding via spoon, syringe, or monitoring liquid intake',
    ],
    rateEstimate: '₹1,000 – ₹1,350 / day (₹26,000 – ₹35,000 / mo)',
    formServiceId: 'bedridden_care',
  },
  {
    id: 'post-operative-rehab',
    category: 'post_op',
    title: 'Post-Operative Recovery & Rehab',
    badge: 'Clinical Supervision',
    icon: '🏥',
    shortDesc: 'Structured post-hospitalization recovery ensuring sterile surgical healing and preventing hospital readmission.',
    targetPatient: 'Patients recovering from hip/knee replacement, cardiac surgery, laparotomy, or trauma.',
    qualification: 'Registered General Nurse (GNM) or Experienced Surgical Care Specialist',
    shifts: ['8-Hour Day Shift', '12-Hour Shift', '24-Hour Continuous (15 to 45 Days)'],
    tasks: [
      'Vital signs logging (Blood Pressure, SpO2, Pulse, Temperature, Blood Glucose)',
      'Surgical wound dressing inspection & aseptic hygiene management',
      'Pain medication schedule tracking & doctor instructions adherence',
      'Incentive spirometry and deep breathing exercise assistance',
      'Safe transfer assistance (bed to walker/wheelchair)',
      'Immediate alert escalation to family for fever or abnormal vitals',
    ],
    rateEstimate: '₹1,100 – ₹1,450 / day (Flexible duration)',
    formServiceId: 'post_op',
  },
  {
    id: 'dementia-alzheimers',
    category: 'dementia',
    title: 'Dementia & Alzheimer’s Care',
    badge: 'Specialized Behavioral',
    icon: '🧠',
    shortDesc: 'Patient-centered care focusing on safety, gentle redirection, routine reinforcement, and emotional reassurance.',
    targetPatient: 'Individuals diagnosed with Alzheimer’s disease, vascular dementia, or age-related memory decline.',
    qualification: 'Caregiver with certified dementia caregiving certification and proven patience',
    shifts: ['12-Hour Day Shift', '24-Hour Residential Care'],
    tasks: [
      '24/7 supervision to prevent disorientation, exit wandering, or domestic hazards',
      'Consistent daily routine to reduce evening confusion ("sundowning")',
      'Gentle, non-confrontational redirection during agitation episodes',
      'Memory activities, sensory engagement, and music therapy',
      'Assistance with forgetting meals, hydration, or personal hygiene',
      'Family relief and caregiver respite to prevent primary caregiver burnout',
    ],
    rateEstimate: '₹1,050 – ₹1,350 / day (₹27,000 – ₹34,000 / mo)',
    formServiceId: 'dementia_care',
  },
  {
    id: 'specialized-nursing',
    category: 'nursing',
    title: 'Specialized Clinical Nursing',
    badge: 'Registered Nurses',
    icon: '🩺',
    shortDesc: 'Hospital-level clinical procedures delivered at home by licensed nurses under physician prescription.',
    targetPatient: 'Patients requiring invasive medical devices, continuous monitoring, or sterile procedures.',
    qualification: 'Registered Nurse (B.Sc Nursing / GNM with Kerala Nursing Council Registration)',
    shifts: ['Per-Procedure Visits (1–2 hrs)', '12-Hour Clinical Shift', '24-Hour Critical Home ICU'],
    tasks: [
      'Ryles Tube (Nasogastric / NG tube) insertion, maintenance & feeding',
      'Foley urinary catheterization, catheter care & bladder irrigation',
      'Intravenous (IV) fluid infusion, cannula change & IM injections',
      'Oxygen concentrator, cylinder & BiPAP/CPAP device management',
      'Tracheostomy care, cannula cleaning & sterile airway suctioning',
      'Stoma, colostomy bag replacement & peritoneal dialysis assistance',
    ],
    rateEstimate: '₹1,400 – ₹2,200 / day (or ₹450 – ₹800 per clinical visit)',
    formServiceId: 'specialized_nursing',
  },
  {
    id: 'mother-newborn-care',
    category: 'mother_baby',
    title: 'Mother & Newborn Postnatal Care',
    badge: 'Traditional & Modern',
    icon: '👶',
    shortDesc: 'Complete postnatal healing for new mothers and gentle, traditional infant massage and bathing care.',
    targetPatient: 'Post-delivery mothers (Normal or C-Section) and newborns during the first 28 to 90 days.',
    qualification: 'Certified Postnatal Maternal & Newborn Specialist (Ayurvedic & modern infant care trained)',
    shifts: ['Day Care (8 AM – 4 PM)', '24-Hour Residential Package (28 / 45 / 60 Days)'],
    tasks: [
      'Traditional herbal baby oil massage and temperature-regulated water bath',
      'Maternal postpartum recovery care, medicinal water bath & abdominal wrap',
      'Lactation support, correct latch guidance & burping techniques',
      'Sterilization of feeding bottles and infant clothes hygiene',
      'Night-time infant settling to ensure mother gets restorative sleep',
      'Nutritious Kerala traditional postpartum diet preparation assistance',
    ],
    rateEstimate: '₹1,250 – ₹1,700 / day (Custom packages available)',
    formServiceId: 'mother_baby',
  },
];

const FAQS = [
  {
    question: 'How quickly can an agency caregiver be assigned to our home?',
    answer:
      'For emergency and immediate requirements in major Kerala districts (Ernakulam, Trivandrum, Thrissur, Kozhikode, Kottayam), our office staff matches and coordinates a caregiver within 60 to 90 minutes. For scheduled dates, we confirm profiles 24–48 hours in advance.',
  },
  {
    question: 'What background checks are performed on caregivers?',
    answer:
      'Every caregiver undergoes a rigorous 4-step verification: Government Photo ID (Aadhaar/Voter ID), police criminal history verification, physical health screening, and credential validation (nursing certificate or certified care attendant training).',
  },
  {
    question: 'What happens if our assigned caregiver falls sick or needs sudden leave?',
    answer:
      'Our multi-tenant agency pool maintains active standby replacements. If a caregiver reports sick or has a family emergency, our office staff immediately mobilizes a verified replacement caregiver with matched skills so your patient is never left unattended.',
  },
  {
    question: 'Can we interview or speak with the caregiver before confirming?',
    answer:
      'Yes. Once our matching engine shortlists the best candidate based on your location, gender preference, and medical requirement, our office coordinator arranges a phone or video briefing between you and the caregiver.',
  },
  {
    question: 'Are rates fixed or do they vary by patient condition?',
    answer:
      'Base rates depend on whether care is 12-hour or 24-hour live-in. For specialized clinical procedures (such as Ryles tube, catheter, or tracheostomy), a clinical nursing fee applies. All pricing is communicated transparently upfront with zero hidden fees.',
  },
];

export default function ServicesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const filteredServices =
    selectedCategory === 'all'
      ? SERVICES_DATA
      : SERVICES_DATA.filter((s) => s.category === selectedCategory);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      <main style={{ flex: 1, padding: '2.5rem 1.5rem 5rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Header Banner */}
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <div style={{ display: 'inline-block', marginBottom: '1rem' }}>
              <span className="badge badge-teal" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
                ✦ Certified Home Healthcare Across All 14 Kerala Districts
              </span>
            </div>
            <h1
              style={{
                fontSize: 'clamp(2.2rem, 4.5vw, 3.4rem)',
                fontWeight: 800,
                color: '#ffffff',
                lineHeight: 1.15,
                marginBottom: '1rem',
              }}
            >
              Professional Home Nursing & <br />
              <span className="gradient-text">Personal Caregiver Services</span>
            </h1>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '1.1rem',
                maxWidth: '750px',
                margin: '0 auto',
                lineHeight: 1.6,
              }}
            >
              From gentle daily assistance for elderly parents to 24/7 hospital-grade clinical bedside nursing. Every caregiver is background-verified, health-screened, and managed by licensed agency coordinators.
            </p>

            {/* Category Filter Pills */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '0.5rem',
                marginTop: '2.5rem',
              }}
            >
              {[
                { id: 'all', label: 'All Services' },
                { id: 'elderly', label: '👵 Elderly Daily Care' },
                { id: 'bedridden', label: '🛏️ Bedridden & Palliative' },
                { id: 'post_op', label: '🏥 Post-Operative' },
                { id: 'dementia', label: '🧠 Dementia Support' },
                { id: 'nursing', label: '🩺 Clinical Nursing' },
                { id: 'mother_baby', label: '👶 Mother & Newborn' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  id={`filter-tab-${tab.id}`}
                  onClick={() => setSelectedCategory(tab.id)}
                  style={{
                    padding: '0.55rem 1.15rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.875rem',
                    fontWeight: selectedCategory === tab.id ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    backgroundColor:
                      selectedCategory === tab.id ? 'var(--primary-500)' : 'rgba(255, 255, 255, 0.05)',
                    color: selectedCategory === tab.id ? '#ffffff' : 'var(--text-secondary)',
                    border:
                      selectedCategory === tab.id
                        ? '1px solid var(--primary-400)'
                        : '1px solid var(--border-card)',
                    boxShadow:
                      selectedCategory === tab.id ? '0 4px 14px var(--primary-glow)' : 'none',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Services Grid */}
          <div
            id="services-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
              gap: '1.75rem',
              marginBottom: '5rem',
            }}
          >
            {filteredServices.map((service) => (
              <div
                key={service.id}
                id={`service-card-${service.id}`}
                className="feature-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  {/* Card Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      marginBottom: '1.25rem',
                    }}
                  >
                    <div className="icon-box" style={{ width: '52px', height: '52px' }}>
                      {service.icon}
                    </div>
                    <span className="badge badge-teal">{service.badge}</span>
                  </div>

                  <h2 style={{ fontSize: '1.35rem', color: '#ffffff', marginBottom: '0.5rem' }}>
                    {service.title}
                  </h2>

                  <p
                    style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.925rem',
                      lineHeight: 1.55,
                      marginBottom: '1.25rem',
                    }}
                  >
                    {service.shortDesc}
                  </p>

                  {/* Who it is for & Qualification */}
                  <div
                    style={{
                      backgroundColor: 'rgba(11, 17, 32, 0.6)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.85rem',
                      marginBottom: '1.25rem',
                      fontSize: '0.825rem',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem',
                    }}
                  >
                    <div>
                      <strong style={{ color: 'var(--text-secondary)' }}>Best For: </strong>
                      {service.targetPatient}
                    </div>
                    <div>
                      <strong style={{ color: 'var(--primary-400)' }}>Caregiver Level: </strong>
                      {service.qualification}
                    </div>
                  </div>

                  {/* Key Tasks Checklist */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        color: 'var(--text-muted)',
                        marginBottom: '0.65rem',
                      }}
                    >
                      Included Care Services:
                    </div>
                    <ul
                      style={{
                        listStyle: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {service.tasks.map((task, idx) => (
                        <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="var(--primary-400)"
                            strokeWidth="2.5"
                            style={{ flexShrink: 0, marginTop: '2px' }}
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>{task}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Card Footer: Pricing & Action */}
                <div
                  style={{
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '1.25rem',
                    marginTop: '1rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      marginBottom: '1rem',
                    }}
                  >
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Estimated Tariff</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary-400)' }}>
                      {service.rateEstimate}
                    </span>
                  </div>

                  <Link
                    href={`/?service=${service.formServiceId}#request-form`}
                    id={`book-service-${service.id}`}
                    className="btn-primary"
                    style={{ width: '100%', justifyContent: 'center', fontSize: '0.9rem' }}
                  >
                    <span>Request This Caregiver</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Caregiver Tier Matrix / Comparison Table */}
          <section
            id="care-tier-matrix"
            style={{
              marginBottom: '5rem',
              backgroundColor: 'rgba(17, 26, 46, 0.45)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-xl)',
              padding: '2.5rem 2rem',
            }}
          >
            <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 2.5rem' }}>
              <span className="badge badge-blue" style={{ marginBottom: '0.75rem' }}>
                Healthcare Skill Hierarchy
              </span>
              <h2 style={{ fontSize: '1.85rem', color: '#ffffff', marginBottom: '0.75rem' }}>
                Choosing The Right Care Level
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                Understand the clear scope of duties between our certified attendants, auxiliary nurses, and registered clinical nurses.
              </p>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  textAlign: 'left',
                  fontSize: '0.9rem',
                }}
              >
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-card)' }}>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      Care Duty / Clinical Task
                    </th>
                    <th style={{ padding: '1rem', color: '#ffffff', fontWeight: 700, width: '25%' }}>
                      <div>Geriatric Attendant</div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                        (Assisted Living / Bedside)
                      </span>
                    </th>
                    <th style={{ padding: '1rem', color: '#ffffff', fontWeight: 700, width: '25%' }}>
                      <div>Auxiliary Nurse (ANM)</div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                        (Semi-Clinical / Palliative)
                      </span>
                    </th>
                    <th style={{ padding: '1rem', color: 'var(--primary-400)', fontWeight: 700, width: '25%' }}>
                      <div>Registered Nurse (GNM/BSc)</div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--primary-400)', opacity: 0.8, fontWeight: 400 }}>
                        (Clinical Home ICU)
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { task: 'Bathing, Sponge Bath & Personal Hygiene', a: true, b: true, c: true },
                    { task: 'Bed mobility & 2-hourly bedsore prevention turning', a: true, b: true, c: true },
                    { task: 'Oral medication reminders & schedule compliance', a: true, b: true, c: true },
                    { task: 'Vital signs logging (BP, SpO2, Pulse, Temp)', a: 'Basic', b: true, c: true },
                    { task: 'Surgical wound aseptic dressing & suture care', a: false, b: 'Basic', c: true },
                    { task: 'Ryles tube feeding & NG tube management', a: false, b: true, c: true },
                    { task: 'Urinary catheter care & sterile insertion', a: false, b: true, c: true },
                    { task: 'IV infusions, cannula maintenance & IM injections', a: false, b: false, c: true },
                    { task: 'Tracheostomy care & sterile suctioning', a: false, b: false, c: true },
                  ].map((row, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        backgroundColor: idx % 2 === 0 ? 'rgba(255, 255, 255, 0.015)' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '0.95rem 1rem', color: 'var(--text-main)', fontWeight: 500 }}>
                        {row.task}
                      </td>
                      <td style={{ padding: '0.95rem 1rem' }}>
                        {renderCheck(row.a)}
                      </td>
                      <td style={{ padding: '0.95rem 1rem' }}>
                        {renderCheck(row.b)}
                      </td>
                      <td style={{ padding: '0.95rem 1rem' }}>
                        {renderCheck(row.c)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Agency Quality Pillars */}
          <section style={{ marginBottom: '5rem' }}>
            <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 3rem' }}>
              <span className="badge badge-teal" style={{ marginBottom: '0.75rem' }}>
                Why Kerala Families Rely On Us
              </span>
              <h2 style={{ fontSize: '2rem', color: '#ffffff', marginBottom: '0.75rem' }}>
                Our 4 Agency Safeguards
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                Every caregiver placement is backed by institutional oversight, not an unmonitored freelance directory.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '1.5rem',
              }}
            >
              {[
                {
                  title: '100% Police Verified',
                  desc: 'Aadhaar, biometric, and official Kerala police background certification verified before any assignment.',
                  icon: '🛡️',
                },
                {
                  title: '60-Minute Rapid Matching',
                  desc: 'Centralized database with location-aware dispatch to fulfill urgent hospital discharge requirements fast.',
                  icon: '⚡',
                },
                {
                  title: 'Guaranteed Backup Replacement',
                  desc: 'Never worry about sudden absences. Our standby agency roster ensures seamless replacement within hours.',
                  icon: '🔄',
                },
                {
                  title: 'Continuous Agency Supervision',
                  desc: 'Assigned coordinators conduct periodic supervisory check-ins with families via WhatsApp and in-person calls.',
                  icon: '📋',
                },
              ].map((pillar, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: 'rgba(17, 26, 46, 0.65)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.75rem',
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{pillar.icon}</div>
                  <h3 style={{ fontSize: '1.15rem', color: '#ffffff', marginBottom: '0.5rem' }}>
                    {pillar.title}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                    {pillar.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ Accordion */}
          <section id="services-faq" style={{ marginBottom: '5rem', maxWidth: '850px', margin: '0 auto 5rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <span className="badge badge-amber" style={{ marginBottom: '0.75rem' }}>
                Common Questions
              </span>
              <h2 style={{ fontSize: '2rem', color: '#ffffff', marginBottom: '0.75rem' }}>
                Frequently Asked Questions
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                Everything you need to know about booking, shift timing, and caregiver security.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {FAQS.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    id={`faq-item-${idx}`}
                    style={{
                      backgroundColor: 'rgba(17, 26, 46, 0.7)',
                      border: '1px solid var(--border-card)',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1.15rem 1.25rem',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#ffffff',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        textAlign: 'left',
                      }}
                    >
                      <span>{faq.question}</span>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--primary-400)"
                        strokeWidth="2.5"
                        style={{
                          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease',
                          flexShrink: 0,
                          marginLeft: '1rem',
                        }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    {isOpen && (
                      <div
                        style={{
                          padding: '0 1.25rem 1.25rem',
                          color: 'var(--text-secondary)',
                          fontSize: '0.9rem',
                          lineHeight: 1.6,
                          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                          paddingTop: '0.85rem',
                        }}
                      >
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Bottom High-Impact CTA Banner */}
          <div
            id="services-cta-banner"
            style={{
              background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.25) 0%, rgba(56, 189, 248, 0.15) 100%)',
              border: '1px solid rgba(20, 184, 166, 0.35)',
              borderRadius: 'var(--radius-xl)',
              padding: '3rem 2rem',
              textAlign: 'center',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <h2 style={{ fontSize: '2rem', color: '#ffffff', marginBottom: '0.75rem' }}>
              Need Help Deciding on the Right Care Plan?
            </h2>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '1rem',
                maxWidth: '650px',
                margin: '0 auto 2rem',
                lineHeight: 1.6,
              }}
            >
              Fill out our 2-minute Request Form or chat with our nurse coordinator directly on WhatsApp. We will match you with a certified caregiver tailored to your patient’s exact condition.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
              <Link href="/#request-form" id="services-banner-request-btn" className="btn-primary" style={{ padding: '0.85rem 1.85rem' }}>
                <span>Fill Caregiver Request Form</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
              <Link href="/contact" id="services-banner-contact-btn" className="btn-secondary" style={{ padding: '0.85rem 1.85rem' }}>
                <span>Contact Office Staff</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function renderCheck(val: boolean | string) {
  if (val === true) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#10b981', fontWeight: 600 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Full
      </span>
    );
  }
  if (val === 'Basic') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#38bdf8', fontWeight: 500 }}>
        Basic
      </span>
    );
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
      —
    </span>
  );
}
