export type CaregiverStatusType = 'available' | 'assigned' | 'on_leave' | 'inactive';

export interface StatusConfigItem {
  label: string;
  description: string;
  accentColor: string;
  bgBadge: string;
  borderBadge: string;
  textColor: string;
  dotColor: string;
}

export const STATUS_CONFIG: Record<CaregiverStatusType, StatusConfigItem> = {
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

export const CAREGIVER_STATUS_LIST: CaregiverStatusType[] = [
  'available',
  'assigned',
  'on_leave',
  'inactive',
];
