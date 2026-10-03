import { CaregiverStatus } from '../../common/enums/caregiver-status.enum';

export interface ScoreBreakdown {
  distanceScore: number;
  skillsScore: number;
  experienceScore: number;
  genderScore: number;
}

export interface MatchedCaregiverProfile {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  gender: string;
  district?: string | null;
  city?: string | null;
  address?: string | null;
  pincode?: string | null;
  skills: string[];
  experienceYears: number;
  status: CaregiverStatus;
  dailyRate: number;
  languages: string[];
  latitude?: number | null;
  longitude?: number | null;
  profileSummary?: string | null;
  averageRating?: number;
  totalRatings?: number;
  jobsCompleted?: number;
}

export interface CaregiverMatchResultDto {
  caregiver: MatchedCaregiverProfile;
  distanceKm: number | null;
  matchScore: number; // 0 - 100
  scoreBreakdown: ScoreBreakdown;
  matchingSkills: string[];
  isAvailable: boolean;
}

export interface MatchEngineResponseDto {
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
  matches: CaregiverMatchResultDto[];
}
