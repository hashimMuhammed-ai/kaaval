import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CaregiverPortalLayout from '../src/app/portal/layout';
import CaregiverPortalHomePage from '../src/app/portal/page';
import CaregiverAssignmentPage from '../src/app/portal/assignment/page';
import CaregiverAttendancePage from '../src/app/portal/attendance/page';
import CaregiverSalaryPage from '../src/app/portal/salary/page';
import CaregiverDocumentsPage from '../src/app/portal/documents/page';
import CaregiverProfilePage from '../src/app/portal/profile/page';

// Mock next/navigation
const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
  replace: jest.fn(),
};
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/portal',
}));

// Mock apiFetch
const mockCaregiverProfile = {
  id: 'cg-1',
  fullName: 'Deepa Varghese',
  phone: '+919847123456',
  email: 'deepa@keralacare.caregiver.local',
  status: 'available',
  skills: ['Elderly Care', 'Palliative Care'],
  city: 'Kochi',
  district: 'Ernakulam',
  dailyRate: 1200,
  commissionPercentage: 15,
  documents: [
    {
      id: 'doc-1',
      title: 'Nursing Certificate',
      documentType: 'nursing_certificate',
      verified: true,
      expiryDate: '2028-12-31',
    },
    {
      id: 'doc-2',
      title: 'Aadhaar Card',
      documentType: 'aadhaar',
      verified: true,
      expiryDate: null,
    },
  ],
};

const mockCurrentAssignment = {
  id: 'asgn-1',
  status: 'active',
  startDate: '2026-09-01',
  caregiverDailyRate: 1200,
  customer: {
    id: 'cust-1',
    patientName: 'Devaki Amma',
    fullName: 'Devaki Amma',
    patientAge: '78',
    patientGender: 'female',
    patientCondition: 'Mild dementia and hypertension',
    mobilityStatus: 'assisted',
    medicalEquipment: 'Walker, Blood Pressure Monitor',
    primaryContactName: 'Suresh Menon',
    relationship: 'Son',
    phone: '+919847123456',
    careAddress: '12/48 Green Valley, Kakkanad',
    address: '12/48 Green Valley, Kakkanad',
    locality: 'Kakkanad',
    city: 'Kochi',
    district: 'Ernakulam',
    pincode: '682030',
    serviceType: 'Elderly Assistance',
    duration: '12-Hour Day Shift',
    engagementPeriod: 'Ongoing Monthly Engagement',
  },
  request: {
    serviceType: 'Elderly Assistance',
  },
};

const mockTodayAttendance = {
  date: '2026-09-29',
  hasAssignment: true,
  isCheckedIn: true,
  isCheckedOut: false,
  checkedIn: true,
  checkedOut: false,
  checkInTime: '2026-09-29T08:30:00Z',
  assignmentId: 'asgn-1',
  assignment: mockCurrentAssignment,
  attendance: {
    id: 'att-1',
    date: '2026-09-29',
    checkInTime: '2026-09-29T08:30:00Z',
    checkOutTime: null,
    status: 'present',
  },
};

