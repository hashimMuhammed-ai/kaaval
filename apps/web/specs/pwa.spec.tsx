import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import * as fs from 'fs';
import * as path from 'path';
import OfflinePage from '../src/app/offline/page';
import { PwaInstallPrompt } from '../src/components/pwa-install-prompt';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

describe('PWA Shell Specification', () => {
  describe('manifest.json Configuration', () => {
    const manifestPath = path.resolve(__dirname, '../public/manifest.json');

    it('should exist and be valid JSON with required PWA metadata', () => {
      expect(fs.existsSync(manifestPath)).toBe(true);

      const content = fs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(content);

      expect(manifest.name).toContain('Caregiver');
      expect(manifest.short_name).toBeDefined();
      expect(manifest.start_url).toBe('/');
      expect(manifest.scope).toBe('/');
      expect(manifest.display).toBe('standalone');
      expect(manifest.theme_color).toBe('#ffffff');
      expect(manifest.background_color).toBe('#ffffff');

      // Verify icons
      expect(manifest.icons).toBeInstanceOf(Array);
      expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
      const icon192 = manifest.icons.find((icon: { sizes: string }) => icon.sizes === '192x192');
      const icon512 = manifest.icons.find((icon: { sizes: string }) => icon.sizes === '512x512');
      expect(icon192).toBeDefined();
      expect(icon512).toBeDefined();

      // Verify shortcuts
      expect(manifest.shortcuts).toBeInstanceOf(Array);
      expect(manifest.shortcuts.some((s: { url: string }) => s.url.includes('login'))).toBe(true);
    });

    it('should have corresponding icon assets on disk', () => {
      const icon192Path = path.resolve(__dirname, '../public/icons/icon-192.svg');
      const icon512Path = path.resolve(__dirname, '../public/icons/icon-512.svg');

      expect(fs.existsSync(icon192Path)).toBe(true);
      expect(fs.existsSync(icon512Path)).toBe(true);
    });
  });

  describe('Service Worker (sw.js)', () => {
    const swPath = path.resolve(__dirname, '../public/sw.js');

    it('should exist and configure offline caching strategies', () => {
      expect(fs.existsSync(swPath)).toBe(true);

      const swContent = fs.readFileSync(swPath, 'utf8');
      expect(swContent).toContain("CACHE_NAME = 'caregiver-pwa-v2'");
      expect(swContent).toContain("'/offline'");
      expect(swContent).toContain("addEventListener('install'");
      expect(swContent).toContain("addEventListener('activate'");
      expect(swContent).toContain("addEventListener('fetch'");
      expect(swContent).toContain("request.mode === 'navigate'");
    });

    it('should configure web push notification and notification click listeners for admin lead alerts', () => {
      const swContent = fs.readFileSync(swPath, 'utf8');
      expect(swContent).toContain("addEventListener('push'");
      expect(swContent).toContain("addEventListener('notificationclick'");
      expect(swContent).toContain('showNotification');
      expect(swContent).toContain('dashboard/requests');
    });
  });

  describe('Offline Fallback Page', () => {
    it('should render offline status, emergency helpline, and retry button when offline', () => {
      jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      render(<OfflinePage />);

      expect(screen.getByRole('heading', { name: /No Internet Connection/i })).toBeTruthy();
      expect(screen.getByText(/Device Offline/i)).toBeTruthy();

      // Emergency direct dial for patient safety
      const emergencyBtn = screen.getByRole('link', { name: /\+91 98765 43210/i });
      expect(emergencyBtn).toBeTruthy();
      expect(emergencyBtn.getAttribute('href')).toBe('tel:+919876543210');

      // Retry button
      const retryBtn = screen.getByRole('button', { name: /Retry Connection/i });
      expect(retryBtn).toBeTruthy();
      fireEvent.click(retryBtn);
    });

    it('should handle window online event by showing connection restored badge', () => {
      jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      render(<OfflinePage />);

      expect(screen.getByText(/Device Offline/i)).toBeTruthy();

      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      expect(screen.getByText(/Connection Restored! Reconnecting/i)).toBeTruthy();
    });
  });

  describe('PwaInstallPrompt Component', () => {
    beforeEach(() => {
      sessionStorage.clear();
      // Reset matchMedia mock
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

    it('should show prompt when beforeinstallprompt event is fired', () => {
      render(<PwaInstallPrompt />);

      // Initially prompt is hidden
      expect(screen.queryByText(/Install Caregiver Agency App/i)).toBeNull();

      // Simulate beforeinstallprompt event
      const event = new Event('beforeinstallprompt');
      (event as unknown as { prompt: jest.Mock }).prompt = jest.fn();
      (event as unknown as { userChoice: Promise<{ outcome: string }> }).userChoice =
        Promise.resolve({ outcome: 'dismissed' });

      act(() => {
        window.dispatchEvent(event);
      });

      // Prompt should now be visible
      expect(screen.getByText(/Install Caregiver Agency App/i)).toBeTruthy();
      expect(screen.getByRole('button', { name: /^Install$/i })).toBeTruthy();
    });

    it('should dismiss prompt when dismiss button is clicked', () => {
      render(<PwaInstallPrompt />);

      const event = new Event('beforeinstallprompt');
      (event as unknown as { prompt: jest.Mock }).prompt = jest.fn();
      (event as unknown as { userChoice: Promise<{ outcome: string }> }).userChoice =
        Promise.resolve({ outcome: 'dismissed' });

      act(() => {
        window.dispatchEvent(event);
      });

      const dismissBtn = screen.getByLabelText(/Dismiss installation prompt/i);
      fireEvent.click(dismissBtn);

      expect(screen.queryByText(/Install Caregiver Agency App/i)).toBeNull();
      expect(sessionStorage.getItem('pwa_prompt_dismissed')).toBe('true');
    });

    it('should trigger prompt when install button is clicked', async () => {
      render(<PwaInstallPrompt />);

      const promptMock = jest.fn().mockResolvedValue(undefined);
      const event = new Event('beforeinstallprompt');
      (event as unknown as { prompt: jest.Mock }).prompt = promptMock;
      (event as unknown as { userChoice: Promise<{ outcome: string; platform: string }> }).userChoice =
        Promise.resolve({ outcome: 'accepted', platform: 'web' });

      act(() => {
        window.dispatchEvent(event);
      });

      const installBtn = screen.getByRole('button', { name: /^Install$/i });
      await act(async () => {
        fireEvent.click(installBtn);
      });

      expect(promptMock).toHaveBeenCalled();
    });
  });
});
