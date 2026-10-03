export const AVAILABLE_SKILLS: string[] = [
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
  'Injection / IV',
  'Catheter Care',
  'Stroke Patient Care',
];

export const SKILL_OPTIONS: string[] = [
  'All Skills',
  ...AVAILABLE_SKILLS.slice(0, 10), // Preserves existing primary list on status board
];

export const AVAILABLE_LANGUAGES: string[] = [
  'Malayalam',
  'English',
  'Tamil',
  'Hindi',
  'Kannada',
];
