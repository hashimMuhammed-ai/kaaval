import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SalaryReportsPage from '../src/app/dashboard/salary-reports/page';

// Mock apiFetch
const mockPayments = [
  {
    id: 'pmt-1',
    caregiverId: 'cg-1',
    periodMonth: '2026-09',
    daysPresent: 10,
    daysHalfDay: 2,
    daysAbsent: 0,
    daysOnLeave: 0,
    totalDaysWorked: 11.0,
    dailyRate: 1000,
    grossAmount: 11000,
    commissionPercentage: 15,
    commissionAmount: 1650,
    deductions: 0,
    netPayout: 9350,
    status: 'approved',
    paymentDate: null,
    transactionReference: null,
    notes: 'Good performance',
    computedAt: '2026-09-29T10:00:00Z',
    caregiver: {
      id: 'cg-1',
      fullName: 'Lakshmi Nair',
      phone: '+919876543210',
      district: 'Ernakulam',
      city: 'Kochi',
    },
    approvedByUser: {
      id: 'user-staff-1',
      name: 'Manager Staff',
    },
  },
];

const mockStats = {
  totalCaregivers: 1,
  totalDaysWorked: 11.0,
  totalGross: 11000,
  totalCommission: 1650,
  totalNetPayout: 9350,
};

jest.mock('../src/utils/api', () => ({
  apiFetch: jest.fn().mockImplementation((url: string) => {
    if (url.includes('/payments/breakdown')) {
      return Promise.resolve({
        success: true,
        data: {
          caregiverId: 'cg-1',
          caregiverName: 'Lakshmi Nair',
          month: '2026-09',
          dailyRate: 1000,
          commissionPercentage: 15,
          totalDaysWorked: 11.0,
          grossAmount: 11000,
          commissionAmount: 1650,
          deductions: 0,
          netPayout: 9350,
          shifts: [
            {
              date: '2026-09-01',
              status: 'present',
              checkInTime: '2026-09-01T08:00:00Z',
              checkOutTime: '2026-09-01T20:00:00Z',
              dayFactor: 1.0,
              dailyRate: 1000,
              earnedGross: 1000,
              customerName: 'Mary Varghese',
              assignmentId: 'asgn-1',
            },
          ],
        },
      });
    }

    if (url.includes('/payments/calculate')) {
      return Promise.resolve({
        success: true,
        message: 'Recalculated salary statements for 2026-09',
        data: { month: '2026-09', processedCount: 1, payments: mockPayments },
      });
    }

    return Promise.resolve({
      success: true,
      data: mockPayments,
      meta: {
        total: 1,
        stats: mockStats,
      },
    });
  }),
}));

describe('SalaryReportsPage (Owner & Office Staff Payroll)', () => {
  beforeEach(() => {
    // Mock window.URL methods
    window.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-url');
    window.URL.revokeObjectURL = jest.fn();
  });

  it('should render header, action buttons, and financial summary cards', async () => {
    render(<SalaryReportsPage />);

    expect(
      screen.getByRole('heading', { name: /Monthly Salary & Payout Reports/i })
    ).toBeTruthy();

    expect(screen.getByText(/Export CSV Report/i)).toBeTruthy();
    expect(screen.getByText(/Export JSON/i)).toBeTruthy();
    expect(screen.getByText(/Recalculate Month/i)).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText(/Total Gross Payroll/i)).toBeTruthy();
      expect(screen.getByText(/Agency Retained Split/i)).toBeTruthy();
      expect(screen.getByText(/Net Caregiver Disbursal/i)).toBeTruthy();
      expect(screen.getByText(/Workforce In Period/i)).toBeTruthy();
    });
  });

  it('should render itemized statements table with caregiver earnings', async () => {
    render(<SalaryReportsPage />);

    await waitFor(() => {
      expect(screen.getByText('Lakshmi Nair')).toBeTruthy();
      expect(screen.getByText(/\+919876543210/)).toBeTruthy();
      expect(screen.getByText('₹1000/day')).toBeTruthy();
      expect(screen.getAllByText('₹11,000.00').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('₹1,650.00').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('₹9,350.00').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('approved').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should trigger shift-by-shift daily breakdown modal on click', async () => {
    render(<SalaryReportsPage />);

    await waitFor(() => {
      expect(screen.getByText('Lakshmi Nair')).toBeTruthy();
    });

    const shiftBtn = screen.getByText('Shifts');
    fireEvent.click(shiftBtn);

    await waitFor(() => {
      expect(screen.getByText(/Daily Shift Breakdown/i)).toBeTruthy();
      expect(screen.getByText(/Mary Varghese/i)).toBeTruthy();
      expect(screen.getByText(/present \(1x\)/i)).toBeTruthy();
    });
  });

  it('should allow exporting CSV report when clicking Export CSV button', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      blob: jest.fn().mockResolvedValue(new Blob(['Caregiver Name,Gross\nLakshmi,11000'])),
    } as any);

    render(<SalaryReportsPage />);

    const exportBtn = screen.getByText(/Export CSV Report/i);
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