jest.mock('../src/utils/api', () => ({
  apiFetch: jest.fn().mockImplementation((url: string) => {
    if (url.includes('/caregivers/me')) {
      return Promise.resolve(mockCaregiverProfile);
    }
    if (url.includes('/assignments/current')) {
      return Promise.resolve({
        success: true,
        data: mockCurrentAssignment,
      });
    }
    if (url.includes('/attendance/today')) {
      return Promise.resolve({
        success: true,
        data: mockTodayAttendance,
      });
    }
    if (url.includes('/attendance/check-in') || url.includes('/attendance/check-out')) {
      return Promise.resolve({
        success: true,
        message: 'Attendance recorded successfully',
      });
    }
    if (url.includes('/payments/breakdown')) {
      return Promise.resolve({
        success: true,
        data: {
          caregiverId: 'cg-1',
          caregiverName: 'Priya Lakshmi',
          month: '2026-09',
          dailyRate: 1000,
          commissionPercentage: 15,
          totalDaysWorked: 11,
          grossAmount: 11000,
          commissionAmount: 1650,
          deductions: 0,
          netPayout: 9350,
          shifts: [
            {
              date: '2026-09-15',
              status: 'present',
              checkInTime: '2026-09-15T08:00:00Z',
              checkOutTime: '2026-09-15T20:00:00Z',
              dayFactor: 1.0,
              dailyRate: 1000,
              earnedGross: 1000,
              customerName: 'Devaki Amma',
            },
            {
              date: '2026-09-16',
              status: 'half_day',
              checkInTime: '2026-09-16T08:00:00Z',
              checkOutTime: '2026-09-16T14:00:00Z',
              dayFactor: 0.5,
              dailyRate: 1000,
              earnedGross: 500,
              customerName: 'Devaki Amma',
            },
          ],
        },
      });
    }
    if (url.includes('/payments')) {
      return Promise.resolve({
        success: true,
        data: [
          {
            id: 'pmt-1',
            caregiverId: 'cg-1',
            periodMonth: '2026-09',
            totalDaysWorked: 11,
            grossAmount: 11000,
            commissionPercentage: 15,
            commissionAmount: 1650,
            deductions: 0,
            netPayout: 9350,
            status: 'approved',
          },
        ],
      });
    }
    return Promise.resolve({ success: true, data: [] });
  }),
}));

