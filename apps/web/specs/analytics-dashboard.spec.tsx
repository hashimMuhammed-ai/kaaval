import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OwnerAnalyticsDashboardPage from '../src/app/dashboard/analytics/page';

// Mock Overview Data
const mockOverview = {
  tenantId: 'tenant-kerala-agency-1',
  totalCaregivers: 40,
  activeWorkforceCaregivers: 35,
  assignedCaregivers: 28,
  availableCaregivers: 7,
  onLeaveCaregivers: 3,
  inactiveCaregivers: 2,
  activeAssignmentsCount: 28,
  occupancyRatePct: 80,
  totalRequests: 50,
  filledRequests: 45,
  pendingRequests: 5,
  avgTimeToFillHours: 18.5,
  avgTimeToFillDays: 0.77,
  fillRatePct: 90,
  allTimeGrossRevenue: 1250000,
  allTimeCommissionRevenue: 187500,
  allTimeNetPayout: 1062500,
  currentMonthGrossRevenue: 240000,
  currentMonthCommissionRevenue: 36000,
  currentMonthNetPayout: 204000,
  previousMonthCommissionRevenue: 30000,
  revenueGrowthMomPct: 20,
  refreshedAt: new Date().toISOString(),
};

// Mock Monthly Trends Data
const mockTrends = [
  {
    id: 'mv-1',
    tenantId: 'tenant-kerala-agency-1',
    periodMonth: '2026-08',
    grossRevenue: 200000,
    commissionRevenue: 30000,
    caregiverPayouts: 170000,
    totalDeductions: 0,
    totalDaysWorked: 200,
    paymentsCount: 20,
    caregiversPaidCount: 20,
    totalRequests: 40,
    filledRequests: 36,
    pendingRequests: 4,
    avgTimeToFillHours: 22.0,
    avgTimeToFillDays: 0.92,
    fillRatePct: 90,
    totalCaregivers: 38,
    activeCaregivers: 34,
    activeAssignments: 25,
    occupancyRatePct: 73.5,
    refreshedAt: new Date().toISOString(),
  },
  {
    id: 'mv-2',
    tenantId: 'tenant-kerala-agency-1',
    periodMonth: '2026-09',
    grossRevenue: 240000,
    commissionRevenue: 36000,
    caregiverPayouts: 204000,
    totalDeductions: 0,
    totalDaysWorked: 240,
    paymentsCount: 24,
    caregiversPaidCount: 24,
    totalRequests: 50,
    filledRequests: 45,
    pendingRequests: 5,
    avgTimeToFillHours: 18.5,
    avgTimeToFillDays: 0.77,
    fillRatePct: 90,
    totalCaregivers: 40,
    activeCaregivers: 35,
    activeAssignments: 28,
    occupancyRatePct: 80.0,
    refreshedAt: new Date().toISOString(),
  },
];

// Mock apiFetch
const mockApiFetch = jest.fn();
jest.mock('../src/utils/api', () => ({
  apiFetch: (...args: any[]) => mockApiFetch(...args),
}));

