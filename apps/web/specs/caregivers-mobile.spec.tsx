import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import CaregiverStatusBoardPage from '../src/app/dashboard/caregivers/page';

const mockCaregivers = [
  {
    id: 'cg-1',
    fullName: 'Anjali Menon',
    phone: '+919876543210',
    gender: 'female',
    status: 'available',
    district: 'Ernakulam',
    city: 'Kochi',
    dailyRate: 1200,
    averageRating: 4.9,
    jobsCompleted: 14,
    skills: ['Elderly Care', 'Bedridden Care'],
    documents: [{ id: 'doc-1', expiryStatus: 'valid' }],
  },
  {
    id: 'cg-2',
    fullName: 'Rahul Nair',
    phone: '+919876543211',
    gender: 'male',
    status: 'assigned',
    district: 'Thrissur',
    city: 'Thrissur Town',
    dailyRate: 1400,
    averageRating: 4.8,
    jobsCompleted: 9,
    skills: ['Post-Operative Care'],
    documents: [],
  },
];

jest.mock('../src/utils/api', () => ({
  apiFetch: jest.fn().mockImplementation((url: string) => {
    if (url.includes('status-counts')) {
      return Promise.resolve({
        total: 2,
        available: 1,
        assigned: 1,
        on_leave: 0,
        inactive: 0,
        occupancyRate: 50,
      });
    }
    return Promise.resolve({
      data: mockCaregivers,
      meta: { total: 2 },
    });
  }),
}));

describe('Caregivers Status Board - Mobile Experience', () => {
  it('renders mobile cards feed with caregiver info, skills, and 1-tap call/whatsapp buttons', async () => {
    render(<CaregiverStatusBoardPage />);

    await waitFor(() => {
      const feed = document.getElementById('mobile-caregivers-cards-feed');
      expect(feed).toBeTruthy();

      // Check phone call 1-tap action
      const callLink = document.getElementById('mobile-call-caregiver-cg-1');
      expect(callLink).toBeTruthy();
      expect(callLink?.getAttribute('href')).toBe('tel:+919876543210');

      // Check WhatsApp 1-tap action
      const waLink = document.getElementById('mobile-wa-caregiver-cg-1');
      expect(waLink).toBeTruthy();
      expect(waLink?.getAttribute('href')).toBe('https://wa.me/919876543210');
    });
  });

  it('renders mobile persistent Floating Action Button for adding new staff', async () => {
    render(<CaregiverStatusBoardPage />);

    await waitFor(() => {
      const fab = document.getElementById('mobile-caregiver-fab');
      expect(fab).toBeTruthy();
      expect(fab?.getAttribute('href')).toBe('/dashboard/caregivers/new');
      expect(fab?.textContent).toContain('Add Staff');
    });
  });

  it('allows filtering by mobile status pills (Available, Assigned, etc.)', async () => {
    render(<CaregiverStatusBoardPage />);

    await waitFor(() => {
      const tabAvailable = document.getElementById('mobile-tab-available');
      expect(tabAvailable).toBeTruthy();
      fireEvent.click(tabAvailable!);
    });

    // Anjali Menon (available) should be in feed, Rahul Nair (assigned) should be filtered out from mobile feed
    await waitFor(() => {
      const callAnjali = document.getElementById('mobile-call-caregiver-cg-1');
      expect(callAnjali).toBeTruthy();

      const callRahul = document.getElementById('mobile-call-caregiver-cg-2');
      expect(callRahul).toBeNull();
    });
  });
});