describe('Caregiver Self-Service Portal (Phase 7 — First Point)', () => {
  const caregiverUser = {
    id: 'user-cg-1',
    name: 'Deepa Varghese',
    email: 'deepa@keralacare.caregiver.local',
    role: 'caregiver',
    tenantId: 'tenant-1',
  };

  const staffUser = {
    id: 'user-staff-1',
    name: 'Manager Staff',
    email: 'staff@keralacare.com',
    role: 'office_staff',
    tenantId: 'tenant-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('auth_token', 'mock-jwt-token');
    localStorage.setItem('user_profile', JSON.stringify(caregiverUser));

    // Default online
    jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);

    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  });

  describe('Portal Layout & Lowest Privilege Isolation', () => {
    it('should redirect unauthenticated users to /login', () => {
      localStorage.clear();
      render(
        <CaregiverPortalLayout>
          <div>Child Content</div>
        </CaregiverPortalLayout>
      );
      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    it('should render mobile-first layout with header and bottom navigation for Caregiver', () => {
      render(
        <CaregiverPortalLayout>
          <div>Portal Page Content</div>
        </CaregiverPortalLayout>
      );

      // Minimalist native header title, agency name, and Help button
      expect(screen.getByText('Caregiver Portal')).toBeTruthy();
      expect(screen.getByText('Kerala Care')).toBeTruthy();
      expect(screen.getByRole('button', { name: /Caregiver Help/i })).toBeTruthy();
      expect(screen.queryByText('Staff Portal')).toBeNull();
      expect(screen.queryByText(/Online/i)).toBeNull();

      // 5 Mobile Bottom Navigation Tabs
      expect(screen.getByRole('navigation', { name: /Caregiver Bottom Navigation/i })).toBeTruthy();
      expect(screen.getByText('Home')).toBeTruthy();
      expect(screen.getByText('Duty')).toBeTruthy();
      expect(screen.getByText('Punch')).toBeTruthy();
      expect(screen.getByText('Salary')).toBeTruthy();
      expect(screen.getByText('Profile')).toBeTruthy();

      // Lowest privilege: Caregiver should NEVER see links to /dashboard
      expect(screen.queryByText(/Staff Preview Mode/i)).toBeNull();
      expect(screen.queryByRole('link', { name: /Dashboard/i })).toBeNull();
    });

    it('should open Help action sheet with Call Office Staff, WhatsApp, and Ambulance when Help button is clicked', async () => {
      render(
        <CaregiverPortalLayout>
          <div>Content</div>
        </CaregiverPortalLayout>
      );

      const helpBtn = screen.getByRole('button', { name: /Caregiver Help/i });
      fireEvent.click(helpBtn);

      await waitFor(() => {
        expect(screen.getByText(/Emergency & Duty Help/i)).toBeTruthy();
      });

      const callOfficeBtn = screen.getByLabelText(/Call Office Staff/i);
      expect(callOfficeBtn.getAttribute('href')).toBe('tel:+919876543210');

      const whatsappBtn = screen.getByLabelText(/WhatsApp Office Support/i);
      expect(whatsappBtn.getAttribute('href')).toContain('https://wa.me/919876543210');

      const ambulanceBtn = screen.getByLabelText(/Call 108 Ambulance/i);
      expect(ambulanceBtn.getAttribute('href')).toBe('tel:108');

      // Dismiss help modal
      const closeBtn = screen.getByRole('button', { name: /Close/i });
      fireEvent.click(closeBtn);

      await waitFor(() => {
        expect(screen.queryByText(/Emergency & Duty Help/i)).toBeNull();
      });
    });

    it('should show staff preview banner when viewed by office_staff role', () => {
      localStorage.setItem('user_profile', JSON.stringify(staffUser));

      render(
        <CaregiverPortalLayout>
          <div>Admin Preview View</div>
        </CaregiverPortalLayout>
      );

      expect(screen.getByText(/Staff Preview Mode/i)).toBeTruthy();
      const dashboardLink = screen.getByRole('link', { name: /Dashboard/i });
      expect(dashboardLink).toBeTruthy();
      expect(dashboardLink.getAttribute('href')).toBe('/dashboard');
    });
  });

  describe('Caregiver Profile Page (Mobile Profile, Documents & Sign Out)', () => {
    it('should render profile details, credentials navigation, and emergency contact', async () => {
      render(<CaregiverProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Deepa Varghese/i })).toBeTruthy();
        expect(screen.getByText(/Available for Duty/i)).toBeTruthy();
        expect(screen.getByText(/Documents & Certifications/i)).toBeTruthy();
      });

      const docsLink = screen.getByRole('link', { name: /Documents & Certifications/i });
      expect(docsLink.getAttribute('href')).toBe('/portal/documents');
    });

    it('should open sign out confirmation modal and sign out when confirmed', async () => {
      render(<CaregiverProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Deepa Varghese/i })).toBeTruthy();
      });

      const logoutBtn = screen.getByRole('button', { name: /Sign Out of Portal/i });
      fireEvent.click(logoutBtn);
      await waitFor(() => {
        expect(screen.getByText(/Sign Out of Portal\?/i)).toBeTruthy();
      });

      const confirmBtn = screen.getByRole('button', { name: /Yes, Sign Out/i });
      fireEvent.click(confirmBtn);

      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  describe('Caregiver Portal Home Page (Mobile Dashboard)', () => {
    it('should render caregiver greeting and operational status badge', async () => {
      render(<CaregiverPortalHomePage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Deepa Varghese/i })).toBeTruthy();
        expect(screen.getByText('Available')).toBeTruthy();
      });
    });

    it('should render active assignment overview with patient name and address', async () => {
      render(<CaregiverPortalHomePage />);

      await waitFor(() => {
        expect(screen.getByText('Devaki Amma')).toBeTruthy();
        expect(screen.getAllByText(/Elderly Assistance/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/12\/48 Green Valley, Kakkanad/i)).toBeTruthy();
      });
    });

    it('should render attendance shift punch card with check-in/out quick action', async () => {
      render(<CaregiverPortalHomePage />);

      await waitFor(() => {
        expect(screen.getByText('Checked In (Active)')).toBeTruthy();
        expect(screen.getByText('Check Out')).toBeTruthy();
      });
    });

    it('should render rate snapshot and verified document count cards', async () => {
      render(<CaregiverPortalHomePage />);

      await waitFor(() => {
        expect(screen.getByText('₹1200')).toBeTruthy();
        expect(screen.getByText(/Per day payout/i)).toBeTruthy();
        expect(screen.getByText(/2 Active/i)).toBeTruthy();
      });
    });

    it('should render PWA direct mobile install card', async () => {
      render(<CaregiverPortalHomePage />);
      await waitFor(() => {
        expect(screen.getByText('Install on Mobile Screen')).toBeTruthy();
      });
    });
  });

  describe('Current Assignment View (Phase 7 — Second Point)', () => {
    it('should render customer/patient name, care location, and duty schedule', async () => {
      render(<CaregiverAssignmentPage />);

      await waitFor(() => {
        // Customer / Patient name
        expect(screen.getByRole('heading', { name: /Devaki Amma/i })).toBeTruthy();
        expect(screen.getByText(/78 yrs/i)).toBeTruthy();
        expect(screen.getByText(/Female/i)).toBeTruthy();

        // Care Location
        expect(screen.getByText(/12\/48 Green Valley, Kakkanad/i)).toBeTruthy();
        expect(screen.getByText(/Kochi, Ernakulam/i)).toBeTruthy();
        expect(screen.getByText(/682030/i)).toBeTruthy();
        const openMapsBtn = screen.getByRole('link', { name: /Open in Maps/i });
        expect(openMapsBtn).toBeTruthy();
        expect(openMapsBtn.getAttribute('href')).toContain('google.com/maps/search');

        // Schedule & Scope
        expect(screen.getAllByText(/Elderly Assistance/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/Ongoing Monthly Engagement/i)).toBeTruthy();
        expect(screen.getByText(/₹1200 \/ day/i)).toBeTruthy();
        expect(screen.getAllByText(/Active Duty/i).length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should render family contact details with direct phone and WhatsApp links', async () => {
      render(<CaregiverAssignmentPage />);

      await waitFor(() => {
        expect(screen.getByText('Suresh Menon')).toBeTruthy();
        expect(screen.getByText(/Relationship: Son/i)).toBeTruthy();
        expect(screen.getByText(/📞 \+919847123456/i)).toBeTruthy();

        const callFamilyBtn = screen.getByRole('link', { name: /Call Family/i });
        expect(callFamilyBtn).toBeTruthy();
        expect(callFamilyBtn.getAttribute('href')).toBe('tel:+919847123456');

        const whatsappFamilyBtn = screen.getByRole('link', { name: /WhatsApp/i });
        expect(whatsappFamilyBtn).toBeTruthy();
        expect(whatsappFamilyBtn.getAttribute('href')).toContain('wa.me/919847123456');
      });
    });

    it('should render medical and mobility requirements with doctor notes', async () => {
      render(<CaregiverAssignmentPage />);

      await waitFor(() => {
        expect(screen.getByText('Mild dementia and hypertension')).toBeTruthy();
        expect(screen.getByText('assisted')).toBeTruthy();
        expect(screen.getByText('Walker, Blood Pressure Monitor')).toBeTruthy();
      });
    });

    it('should copy care address to clipboard on clicking copy button', async () => {
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockImplementation(() => Promise.resolve()),
        },
      });

      render(<CaregiverAssignmentPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Copy/i })).toBeTruthy();
      });

      const copyBtn = screen.getByRole('button', { name: /Copy/i });
      fireEvent.click(copyBtn);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('12/48 Green Valley, Kakkanad')
      );
      expect(screen.getByText(/Copied!/i)).toBeTruthy();
    });

    it('should render standby mode when no active assignment exists', async () => {
      // Mock /assignments/current returning null
      const api = require('../src/utils/api');
      const originalApiFetch = api.apiFetch;
      api.apiFetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('/assignments/current')) {
          return Promise.resolve({ success: true, data: null });
        }
        return originalApiFetch(url);
      });

      render(<CaregiverAssignmentPage />);

      await waitFor(() => {
        expect(screen.getByText(/You Are Currently on Standby/i)).toBeTruthy();
        expect(screen.getByText(/Available for New Duty/i)).toBeTruthy();
        expect(screen.getByRole('link', { name: /Confirm Availability to Agency/i })).toBeTruthy();
      });

      api.apiFetch = originalApiFetch;
    });

    it('should switch between Active Duty and Duty History tabs', async () => {
      render(<CaregiverAssignmentPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Devaki Amma/i })).toBeTruthy();
      });

      const historyTabBtn = screen.getByRole('button', { name: /Duty History/i });
      fireEvent.click(historyTabBtn);

      await waitFor(() => {
        expect(screen.getByText(/Duty History/i)).toBeTruthy();
      });
    });
  });

  describe('One-Tap Attendance Check-In / Check-Out (Phase 7 — Third Point)', () => {
    it('should render live shift clock, patient context, and one-tap punch button', async () => {
      render(<CaregiverAttendancePage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Attendance & Shift Punch/i })).toBeTruthy();
        expect(screen.getByText(/Devaki Amma/i)).toBeTruthy();
        expect(screen.getByRole('button', { name: /Check out of current shift/i })).toBeTruthy();
        expect(screen.getByText('Check Out')).toBeTruthy();
      });
    });

    it('should record one-tap check-out and display success confirmation', async () => {
      render(<CaregiverAttendancePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Check out of current shift/i })).toBeTruthy();
      });

      const punchBtn = screen.getByRole('button', { name: /Check out of current shift/i });
      fireEvent.click(punchBtn);

      await waitFor(() => {
        expect(screen.getByText(/Shift check-out recorded successfully/i)).toBeTruthy();
      });
    });

    it('should record one-tap check-in when off duty', async () => {
      const api = require('../src/utils/api');
      const originalApiFetch = api.apiFetch;
      api.apiFetch = jest.fn().mockImplementation((url: string, options?: any) => {
        if (url.includes('/attendance/today')) {
          return Promise.resolve({
            success: true,
            data: {
              date: '2026-09-29',
              hasAssignment: true,
              isCheckedIn: false,
              isCheckedOut: false,
              assignment: mockCurrentAssignment,
              attendance: null,
            },
          });
        }
        if (url.includes('/attendance/check-in')) {
          return Promise.resolve({
            success: true,
            message: 'Check-in recorded',
          });
        }
        return originalApiFetch(url, options);
      });

      render(<CaregiverAttendancePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Check in to start shift/i })).toBeTruthy();
        expect(screen.getByText('Check In')).toBeTruthy();
      });

      const punchBtn = screen.getByRole('button', { name: /Check in to start shift/i });
      fireEvent.click(punchBtn);

      await waitFor(() => {
        expect(screen.getByText(/Shift check-in recorded successfully/i)).toBeTruthy();
      });

      api.apiFetch = originalApiFetch;
    });

    it('should allow toggling handover notes input and adding notes', async () => {
      render(<CaregiverAttendancePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /\+ Add Shift Handover Notes/i })).toBeTruthy();
      });

      const toggleNotesBtn = screen.getByRole('button', { name: /\+ Add Shift Handover Notes/i });
      fireEvent.click(toggleNotesBtn);

      expect(screen.getByPlaceholderText(/Enter vital signs, medicines given/i)).toBeTruthy();
      const textarea = screen.getByPlaceholderText(/Enter vital signs, medicines given/i);
      fireEvent.change(textarea, { target: { value: 'Patient vitals stable at 120/80' } });
      expect((textarea as HTMLTextAreaElement).value).toBe('Patient vitals stable at 120/80');
    });

    it('should render recent shift history log with dates and badges', async () => {
      const api = require('../src/utils/api');
      const originalApiFetch = api.apiFetch;
      api.apiFetch = jest.fn().mockImplementation((url: string, options?: any) => {
        if (url.includes('/attendance?limit=14') || (url.includes('/attendance') && !url.includes('/today') && !url.includes('/check-'))) {
          return Promise.resolve({
            success: true,
            data: [
              {
                id: 'att-hist-1',
                date: '2026-09-28',
                checkInTime: '2026-09-28T08:00:00Z',
                checkOutTime: '2026-09-28T20:00:00Z',
                status: 'present',
                verified: true,
              },
            ],
          });
        }
        return originalApiFetch(url, options);
      });

      render(<CaregiverAttendancePage />);

      await waitFor(() => {
        expect(screen.getByText(/Recent Shift History/i)).toBeTruthy();
        expect(screen.getByText('present')).toBeTruthy();
        expect(screen.getByText('✓ Verified')).toBeTruthy();
      });

      api.apiFetch = originalApiFetch;
    });

    it('should show standby disabled button when no active assignment exists', async () => {
      const api = require('../src/utils/api');
      const originalApiFetch = api.apiFetch;
      api.apiFetch = jest.fn().mockImplementation((url: string, options?: any) => {
        if (url.includes('/attendance/today')) {
          return Promise.resolve({
            success: true,
            data: {
              date: '2026-09-29',
              hasAssignment: false,
              isCheckedIn: false,
              isCheckedOut: false,
              assignment: null,
              attendance: null,
            },
          });
        }
        if (url.includes('/assignments/current')) {
          return Promise.resolve({ success: true, data: null });
        }
        return originalApiFetch(url, options);
      });

      render(<CaregiverAttendancePage />);

      await waitFor(() => {
        const punchBtn = screen.getByRole('button', { name: /No active assignment/i });
        expect(punchBtn).toBeTruthy();
        expect((punchBtn as HTMLButtonElement).disabled).toBe(true);
        expect(screen.getByText('Standby')).toBeTruthy();
      });

      api.apiFetch = originalApiFetch;
    });
  });

  describe('Caregiver Salary & Payment History (Phase 7 — Fourth Point)', () => {
    it('should render CaregiverSalaryPage with monthly disbursal history', async () => {
      render(<CaregiverSalaryPage />);

      await waitFor(() => {
        expect(screen.getByText('Period 2026-09')).toBeTruthy();
        expect(screen.getAllByText('₹9,350').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('approved')).toBeTruthy();
      });
    });

    it('should render configured daily rate and lifetime net take-home earnings', async () => {
      render(<CaregiverSalaryPage />);

      await waitFor(() => {
        expect(screen.getByText('Salary & Payouts')).toBeTruthy();
        expect(screen.getByText(/standard day/i)).toBeTruthy();
        expect(screen.getByText(/15% commission/i)).toBeTruthy();
        expect(screen.getByText('11 days')).toBeTruthy();
        expect(screen.getByText(/Total Net Take-Home/i)).toBeTruthy();
      });
    });

    it('should open shift-by-shift attendance breakdown modal on clicking View Shift Breakdown', async () => {
      render(<CaregiverSalaryPage />);

      await waitFor(() => {
        expect(screen.getByText('Period 2026-09')).toBeTruthy();
      });

      const viewBtn = screen.getByRole('button', { name: /View Shift Breakdown/i });
      fireEvent.click(viewBtn);

      await waitFor(() => {
        expect(screen.getByText(/Attendance Calculation Formula/i)).toBeTruthy();
        expect(screen.getByText(/Full Day \(Present\) = 1.0 day/i)).toBeTruthy();
        expect(screen.getByText('2026-09-15')).toBeTruthy();
        expect(screen.getByText('2026-09-16')).toBeTruthy();
        expect(screen.getAllByText(/Patient: Devaki Amma/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/present \(1d\)/i)).toBeTruthy();
        expect(screen.getByText(/half_day \(0.5d\)/i)).toBeTruthy();
      });

      // Test modal close button
      const closeBtn = screen.getByRole('button', { name: /Close shift breakdown/i });
      fireEvent.click(closeBtn);

      await waitFor(() => {
        expect(screen.queryByText(/Attendance Calculation Formula/i)).toBeNull();
      });
    });

    it('should display WhatsApp coordinator support link for payment questions', async () => {
      render(<CaregiverSalaryPage />);

      await waitFor(() => {
        expect(screen.getByText(/Questions About Your Payout\?/i)).toBeTruthy();
        const waLink = screen.getByRole('link', { name: /WhatsApp Coordinator/i });
        expect(waLink).toBeTruthy();
        expect(waLink.getAttribute('href')).toContain('wa.me');
      });
    });

    it('should render empty state when no statements are found', async () => {
      const api = require('../src/utils/api');
      const originalApiFetch = api.apiFetch;
      api.apiFetch = jest.fn().mockImplementation((url: string, options?: any) => {
        if (url.includes('/payments')) {
          return Promise.resolve({
            success: true,
            data: [],
          });
        }
        return originalApiFetch(url, options);
      });

      render(<CaregiverSalaryPage />);

      await waitFor(() => {
        expect(screen.getByText(/No Disbursals in Current Cycle/i)).toBeTruthy();
        expect(screen.getByText(/Go to Shift Punch/i)).toBeTruthy();
      });

      api.apiFetch = originalApiFetch;
    });
  });

  describe('Caregiver Documents & Certification Status (Phase 7 — Fifth Point)', () => {
    it('should render CaregiverDocumentsPage with verified credentials', async () => {
      render(<CaregiverDocumentsPage />);

      await waitFor(() => {
        expect(screen.getByText('Nursing Certificate')).toBeTruthy();
        expect(screen.getByText('Aadhaar Card')).toBeTruthy();
        expect(screen.getAllByText('✓ Verified').length).toBe(2);
      });
    });

    it('should render compliance health banner and KYC shield with verified count', async () => {
      render(<CaregiverDocumentsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Certifications & IDs/i)).toBeTruthy();
        expect(screen.getByText(/All Credentials Verified & Active/i)).toBeTruthy();
        expect(screen.getByText(/2 \/ 2 Verified/i)).toBeTruthy();
        expect(screen.getByText('Lifetime Valid')).toBeTruthy();
        expect(screen.getByText('Valid')).toBeTruthy();
      });
    });

    it('should open document details modal on clicking View Details and allow closing', async () => {
      render(<CaregiverDocumentsPage />);

      await waitFor(() => {
        expect(screen.getByText('Nursing Certificate')).toBeTruthy();
      });

      const viewBtn = screen.getAllByRole('button', { name: /View Details/i })[0];
      fireEvent.click(viewBtn);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeTruthy();
        expect(screen.getByText(/Verification Status/i)).toBeTruthy();
        expect(screen.getByText(/✓ Verified by Agency/i)).toBeTruthy();
      });

      const closeBtn = screen.getByRole('button', { name: /Close document details/i });
      fireEvent.click(closeBtn);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBeNull();
      });
    });

    it('should display WhatsApp coordinator support link for renewing certificates', async () => {
      render(<CaregiverDocumentsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Need to Update or Renew Documents\?/i)).toBeTruthy();
        const waBtn = screen.getByRole('link', { name: /WhatsApp Updated Certificate/i });
        expect(waBtn).toBeTruthy();
        expect(waBtn.getAttribute('href')).toContain('wa.me');
      });
    });

    it('should display expiry warning callout when documents are expiring soon or expired', async () => {
      const api = require('../src/utils/api');
      const originalApiFetch = api.apiFetch;
      api.apiFetch = jest.fn().mockImplementation((url: string, options?: any) => {
        if (url.includes('/caregivers/me')) {
          return Promise.resolve({
            ...mockCaregiverProfile,
            documents: [
              {
                id: 'doc-exp-1',
                title: 'Basic Life Support (BLS)',
                documentType: 'first_aid',
                verified: true,
                expiryDate: '2026-09-10', // Expired
                expiryStatus: 'expired',
                daysUntilExpiry: -19,
              },
            ],
          });
        }
        return originalApiFetch(url, options);
      });

      render(<CaregiverDocumentsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Action Required: Expiry Upcoming/i)).toBeTruthy();
        expect(screen.getByText(/1 document\(s\) have expired/i)).toBeTruthy();
        expect(screen.getByText('Expired')).toBeTruthy();
      });

      api.apiFetch = originalApiFetch;
    });

    it('should render empty state when no credentials are on file', async () => {
      const api = require('../src/utils/api');
      const originalApiFetch = api.apiFetch;
      api.apiFetch = jest.fn().mockImplementation((url: string, options?: any) => {
        if (url.includes('/caregivers/me')) {
          return Promise.resolve({
            ...mockCaregiverProfile,
            documents: [],
          });
        }
        return originalApiFetch(url, options);
      });

      render(<CaregiverDocumentsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Credentials on File/i)).toBeTruthy();
        expect(screen.getByText(/Identity proofs, nursing certificates/i)).toBeTruthy();
      });

      api.apiFetch = originalApiFetch;
    });
  });
});