describe('OwnerAnalyticsDashboardPage (Phase 11 Point 4)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiFetch.mockImplementation((url: string) => {
      if (url.includes('/analytics/overview')) {
        return Promise.resolve({
          success: true,
          data: mockOverview,
        });
      }

      if (url.includes('/analytics/monthly-trend')) {
        return Promise.resolve({
          success: true,
          data: mockTrends,
        });
      }

      if (url.includes('/analytics/refresh')) {
        return Promise.resolve({
          success: true,
          message: 'Materialized views refreshed successfully in 28ms.',
          refreshedAt: new Date().toISOString(),
        });
      }

      if (url.includes('/analytics/cache')) {
        return Promise.resolve({
          success: true,
          message: 'Redis cache keys invalidated.',
        });
      }

      return Promise.resolve({ success: true, data: null });
    });
  });

  it('should render the dashboard header, title, and Redis cache indicator', async () => {
    render(<OwnerAnalyticsDashboardPage />);

    expect(screen.getByText('Phase 11 — Analytics Intelligence')).toBeTruthy();
    expect(
      screen.getByRole('heading', { level: 1, name: /Agency Performance & Owner Analytics/i })
    ).toBeTruthy();
    expect(screen.getByText(/Redis Cache Active/i)).toBeTruthy();

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith('/analytics/overview');
    });
  });

  it('should display the 4 main KPI cards with correct calculated values', async () => {
    const { container } = render(<OwnerAnalyticsDashboardPage />);

    await waitFor(() => {
      // 1. Occupancy Rate KPI Card
      const occupancyCard = container.querySelector('#kpi-occupancy-rate');
      expect(occupancyCard).toBeTruthy();
      expect(occupancyCard?.textContent).toContain('80%');
      expect(occupancyCard?.textContent).toContain('28 / 40 deployed');
      expect(occupancyCard?.textContent).toContain('Available: 7');
      expect(occupancyCard?.textContent).toContain('On Leave: 3');

      // 2. Average Time-to-Fill KPI Card
      const timeToFillCard = container.querySelector('#kpi-time-to-fill');
      expect(timeToFillCard).toBeTruthy();
      expect(timeToFillCard?.textContent).toContain('18.5h');
      expect(timeToFillCard?.textContent).toContain('(0.77 days)');
      expect(timeToFillCard?.textContent).toContain('Filled: 45');
      expect(timeToFillCard?.textContent).toContain('Pending: 5');

      // 3. Current Month Gross Revenue KPI Card
      const grossCard = container.querySelector('#kpi-gross-revenue');
      expect(grossCard).toBeTruthy();
      expect(grossCard?.textContent).toContain('2,40,000');
      expect(grossCard?.textContent).toContain('20%');

      // 4. Agency Net Commission KPI Card
      const commissionCard = container.querySelector('#kpi-commission-revenue');
      expect(commissionCard).toBeTruthy();
      expect(commissionCard?.textContent).toContain('36,000');
      expect(commissionCard?.textContent).toContain('Caregiver Payout: ₹2,04,000');
    });
  });

  it('should render interactive SVG charts for revenue, occupancy, and turnaround time', async () => {
    const { container } = render(<OwnerAnalyticsDashboardPage />);

    await waitFor(() => {
      // Revenue multi-series trend chart
      const revChart = container.querySelector('#chart-revenue-trend');
      expect(revChart).toBeTruthy();
      expect(revChart?.querySelector('svg')).toBeTruthy();
      expect(revChart?.querySelector('h2')?.textContent).toContain('Monthly Revenue Trend');

      // Occupancy area/line chart
      const occChart = container.querySelector('#chart-occupancy-trend');
      expect(occChart).toBeTruthy();
      expect(occChart?.querySelector('svg')).toBeTruthy();
      expect(occChart?.querySelector('h2')?.textContent).toContain('Caregiver Occupancy & Utilization Trend');

      // Time-to-fill turnaround chart
      const tatChart = container.querySelector('#chart-time-to-fill-trend');
      expect(tatChart).toBeTruthy();
      expect(tatChart?.querySelector('svg')).toBeTruthy();
      expect(tatChart?.querySelector('h2')?.textContent).toContain('Average Time-to-Fill');
    });
  });

  it('should support switching timeframe between 6 Months and 12 Months', async () => {
    const { container } = render(<OwnerAnalyticsDashboardPage />);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith('/analytics/monthly-trend?limit=6');
    });

    const btn12m = container.querySelector('#timeframe-12m');
    expect(btn12m).toBeTruthy();

    fireEvent.click(btn12m!);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith('/analytics/monthly-trend?limit=12');
    });
  });

  it('should support switching chart tabs (Revenue, Occupancy, TAT)', async () => {
    const { container } = render(<OwnerAnalyticsDashboardPage />);

    await waitFor(() => {
      expect(container.querySelector('#chart-revenue-trend')).toBeTruthy();
      expect(container.querySelector('#chart-occupancy-trend')).toBeTruthy();
      expect(container.querySelector('#chart-time-to-fill-trend')).toBeTruthy();
    });

    // Switch to Revenue tab only
    const revTab = container.querySelector('#tab-revenue');
    fireEvent.click(revTab!);

    expect(container.querySelector('#chart-revenue-trend')).toBeTruthy();
    expect(container.querySelector('#chart-occupancy-trend')).toBeNull();
    expect(container.querySelector('#chart-time-to-fill-trend')).toBeNull();

    // Switch to Occupancy tab only
    const occTab = container.querySelector('#tab-occupancy');
    fireEvent.click(occTab!);

    expect(container.querySelector('#chart-revenue-trend')).toBeNull();
    expect(container.querySelector('#chart-occupancy-trend')).toBeTruthy();
    expect(container.querySelector('#chart-time-to-fill-trend')).toBeNull();

    // Switch back to All
    const allTab = container.querySelector('#tab-all');
    fireEvent.click(allTab!);

    expect(container.querySelector('#chart-revenue-trend')).toBeTruthy();
    expect(container.querySelector('#chart-occupancy-trend')).toBeTruthy();
    expect(container.querySelector('#chart-time-to-fill-trend')).toBeTruthy();
  });

  it('should handle Refresh Metrics button trigger and display confirmation notice', async () => {
    const { container } = render(<OwnerAnalyticsDashboardPage />);

    const refreshBtn = container.querySelector('#btn-refresh-analytics');
    expect(refreshBtn).toBeTruthy();

    fireEvent.click(refreshBtn!);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith('/analytics/refresh', { method: 'POST' });
      expect(
        screen.getByText(/Materialized views refreshed successfully/i)
      ).toBeTruthy();
    });
  });

  it('should handle Clear Cache button trigger and display notice', async () => {
    const { container } = render(<OwnerAnalyticsDashboardPage />);

    const clearBtn = container.querySelector('#btn-clear-cache');
    expect(clearBtn).toBeTruthy();

    fireEvent.click(clearBtn!);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith('/analytics/cache', { method: 'POST' });
      expect(screen.getByText(/Redis cache keys invalidated/i)).toBeTruthy();
    });
  });

  it('should render the Historical Performance Ledger table with formatted columns and values', async () => {
    const { container } = render(<OwnerAnalyticsDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Historical Performance Ledger')).toBeTruthy();
      const table = container.querySelector('table');
      expect(table).toBeTruthy();
      expect(table?.textContent).toContain('Gross Billing');
      expect(table?.textContent).toContain('Agency Commission');
      expect(table?.textContent).toContain('Caregiver Payout');
      expect(table?.textContent).toContain('Avg TAT');

      // Check rows rendered
      expect(table?.textContent).toContain('2026-08');
      expect(table?.textContent).toContain('2026-09');
      expect(table?.textContent).toContain('240 days');
      expect(screen.getByText('View Salary & Payments →')).toBeTruthy();
    });
  });
});
