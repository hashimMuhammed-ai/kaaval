import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SmartMatchingPage from '../src/app/dashboard/matching/page';
import { apiFetch } from '../src/utils/api';

jest.mock('../src/utils/api', () => ({
  apiFetch: jest.fn(),
}));

// Mock Next.js navigation hooks
const mockPush = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => mockSearchParams,
}));

describe('Smart Matching UI Component', () => {
  const mockMatchResponse = {
    targetLocation: {
      latitude: 10.0159,
      longitude: 76.3419,
      source: 'geocoded_kerala_database',
      displayName: 'Kakkanad, Ernakulam, Kerala',
    },
    searchCriteria: {
      radiusKm: 25,
      gender: 'any',
      minExperienceYears: 0,
      requiredSkills: [],
      statusFilter: 'available',
    },
    totalMatches: 2,
    matches: [
      {
        caregiver: {
          id: 'cg-1',
          fullName: 'Sunitha Kumari',
          phone: '+919847111222',
          gender: 'female',
          district: 'Ernakulam',
          city: 'Kakkanad',
          skills: ['Elderly Care', 'Bedridden Care'],
          experienceYears: 5,
          status: 'available',
          dailyRate: 1200,
          languages: ['Malayalam', 'English'],
          latitude: 10.0159,
          longitude: 76.3419,
        },
        distanceKm: 3.45,
        matchScore: 94,
        scoreBreakdown: {
          distanceScore: 40,
          skillsScore: 30,
          experienceScore: 14,
          genderScore: 10,
        },
        matchingSkills: ['Elderly Care'],
        isAvailable: true,
      },
      {
        caregiver: {
          id: 'cg-2',
          fullName: 'Biju George',
          phone: '+919847333444',
          gender: 'male',
          district: 'Ernakulam',
          city: 'Aluva',
          skills: ['Dementia Care'],
          experienceYears: 8,
          status: 'assigned',
          dailyRate: 1400,
          languages: ['Malayalam'],
          latitude: 10.1076,
          longitude: 76.3516,
        },
        distanceKm: 12.8,
        matchScore: 78,
        scoreBreakdown: {
          distanceScore: 28,
          skillsScore: 20,
          experienceScore: 20,
          genderScore: 10,
        },
        matchingSkills: [],
        isAvailable: false,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    (apiFetch as jest.Mock).mockImplementation(async (endpoint: string) => {
      if (endpoint.startsWith('/matching')) {
        return mockMatchResponse;
      }
      return null;
    });
  });

  it('should render the Smart Matching Engine header and filter panel', async () => {
    render(<SmartMatchingPage />);

    expect(
      screen.getByRole('heading', { name: /Smart Caregiver Matching Engine/i })
    ).toBeTruthy();
    expect(screen.getByText(/PostGIS GiST spatial queries/i)).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('Matching Filters')).toBeTruthy();
      expect(screen.getByText(/Kerala District/i)).toBeTruthy();
      expect(screen.getByText(/Spatial Radius/i)).toBeTruthy();
      expect(screen.getByText(/Min Experience/i)).toBeTruthy();
      expect(screen.getByText(/Care Competencies & Skills/i)).toBeTruthy();
    });
  });

  it('should display match results with distance, experience, availability, and score', async () => {
    render(<SmartMatchingPage />);

    await waitFor(() => {
      // 1. Verify Caregiver Names
      expect(screen.getByText('Sunitha Kumari')).toBeTruthy();
      expect(screen.getByText('Biju George')).toBeTruthy();

      // 2. Verify Distance display via PostGIS GiST
      expect(screen.getByText('3.45 km')).toBeTruthy();
      expect(screen.getByText('12.8 km')).toBeTruthy();

      // 3. Verify Experience display
      expect(screen.getByText(/5 years/i)).toBeTruthy();
      expect(screen.getByText(/8 years/i)).toBeTruthy();

      // 4. Verify Availability status indicators
      expect(screen.getByText('Available')).toBeTruthy();
      expect(screen.getByText('Assigned')).toBeTruthy();

      // 5. Verify Match Score and score breakdown
      expect(screen.getByText('94%')).toBeTruthy();
      expect(screen.getByText(/Distance: 40\/40/i)).toBeTruthy();
    });
  });

  it('should allow changing search radius and trigger updated matching query', async () => {
    render(<SmartMatchingPage />);

    await waitFor(() => {
      expect(screen.getByText('Sunitha Kumari')).toBeTruthy();
    });

    const btn50km = screen.getByRole('button', { name: '50 km' });
    expect(btn50km).toBeTruthy();

    fireEvent.click(btn50km);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining('radiusKm=50')
      );
    });
  });

  it('should render scoped context banner when requestId is present in searchParams', async () => {
    mockSearchParams = new URLSearchParams('requestId=req-12345');

    (apiFetch as jest.Mock).mockImplementation(async (endpoint: string) => {
      if (endpoint === '/requests/req-12345') {
        return {
          data: {
            id: 'req-12345',
            referenceId: 'REQ-2026-12345',
            patientName: 'Devaki Amma',
            district: 'Ernakulam',
            locality: 'Kakkanad',
            serviceType: 'Elderly Care',
            genderPreference: 'female',
          },
        };
      }
      if (endpoint.startsWith('/matching')) {
        return mockMatchResponse;
      }
      return null;
    });

    render(<SmartMatchingPage />);

    await waitFor(() => {
      expect(screen.getByText(/Scoped To Intake Request/i)).toBeTruthy();
      expect(screen.getByText(/Devaki Amma/i)).toBeTruthy();
      expect(screen.getByText(/REQ-2026-12345/i)).toBeTruthy();
    });
  });

  it('should render replacement match mode banner and handle replacement assignment when assignmentId is present', async () => {
    mockSearchParams = new URLSearchParams('assignmentId=asgn-12345');

    window.confirm = jest.fn().mockReturnValue(true);

    (apiFetch as jest.Mock).mockImplementation(async (endpoint: string, options?: any) => {
      if (endpoint === '/assignments/asgn-12345') {
        return {
          data: {
            id: 'asgn-12345',
            caregiverId: 'cg-current',
            caregiver: {
              id: 'cg-current',
              fullName: 'Previous Caregiver',
            },
            customer: {
              id: 'cust-123',
              patientName: 'Devaki Amma',
              district: 'Ernakulam',
              locality: 'Kakkanad',
              serviceType: 'Elderly Care',
              genderPreference: 'female',
            },
          },
        };
      }
      if (endpoint.startsWith('/matching')) {
        return mockMatchResponse;
      }
      if (endpoint === '/assignments/asgn-12345/replace') {
        return { success: true };
      }
      return null;
    });

    render(<SmartMatchingPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/Replacement Match Mode: Scoped To Assignment Replacement/i)
      ).toBeTruthy();
      expect(screen.getByText(/Previous Caregiver/i)).toBeTruthy();
      expect(screen.getByText(/Devaki Amma/i)).toBeTruthy();
    });

    // Verify "Assign as Replacement" button is rendered
    await waitFor(() => {
      const btns = screen.getAllByRole('button', { name: /Assign as Replacement/i });
      expect(btns.length).toBeGreaterThan(0);
    });

    const replaceBtns = screen.getAllByRole('button', { name: /Assign as Replacement/i });
    // Click assign as replacement
    fireEvent.click(replaceBtns[0]);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/assignments/asgn-12345/replace',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"replacementCaregiverId":"cg-1"'),
        })
      );
    });
  });

  it('should render empty state when zero matches are returned', async () => {
    (apiFetch as jest.Mock).mockResolvedValueOnce({
      targetLocation: { latitude: 10.0, longitude: 76.3, source: 'test' },
      searchCriteria: { radiusKm: 10, gender: 'female', minExperienceYears: 5, requiredSkills: [] },
      totalMatches: 0,
      matches: [],
    });

    render(<SmartMatchingPage />);

    await waitFor(() => {
      expect(screen.getByText(/No Caregivers Matched Within/i)).toBeTruthy();
      expect(screen.getByRole('button', { name: /Expand Radius to 50 km/i })).toBeTruthy();
    });
  });
});
