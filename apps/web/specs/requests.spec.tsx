import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DashboardRequestsPage from '../src/app/dashboard/requests/page';

// Mock apiFetch
jest.mock('../src/utils/api', () => ({
  apiFetch: jest.fn().mockResolvedValue({
    success: true,
    data: [
      {
        id: 'test-req-1',
        referenceId: 'REQ-2026-894102',
        patientName: 'Mary Varghese',
        patientAge: '78',
        patientGender: 'female',
        patientCondition: 'Bedridden with hip fracture',
        mobilityStatus: 'bedridden',
        medicalEquipment: 'catheter',
        serviceType: 'bedridden_care',
        duration: '24_hours',
        district: 'Ernakulam (Kochi)',
        locality: 'Kaloor, Kochi',
        contactName: 'Dr. Thomas Varghese',
        relationship: 'son_daughter',
        phone: '+919847012345',
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    ],
    meta: {
      total: 1,
      stats: { total: 1, pending: 1, contacted: 0, matched: 0, assigned: 0, completed: 0 },
    },
  }),
}));

describe('DashboardRequestsPage (Admin Requests Inbox)', () => {
  it('should render the requests header, SLA badge, and KPI metrics', async () => {
    render(<DashboardRequestsPage />);

    expect(
      screen.getByRole('heading', { name: /Client Care Requests & Intake/i })
    ).toBeTruthy();
    expect(screen.getByText(/60-Min SLA Active/i)).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText(/Total Intake Enquiries/i)).toBeTruthy();
      expect(screen.getByText(/Pending Coordinator Review/i)).toBeTruthy();
      expect(screen.getByText(/Contacted & Discussing/i)).toBeTruthy();
      expect(screen.getByText(/Caregiver Matched & Active/i)).toBeTruthy();
    });
  });

  it('should render requests table with patient, service, and WhatsApp link', async () => {
    render(<DashboardRequestsPage />);

    await waitFor(() => {
      expect(screen.getByText('REQ-2026-894102')).toBeTruthy();
      expect(screen.getByText(/Mary Varghese/i)).toBeTruthy();
      expect(screen.getByText(/Bedridden & Palliative Care/i)).toBeTruthy();
      expect(screen.getAllByText(/Ernakulam \(Kochi\)/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Dr\. Thomas Varghese/i)).toBeTruthy();
      expect(screen.getByText('WhatsApp')).toBeTruthy();
      expect(screen.getByRole('button', { name: /Details & Notes/i })).toBeTruthy();
    });
  });

  it('should open slide-over drawer when Details & Notes is clicked', async () => {
    render(<DashboardRequestsPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Details & Notes/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /Details & Notes/i }));

    await waitFor(() => {
      expect(screen.getByText(/PATIENT CONDITION & DIAGNOSIS/i)).toBeTruthy();
      expect(screen.getByText(/Direct WhatsApp Chat with Family/i)).toBeTruthy();
      expect(screen.getByText(/Match Available Caregivers/i)).toBeTruthy();
    });
  });
});
