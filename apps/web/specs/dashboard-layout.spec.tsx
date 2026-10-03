import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('should render header with agency staff branding and desktop nav items', () => {
    render(
      <DashboardLayout>
        <div data-testid="test-content">Dashboard Content</div>
      </DashboardLayout>
    );

    expect(screen.getByText('Agency Staff')).toBeTruthy();
    expect(screen.getByTestId('test-content')).toBeTruthy();
    expect(screen.getByText('Fatima Coordinator')).toBeTruthy();
    expect(screen.getByText('office staff')).toBeTruthy();
  });

  it('should render mobile bottom navigation bar with all 5 core tabs', () => {
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    );

    const mobileNav = document.getElementById('dashboard-mobile-nav');
    expect(mobileNav).toBeTruthy();

    // Check tabs
    expect(screen.getByText('Requests')).toBeTruthy();
    expect(screen.getByText('Staff')).toBeTruthy();
    expect(screen.getByText('Match')).toBeTruthy();
    expect(screen.getByText('CRM')).toBeTruthy();
    expect(screen.getByText('More')).toBeTruthy();
  });

  it('should toggle mobile slide-out drawer when tapping More or the menu toggle button', () => {
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
    expect(screen.getByText('+ Register New Caregiver')).toBeTruthy();
    expect(screen.getByText('Analytics Dashboard')).toBeTruthy();
    expect(screen.getByText('Salary & Payment Reports')).toBeTruthy();
    expect(screen.getByText('Logout from Staff Portal')).toBeTruthy();

    // Clicking backdrop closes drawer
    const backdrop = document.getElementById('dashboard-mobile-drawer-backdrop');
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop!);

    expect(document.getElementById('dashboard-mobile-drawer')).toBeNull();
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
