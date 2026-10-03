export type CaregiverDocumentType =
  | 'nursing_certificate'
  | 'aadhaar'
  | 'police_clearance'
  | 'experience_certificate'
  | 'cpr_first_aid'
  | 'medical_fitness'
  | 'other';

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  nursing_certificate: 'Nursing Council Certificate',
  aadhaar: 'Aadhaar / Photo ID',
  police_clearance: 'Police Clearance (PCC)',
  experience_certificate: 'Experience Certificate',
  cpr_first_aid: 'CPR & First Aid (BLS)',
  medical_fitness: 'Medical Fitness Certificate',
  other: 'Other Supporting Document',
};

export const DEFAULT_DOC_TITLES: Record<string, string> = {
  nursing_certificate: 'Kerala Nursing Council Registration',
  aadhaar: 'Aadhaar Card Front & Back',
  police_clearance: 'Kerala Police Clearance Certificate',
  experience_certificate: 'Caregiver Experience Certificate',
  cpr_first_aid: 'CPR & Basic Life Support Certificate',
  medical_fitness: 'Medical Fitness Certificate',
  other: 'Supporting Document',
};

export const DOCUMENT_TYPE_OPTIONS = Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => ({
  value: value as CaregiverDocumentType,
  label,
  defaultTitle: DEFAULT_DOC_TITLES[value] || label,
}));
