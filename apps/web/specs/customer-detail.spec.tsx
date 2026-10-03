import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CustomerDetailView, { CustomerData } from '../src/components/customer-detail-view';
import * as apiModule from '../src/utils/api';

jest.mock('../src/utils/api', () => ({
  apiFetch: jest.fn(),
}));

const mockCustomer: CustomerData = {
  id: 'cust-uuid-1',
  tenantId: 'tenant-123',
  referenceId: 'CUST-2026-481920',
  patientName: 'Devaki Amma',
  patientAge: '84',
  patientGender: 'female',
  patientCondition: 'Advanced Parkinson’s, high risk of falls, bed mobility assistance required',
  mobilityStatus: 'wheelchair',
  medicalEquipment: 'Wheelchair, Ryles Tube',
  primaryContactName: 'Dr. Suresh Kumar',
  relationship: 'son_daughter',
  phone: '+919847123456',
  alternatePhone: '+919847000111',
  email: 'suresh@example.com',
  isWhatsapp: true,
  address: 'TC 14/820, Hill Gardens, Kowdiar',
  locality: 'Kowdiar',
  district: 'Thiruvananthapuram',
  pincode: '695003',
  serviceType: 'bedridden_care',
  duration: '24_hours',
  engagementPeriod: 'ongoing',
  genderPreference: 'female',
  startDate: 'Immediate (29 Sept 2026)',
  status: 'active',
  assignedCaregiverId: 'cg-uuid-1',
  assignedCaregiver: {
    id: 'cg-uuid-1',
    fullName: 'Anitha Rajan, GNM',
    phone: '+919847888999',
    gender: 'female',
    experienceYears: 6.5,
    dailyRate: 1100,
    status: 'assigned',
  },
  request: {
    id: 'req-uuid-1',
    referenceId: 'REQ-2026-784102',
    source: 'public_form',
  },
  notes: 'Patient prefers soft meals at 8:30 AM and 7:00 PM. Family physician Dr. Nair visits weekly.',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('CustomerDetailView Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render patient header, reference ID, and status badge', () => {
    render(<CustomerDetailView customer={mockCustomer} />);

    expect(screen.getByRole('heading', { name: /Devaki Amma/i })).toBeTruthy();
    expect(screen.getByText('CUST-2026-481920')).toBeTruthy();
    expect(screen.getByText('Active Care')).toBeTruthy();
  });

  it('should render clinical patient profile: condition, mobility, equipment, and sensitive data tag', () => {
    render(<CustomerDetailView customer={mockCustomer} />);

    expect(screen.getByText(/Sensitive Health Data/i)).toBeTruthy();
    expect(screen.getByText(/84 Years/i)).toBeTruthy();
    expect(screen.getByText(/Advanced Parkinson’s, high risk of falls/i)).toBeTruthy();
    expect(screen.getByText(/Wheelchair Dependent/i)).toBeTruthy();
    expect(screen.getByText(/Wheelchair, Ryles Tube/i)).toBeTruthy();
    expect(screen.getByText(/Thiruvananthapuram/i)).toBeTruthy();
  });

  it('should render care requirements and schedule specifications', () => {
    render(<CustomerDetailView customer={mockCustomer} />);

    expect(screen.getByText(/Bedridden & Palliative Care/i)).toBeTruthy();
    expect(screen.getByText(/24 Hours Live-In Care/i)).toBeTruthy();
    expect(screen.getByText(/Female Caregiver/i)).toBeTruthy();
    expect(screen.getByText(/Immediate \(29 Sept 2026\)/i)).toBeTruthy();
    expect(screen.getByText(/Intake Ref: REQ-2026-784102/i)).toBeTruthy();
  });

  it('should render assigned caregiver information and daily rate', () => {
    render(<CustomerDetailView customer={mockCustomer} />);

    expect(screen.getByText('Anitha Rajan, GNM')).toBeTruthy();
    expect(screen.getByText(/\+919847888999/i)).toBeTruthy();
    expect(screen.getByText(/6.5 Years/i)).toBeTruthy();
    expect(screen.getByText(/₹1,100\/day/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Change Caregiver/i })).toBeTruthy();
  });

  it('should render primary family contact details and direct WhatsApp button', () => {
    render(<CustomerDetailView customer={mockCustomer} />);

    expect(screen.getByText('Dr. Suresh Kumar')).toBeTruthy();
    expect(screen.getByText(/Relationship: son daughter/i)).toBeTruthy();
    expect(screen.getByText(/\+919847123456/i)).toBeTruthy();

    const whatsappBtn = screen.getByRole('link', { name: /WhatsApp Family/i });
    expect(whatsappBtn).toBeTruthy();
    expect(whatsappBtn.getAttribute('href')).toContain('https://wa.me/919847123456');
  });

  it('should allow updating customer status through status switcher select', async () => {
    (apiModule.apiFetch as jest.Mock).mockImplementation((url: string) => {
      if (url.startsWith('/feedback')) {
        return Promise.resolve({ success: true, data: [] });
      }
      if (url.startsWith('/customers/cust-uuid-1')) {
        return Promise.resolve({
          success: true,
          data: {
            ...mockCustomer,
            status: 'paused',
          },
        });
      }
      return Promise.resolve({ success: true, data: {} });
    });

    const onUpdateMock = jest.fn();
    render(<CustomerDetailView customer={mockCustomer} onUpdate={onUpdateMock} />);

    const statusSelect = screen.getByDisplayValue('Active Care');
    fireEvent.change(statusSelect, { target: { value: 'paused' } });

    await waitFor(() => {
      expect(apiModule.apiFetch).toHaveBeenCalledWith(
        '/customers/cust-uuid-1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status: 'paused' }),
        })
      );
      expect(onUpdateMock).toHaveBeenCalled();
    });
  });

  it('should render unassigned state and open assignment modal when no caregiver is assigned', async () => {
    const unassignedCustomer: CustomerData = {
      ...mockCustomer,
      assignedCaregiverId: null,
      assignedCaregiver: null,
      status: 'pending',
    };

    (apiModule.apiFetch as jest.Mock).mockImplementation((url: string) => {
      if (url.startsWith('/feedback')) {
        return Promise.resolve({ success: true, data: [] });
      }
      if (url.startsWith('/caregivers')) {
        return Promise.resolve({
          success: true,
          data: [
            {
              id: 'cg-available-1',
              fullName: 'Binu Jacob',
              gender: 'male',
              experienceYears: 4,
              dailyRate: 950,
              status: 'available',
              district: 'Thiruvananthapuram',
            },
          ],
        });
      }
      return Promise.resolve({ success: true, data: {} });
    });

    render(<CustomerDetailView customer={unassignedCustomer} />);

    expect(screen.getByText('No Caregiver Assigned')).toBeTruthy();
    const assignBtn = screen.getByRole('button', { name: /Assign Available Caregiver/i });
    expect(assignBtn).toBeTruthy();

    fireEvent.click(assignBtn);

    await waitFor(() => {
      expect(screen.getByText(/Select Caregiver for Devaki Amma/i)).toBeTruthy();
      expect(screen.getByText('Binu Jacob')).toBeTruthy();
    });
  });

  it('should render assignment and replacement history timeline with replacement chain info', async () => {
    const customerWithHistory: CustomerData = {
      ...mockCustomer,
      assignments: [
        {
          id: 'asgn-active',
          caregiverId: 'cg-uuid-1',
          startDate: '2026-09-15',
          status: 'active',
          caregiverDailyRate: 1100,
          caregiver: {
            id: 'cg-uuid-1',
            fullName: 'Anitha Rajan, GNM',
            phone: '+919847888999',
          },
        },
        {
          id: 'asgn-old',
          caregiverId: 'cg-uuid-2',
          startDate: '2026-09-01',
          endDate: '2026-09-15',
          status: 'replaced',
          replacedById: 'asgn-active',
          replacementReason: 'Sick leave',
          caregiverDailyRate: 1000,
          caregiver: {
            id: 'cg-uuid-2',
            fullName: 'Priya Lakshmi',
            phone: '+919847111222',
          },
          replacedBy: {
            id: 'asgn-active',
            caregiverId: 'cg-uuid-1',
            startDate: '2026-09-15',
            caregiver: {
              id: 'cg-uuid-1',
              fullName: 'Anitha Rajan, GNM',
              phone: '+919847888999',
            },
          },
        },
      ],
    };

    (apiModule.apiFetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/assignments/customer/')) {
        return Promise.resolve({ success: true, data: customerWithHistory.assignments });
      }
      return Promise.resolve({ success: true, data: [] });
    });

    render(<CustomerDetailView customer={customerWithHistory} />);

    expect(screen.getByText('Assignment & Replacement History')).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText('2 Placements')).toBeTruthy();
      expect(screen.getByText('Priya Lakshmi')).toBeTruthy();
      expect(screen.getByText(/↳ Replaced by:/i)).toBeTruthy();
      expect(screen.getByText(/Reason: Sick leave/i)).toBeTruthy();
      expect(screen.getByText(/Absence Context: Medical \/ Sick Leave/i)).toBeTruthy();
    });

    // Verify Find Replacement (Smart Matching) button is rendered and links to matching engine with assignmentId
    const replacementLinks = screen.getAllByRole('link', {
      name: /Find Replacement \(Smart Matching\)/i,
    });
    expect(replacementLinks.length).toBeGreaterThan(0);
    expect(replacementLinks[0].getAttribute('href')).toContain(
      '/dashboard/matching?assignmentId=asgn-active'
    );
  });

  it('should render SLA status box and allow immediate escalation to Owner when SLA is pending', async () => {
    const customerWithPendingSla: CustomerData = {
      ...mockCustomer,
      assignments: [
        {
          id: 'asgn-sla-1',
          caregiverId: 'cg-uuid-1',
          startDate: '2026-09-15',
          status: 'active',
          replacementSlaStatus: 'pending',
          replacementSlaMinutes: 120,
          absenceReason: 'Caregiver Medical Emergency',
          absenceNotes: 'High fever and hospitalized',
          caregiver: {
            id: 'cg-uuid-1',
            fullName: 'Anitha Rajan, GNM',
            phone: '+919847888999',
          },
        },
      ],
    };

    (apiModule.apiFetch as jest.Mock).mockImplementation((url: string, options?: any) => {
      if (url.includes('/assignments/customer/')) {
        return Promise.resolve({ success: true, data: customerWithPendingSla.assignments });
      }
      if (url === '/assignments/asgn-sla-1/escalate') {
        return Promise.resolve({ success: true });
      }
      return Promise.resolve({ success: true, data: [] });
    });

    render(<CustomerDetailView customer={customerWithPendingSla} />);

    await waitFor(() => {
      expect(screen.getByText(/Replacement SLA Active \(120m Window\)/i)).toBeTruthy();
      expect(screen.getByText(/Caregiver Medical Emergency/i)).toBeTruthy();
      expect(
        screen.getByRole('button', { name: /Escalate to Owner Now via WhatsApp\/Push/i })
      ).toBeTruthy();
    });

    const escalateBtn = screen.getByRole('button', {
      name: /Escalate to Owner Now via WhatsApp\/Push/i,
    });
    fireEvent.click(escalateBtn);

    await waitFor(() => {
      expect(apiModule.apiFetch).toHaveBeenCalledWith(
        '/assignments/asgn-sla-1/escalate',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('should allow reporting absence and starting SLA timer via modal', async () => {
    const customerActive: CustomerData = {
      ...mockCustomer,
      assignments: [
        {
          id: 'asgn-to-report',
          caregiverId: 'cg-uuid-1',
          startDate: '2026-09-15',
          status: 'active',
          replacementSlaStatus: 'none',
          caregiver: {
            id: 'cg-uuid-1',
            fullName: 'Anitha Rajan, GNM',
            phone: '+919847888999',
          },
        },
      ],
    };

    (apiModule.apiFetch as jest.Mock).mockImplementation((url: string, options?: any) => {
      if (url.includes('/assignments/customer/')) {
        return Promise.resolve({ success: true, data: customerActive.assignments });
      }
      if (url === '/assignments/asgn-to-report/request-replacement') {
        return Promise.resolve({
          success: true,
          data: { ...customerActive.assignments![0], replacementSlaStatus: 'pending' },
        });
      }
      return Promise.resolve({ success: true, data: [] });
    });

    render(<CustomerDetailView customer={customerActive} />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Report Absence \/ Start SLA Timer/i })
      ).toBeTruthy();
    });

    // Open modal
    fireEvent.click(screen.getByRole('button', { name: /Report Absence \/ Start SLA Timer/i }));

    expect(screen.getByText(/Report Absence & Start SLA Timer/i)).toBeTruthy();

    // Select absence reason and notes
    const reasonSelect = screen.getByLabelText(/Absence Reason/i);
    fireEvent.change(reasonSelect, { target: { value: 'quit' } });

    const notesInput = screen.getByPlaceholderText(/Caregiver called in with fever/i);
    fireEvent.change(notesInput, { target: { value: 'Staff relocated to Bangalore' } });

    // Submit
    const activateBtn = screen.getByRole('button', { name: /Activate SLA Timer/i });
    fireEvent.click(activateBtn);

    await waitFor(() => {
      expect(apiModule.apiFetch).toHaveBeenCalledWith(
        '/assignments/asgn-to-report/request-replacement',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            absenceReason: 'quit',
            absenceNotes: 'Staff relocated to Bangalore',
            slaMinutes: 120,
          }),
        })
      );
    });
  });

  it('should render distinct absence reason badges (leave / quit / complaint) with context notes in history timeline (Phase 10 Point 4)', async () => {
    const customerWithDetailedAbsences: CustomerData = {
      ...mockCustomer,
      assignments: [
        {
          id: 'asgn-quit',
          caregiverId: 'cg-uuid-2',
          startDate: '2026-08-01',
          endDate: '2026-08-20',
          status: 'replaced',
          absenceReason: 'quit',
          absenceNotes: 'Caregiver resigned on short notice to relocate',
          replacementReason: 'quit',
          caregiver: {
            id: 'cg-uuid-2',
            fullName: 'Rahul Varma',
            phone: '+919847111333',
          },
          replacedBy: {
            id: 'asgn-complaint',
            caregiverId: 'cg-uuid-3',
            startDate: '2026-08-20',
            caregiver: {
              id: 'cg-uuid-3',
              fullName: 'Mini Joseph',
              phone: '+919847444555',
            },
          },
        },
        {
          id: 'asgn-complaint',
          caregiverId: 'cg-uuid-3',
          startDate: '2026-08-20',
          endDate: '2026-09-01',
          status: 'replaced',
          absenceReason: 'complaint',
          absenceNotes: 'Family reported punctuality issues and medication timing delay',
          replacementReason: 'complaint',
          caregiver: {
            id: 'cg-uuid-3',
            fullName: 'Mini Joseph',
            phone: '+919847444555',
          },
          replacedBy: {
            id: 'asgn-active',
            caregiverId: 'cg-uuid-1',
            startDate: '2026-09-01',
            caregiver: {
              id: 'cg-uuid-1',
              fullName: 'Anitha Rajan, GNM',
              phone: '+919847888999',
            },
          },
        },
      ],
    };

    (apiModule.apiFetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/assignments/customer/')) {
        return Promise.resolve({ success: true, data: customerWithDetailedAbsences.assignments });
      }
      return Promise.resolve({ success: true, data: [] });
    });

    render(<CustomerDetailView customer={customerWithDetailedAbsences} />);

    await waitFor(() => {
      // Check Quit badge and notes
      expect(screen.getByText(/Absence Context: Caregiver Resigned \/ Left Post/i)).toBeTruthy();
      expect(screen.getByText(/Caregiver resigned on short notice to relocate/i)).toBeTruthy();

      // Check Complaint badge and notes
      expect(screen.getByText(/Absence Context: Customer Complaint \/ Quality Issue/i)).toBeTruthy();
      expect(screen.getByText(/Family reported punctuality issues and medication timing delay/i)).toBeTruthy();
    });
  });
});

