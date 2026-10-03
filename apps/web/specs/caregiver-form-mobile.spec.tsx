import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NewCaregiverPage from '../src/app/dashboard/caregivers/new/page';
import { apiFetch } from '../src/utils/api';

jest.mock('../src/utils/api', () => ({
  apiFetch: jest.fn(),
}));

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('NewCaregiverPage - Mobile Form & Document Capture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders responsive onboarding form with personal, location, and skills sections', () => {
    render(<NewCaregiverPage />);

    expect(
      screen.getByRole('heading', { name: /Add Caregiver & Generate Portal Login/i })
    ).toBeTruthy();

    expect(screen.getByText(/Personal & Contact Details/i)).toBeTruthy();
    expect(screen.getByText(/Location & Spatial Coordinates/i)).toBeTruthy();
    expect(screen.getByText(/Skills, Experience & Rate/i)).toBeTruthy();
  });

  it('provides native camera and gallery file triggers for document capture upon caregiver registration', async () => {
    (apiFetch as jest.Mock).mockResolvedValueOnce({
      caregiver: {
        id: 'cg-new-123',
        fullName: 'Lakshmi Nair',
        phone: '+919847112233',
        status: 'available',
        temporaryCredentials: {
          username: 'cg_9847112233',
          temporaryPassword: 'TempPass123!',
          accessCode: 'ACC-891',
          portalUrl: 'https://care.app/login',
          whatsappOnboardingMessage: 'Welcome to agency platform',
        },
      },
    });

    render(<NewCaregiverPage />);

    // Fill minimum required fields
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Priya Lakshmi/i), {
      target: { value: 'Lakshmi Nair' },
    });
    fireEvent.change(screen.getByPlaceholderText(/\+91 98471 23456/i), {
      target: { value: '+919847112233' },
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Save Profile & Issue Portal Login/i }));

    await waitFor(() => {
      expect(screen.getByText(/Lakshmi Nair Registered Successfully/i)).toBeTruthy();
    });

    // Check camera capture trigger
    const cameraBtn = document.getElementById('btn-upload-camera');
    expect(cameraBtn).toBeTruthy();
    expect(cameraBtn?.textContent).toContain('Snap with Camera');

    // Check file/PDF trigger
    const fileBtn = document.getElementById('btn-upload-file');
    expect(fileBtn).toBeTruthy();
    expect(fileBtn?.textContent).toContain('Browse Document');

    // Check hidden camera input with capture attribute
    const cameraInput = document.getElementById('new-caregiver-camera-file') as HTMLInputElement;
    expect(cameraInput).toBeTruthy();
    expect(cameraInput.getAttribute('capture')).toBe('environment');
    expect(cameraInput.getAttribute('accept')).toBe('image/*');
  });
});
