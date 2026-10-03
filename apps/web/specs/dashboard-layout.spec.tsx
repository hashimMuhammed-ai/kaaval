import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import DashboardLayout from '../src/app/dashboard/layout';

// Mock next/navigation
const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
  replace: jest.fn(),
};
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/dashboard/requests',
}));

describe('DashboardLayout — Mobile & Desktop Navigation Shell', () => {
  beforeEach(() => {
    localStorage.clear();
    mockPush.mockClear();
    localStorage.setItem('auth_token', 'mock-jwt-token');
    localStorage.setItem(
      'user_profile',
      JSON.stringify({
        id: 'user-123',
        name: 'Fatima Coordinator',
        role: 'office_staff',
        tenantId: 'tenant-abc',
      })
    );
  });

  it('should render header and operational nav items for office_staff with financials hidden', () => {
    render(
      <DashboardLayout>
        <div data-testid="test-content">Dashboard Content</div>
      </DashboardLayout>
    );

    expect(screen.getByText('Agency Staff')).toBeTruthy();
    expect(screen.getByTestId('test-content')).toBeTruthy();
    expect(screen.getByText('Fatima Coordinator')).toBeTruthy();
    expect(screen.getByText('office staff')).toBeTruthy();

    // Financial links should be hidden for office staff
    expect(screen.queryByText('📊 Analytics')).toBeNull();
    expect(screen.queryByText('Salary Reports')).toBeNull();
  });

  it('should render mobile bottom navigation bar with operational tabs for office_staff', () => {
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    );

    const mobileNav = document.getElementById('dashboard-mobile-nav');
    expect(mobileNav).toBeTruthy();

    // Staff sees operational tabs (CRM instead of financial Dashboard)
    expect(screen.queryByText('Dashboard')).toBeNull();
    expect(screen.getByText('Requests')).toBeTruthy();
    expect(screen.getByText('Staff')).toBeTruthy();
    expect(screen.getByText('Match')).toBeTruthy();
    expect(screen.getByText('CRM')).toBeTruthy();
    expect(screen.getByText('More')).toBeTruthy();
  });

  it('should toggle mobile slide-out drawer for office_staff without financial links', () => {
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    );

    // Initially drawer is not visible
    expect(document.getElementById('dashboard-mobile-drawer')).toBeNull();

    // Tap "More" in the bottom tab bar
    const moreTab = document.getElementById('mobile-tab-more');
    expect(moreTab).toBeTruthy();
    fireEvent.click(moreTab!);

    // Drawer should now be visible
    const drawer = document.getElementById('dashboard-mobile-drawer');
    expect(drawer).toBeTruthy();
    const drawerScope = within(drawer!);
    expect(drawerScope.getByText('+ Register New Caregiver')).toBeTruthy();
    expect(drawerScope.getByText('Logout from Staff Portal')).toBeTruthy();

    // Financial links hidden in drawer for staff
    expect(drawerScope.queryByText('Analytics Dashboard')).toBeNull();
    expect(drawerScope.queryByText('Salary & Payment Reports')).toBeNull();

    // Clicking backdrop closes drawer
    const backdrop = document.getElementById('dashboard-mobile-drawer-backdrop');
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop!);

    expect(document.getElementById('dashboard-mobile-drawer')).toBeNull();
  });

  it('should render full financial and executive views for agency owner', () => {
    localStorage.setItem(
      'user_profile',
      JSON.stringify({
        id: 'owner-456',
        name: 'Rahul Owner',
        role: 'owner',
        tenantId: 'tenant-abc',
      })
    );

    render(
      <DashboardLayout>
        <div>Owner Content</div>
      </DashboardLayout>
    );

    // Header displays Agency Owner
    expect(screen.getByText('Agency Owner')).toBeTruthy();
    expect(screen.getByText('Rahul Owner')).toBeTruthy();

    // Desktop nav shows Analytics and Salary Reports
    expect(screen.getByText('📊 Analytics')).toBeTruthy();
    expect(screen.getByText('Salary Reports')).toBeTruthy();

    // Mobile bottom nav includes Dashboard tab for owner
    expect(screen.getByText('Dashboard')).toBeTruthy();
    expect(screen.getByText('Requests')).toBeTruthy();
    expect(screen.getByText('Staff')).toBeTruthy();
    expect(screen.getByText('Match')).toBeTruthy();
    expect(screen.getByText('More')).toBeTruthy();

    // Open drawer
    const moreTab = document.getElementById('mobile-tab-more');
    fireEvent.click(moreTab!);

    const drawer = document.getElementById('dashboard-mobile-drawer');
    expect(drawer).toBeTruthy();
    const drawerScope = within(drawer!);
    expect(drawerScope.getByText('Analytics Dashboard')).toBeTruthy();
    expect(drawerScope.getByText('Salary & Payment Reports')).toBeTruthy();
    expect(drawerScope.getByText('Customers CRM')).toBeTruthy();
  });

  it('should handle logout from mobile drawer', () => {
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    );

    // Open drawer
    const moreTab = document.getElementById('mobile-tab-more');
    fireEvent.click(moreTab!);

    // Click logout
    const logoutBtn = screen.getByText('Logout from Staff Portal');
    fireEvent.click(logoutBtn);

    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('user_profile')).toBeNull();
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});
