import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DashboardCustomersPage from '../src/app/dashboard/customers/page';
import * as apiModule from '../src/utils/api';

jest.mock('../src/utils/api', () => ({
  apiFetch: jest.fn(),
}));

const mockCustomersList = [
  {
    id: 'cust-1',
    referenceId: 'CUST-2026-100001',
    patientName: 'Devaki Amma',
    patientAge: '82',
    patientGender: 'female',
    patientCondition: 'Parkinson’s assistance',
    mobilityStatus: 'wheelchair',
    serviceType: 'bedridden_care',
    duration: '24_hours',
    district: 'Ernakulam (Kochi)',
    primaryContactName: 'Dr. Suresh',
    relationship: 'son_daughter',
    phone: '+919847123456',
    status: 'active',
    assignedCaregiver: {
      id: 'cg-1',
      fullName: 'Anitha Rajan',
      phone: '+919847888999',
      dailyRate: 1100,
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cust-2',
    referenceId: 'CUST-2026-200002',
    patientName: 'George Joseph',
    patientAge: '76',
    patientGender: 'male',
    patientCondition: 'Post-operative knee rehabilitation',
    mobilityStatus: 'assisted',
    serviceType: 'elderly_care',
    duration: '12_day',
    district: 'Kottayam',
    primaryContactName: 'Mary George',
    relationship: 'spouse',
    phone: '+919847999888',
    status: 'pending',
    assignedCaregiver: null,
    createdAt: new Date().toISOString(),
  },
];

describe('DashboardCustomersPage (Customer CRM Roster)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (apiModule.apiFetch as jest.Mock).mockResolvedValue({
      success: true,
      data: mockCustomersList,
      meta: {
        total: 2,
        stats: {
          total: 2,
          active: 1,
          pending: 1,
          paused: 0,
          inactive: 0,
          discharged: 0,
        },
      },
    });
  });

  it('should render the CRM title, KPI metrics, and onboard button', async () => {
    render(<DashboardCustomersPage />);

    expect(
      screen.getByRole('heading', { name: /Customer Accounts & CRM Roster/i })
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: /\+ Onboard New Customer/i })).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('Total Client Accounts')).toBeTruthy();
      expect(screen.getByText(/Active In-Home Care/i)).toBeTruthy();
      expect(screen.getAllByText(/Pending Assignment/i).length).toBeGreaterThan(0);
      expect(screen.getByText('Devaki Amma')).toBeTruthy();
      expect(screen.getByText('George Joseph')).toBeTruthy();
    });
  });

  it('should filter customers by Active status when Active tab is selected', async () => {
    render(<DashboardCustomersPage />);

    await waitFor(() => {
      expect(screen.getByText('Devaki Amma')).toBeTruthy();
      expect(screen.getByText('George Joseph')).toBeTruthy();
    });

    const activeTab = screen.getByRole('button', { name: /Active Care/i });
    fireEvent.click(activeTab);

    await waitFor(() => {
      expect(apiModule.apiFetch).toHaveBeenCalledWith(
        expect.stringContaining('status=active')
      );
    });
  });

  it('should filter customers by Pending status when Pending tab is selected', async () => {
    render(<DashboardCustomersPage />);

    await waitFor(() => {
      expect(screen.getByText('George Joseph')).toBeTruthy();
    });

    const pendingTab = screen.getByRole('button', { name: /Pending Assignment/i });
    fireEvent.click(pendingTab);

    await waitFor(() => {
      expect(apiModule.apiFetch).toHaveBeenCalledWith(
        expect.stringContaining('status=pending')
      );
    });
  });

  it('should display patient details, assigned caregiver status, and link to detail page', async () => {
    render(<DashboardCustomersPage />);

    await waitFor(() => {
      expect(screen.getByText('CUST-2026-100001')).toBeTruthy();
      expect(screen.getByText(/Anitha Rajan/i)).toBeTruthy();
      expect(screen.getByText(/Unassigned/i)).toBeTruthy();
      expect(screen.getAllByRole('link', { name: /View Profile & Caregiver/i }).length).toBe(2);
    });
  });

  it('should open the quick onboard customer modal when onboard button is clicked', async () => {
    render(<DashboardCustomersPage />);

    const onboardBtn = screen.getByRole('button', { name: /\+ Onboard New Customer/i });
    fireEvent.click(onboardBtn);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Onboard New Client \/ Patient Account/i })
      ).toBeTruthy();
      expect(screen.getByRole('button', { name: /Create Customer Account/i })).toBeTruthy();
    });
  });
});
