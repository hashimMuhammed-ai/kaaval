import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import HomePage from '../src/app/page';
import LoginPage from '../src/app/login/page';
import SignupDisabledPage from '../src/app/signup/page';
import ServicesPage from '../src/app/services/page';
import AboutPage from '../src/app/about/page';
import ContactPage from '../src/app/contact/page';
import CaregiverRequestForm from '../src/components/caregiver-request-form';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  usePathname: () => '/',
}));

describe('Public Site Entrypoints Specification', () => {
  describe('HomePage (Request a Caregiver Intake Surface)', () => {
    it('should render the public landing page with caregiver request form', () => {
      const { baseElement } = render(<HomePage />);
      expect(baseElement).toBeTruthy();

      // Heading and primary CTA
      expect(
        screen.getByRole('heading', { name: /Compassionate, Certified Caregivers/i })
      ).toBeTruthy();

      // Multi-step form elements
      expect(screen.getByText(/Elderly Daily Assistance/i)).toBeTruthy();
      expect(screen.getByRole('button', { name: /Continue to Patient Details/i })).toBeTruthy();

      // Staff login link must be present in navigation
      const loginLinks = screen.getAllByRole('link', { name: /Staff/i });
      expect(loginLinks.length).toBeGreaterThan(0);

      // EXPLICIT CHECK: There should be zero public signup / register buttons
      expect(screen.queryByRole('link', { name: /^Sign Up$/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /^Sign Up$/i })).toBeNull();
      expect(screen.queryByRole('link', { name: /^Register$/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /^Register$/i })).toBeNull();
    });
  });

  describe('CaregiverRequestForm (Service, Location, Duration, Gender, Start Date, Phone)', () => {
    it('should render step 1 with service types, duration, and gender preference', () => {
      render(<CaregiverRequestForm />);

      // Step 1 title
      expect(screen.getByText(/What type of in-home care is needed\?/i)).toBeTruthy();

      // Required fields in Step 1
      expect(screen.getByLabelText(/Required Shift \/ Duration/i)).toBeTruthy();
      expect(screen.getByLabelText(/Caregiver Gender Preference/i)).toBeTruthy();
      expect(screen.getByText(/Elderly Daily Assistance/i)).toBeTruthy();
      expect(screen.getByText(/Bedridden & Palliative Care/i)).toBeTruthy();
      expect(screen.getByRole('button', { name: /Continue to Patient Details/i })).toBeTruthy();
    });

    it('should navigate from Step 1 to Step 2 and validate patient name and location', () => {
      render(<CaregiverRequestForm />);

      // Select Bedridden Care
      fireEvent.click(screen.getByText(/Bedridden & Palliative Care/i));

      // Click Continue to Patient Details
      fireEvent.click(screen.getByRole('button', { name: /Continue to Patient Details/i }));

      // Step 2 elements: Patient & Location
      expect(screen.getByText(/Patient Information & Location/i)).toBeTruthy();
      expect(screen.getByLabelText(/Patient Full Name/i)).toBeTruthy();
      expect(screen.getByLabelText(/District in Kerala/i)).toBeTruthy();
      expect(screen.getByLabelText(/When Should Care Begin\?/i)).toBeTruthy();
      expect(screen.getByRole('button', { name: /Continue to Contact/i })).toBeTruthy();
    });

    it('should navigate through Step 3 and display review in Step 4 with phone and contact details', () => {
      render(<CaregiverRequestForm />);

      // Step 1 -> Step 2
      fireEvent.click(screen.getByRole('button', { name: /Continue to Patient Details/i }));

      // Fill Step 2 Patient & Location
      fireEvent.change(screen.getByLabelText(/Patient Full Name/i), { target: { value: 'George Mathew' } });
      fireEvent.change(screen.getByLabelText(/District in Kerala/i), { target: { value: 'Thrissur' } });
      fireEvent.click(screen.getByRole('button', { name: /Continue to Contact/i }));

      // Step 3: Family Contact & Phone
      expect(screen.getByRole('heading', { name: /Family Contact Details/i })).toBeTruthy();
      expect(screen.getByLabelText(/Your Full Name \(Family Contact\)/i)).toBeTruthy();
      expect(screen.getByLabelText(/WhatsApp \/ Phone Number/i)).toBeTruthy();

      // Fill Step 3 Contact
      fireEvent.change(screen.getByLabelText(/Your Full Name \(Family Contact\)/i), { target: { value: 'Annie Mathew' } });
      fireEvent.change(screen.getByLabelText(/WhatsApp \/ Phone Number/i), { target: { value: '9847123456' } });
      fireEvent.click(screen.getByRole('button', { name: /Review Request Details/i }));

      // Step 4: Review summary
      expect(screen.getByText(/Review Your Care Request/i)).toBeTruthy();
      expect(screen.getByText(/George Mathew/i)).toBeTruthy();
      expect(screen.getByText(/Thrissur/i)).toBeTruthy();
      expect(screen.getByRole('button', { name: /Submit Care Request/i })).toBeTruthy();
    });
  });

  describe('ServicesPage (Public Marketing Services Catalog)', () => {
    it('should render services catalog with care tiers, pricing, and FAQs', () => {
      render(<ServicesPage />);

      expect(
        screen.getByRole('heading', { name: /Professional Home Nursing/i })
      ).toBeTruthy();

      expect(screen.getByText(/Choosing The Right Care Level/i)).toBeTruthy();
      expect(screen.getByText(/Frequently Asked Questions/i)).toBeTruthy();
      expect(screen.getByRole('heading', { name: /Specialized Clinical Nursing/i })).toBeTruthy();
    });
  });

  describe('AboutPage (Mission & 4-Stage Vetting)', () => {
    it('should render agency mission, 4-stage vetting protocol, and Kerala districts', () => {
      render(<AboutPage />);

      expect(
        screen.getByRole('heading', { name: /Restoring Peace of Mind to/i })
      ).toBeTruthy();

      expect(screen.getByText(/Our 4-Stage Caregiver Vetting Protocol/i)).toBeTruthy();
      expect(screen.getByText(/Why We Enforce A Zero Public Signup Architecture/i)).toBeTruthy();
      expect(screen.getByText(/Active Across All 14 Kerala Districts/i)).toBeTruthy();
    });
  });

  describe('ContactPage (24/7 Helpline & Inquiry Form)', () => {
    it('should render emergency helpline, WhatsApp chat, and inquiry form', () => {
      render(<ContactPage />);

      expect(
        screen.getByRole('heading', { name: /We’re Here When Your Family/i })
      ).toBeTruthy();

      expect(screen.getByText(/Emergency Care Hotline/i)).toBeTruthy();
      expect(screen.getByText(/WhatsApp Fast Desk/i)).toBeTruthy();
      expect(screen.getByText(/Regional Coordination Offices/i)).toBeTruthy();
      expect(screen.getByRole('button', { name: /Request Callback/i })).toBeTruthy();
    });
  });

  describe('LoginPage (Staff & Caregiver Entrypoint)', () => {
    it('should render staff login page with email, password, and no public registration link', () => {
      render(<LoginPage />);

      expect(screen.getByRole('heading', { name: /Staff & Caregiver Login/i })).toBeTruthy();
      expect(screen.getByLabelText(/Email Address/i)).toBeTruthy();
      expect(screen.getByLabelText(/Password/i)).toBeTruthy();
      expect(screen.getByRole('button', { name: /Sign In/i })).toBeTruthy();

      // Zero public signup reassurance
      expect(screen.getByText(/Accounts are provisioned by agency management\. Zero public signup\./i)).toBeTruthy();
      expect(screen.queryByRole('link', { name: /Create an Account/i })).toBeNull();
    });
  });

  describe('SignupDisabledPage (Public Registration Blocker)', () => {
    it('should explicitly inform visitors that public registration is disabled', () => {
      render(<SignupDisabledPage />);

      expect(screen.getByRole('heading', { name: /Public Registration Is Disabled/i })).toBeTruthy();
      expect(screen.getByText(/To safeguard vulnerable patients and ensure strict healthcare compliance/i)).toBeTruthy();
      expect(screen.getAllByRole('link', { name: /Request a Caregiver/i }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole('link', { name: /Staff/i }).length).toBeGreaterThan(0);
    });
  });
});


