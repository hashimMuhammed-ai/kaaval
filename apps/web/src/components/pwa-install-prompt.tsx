'use client';

import React, { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    // 1. Register Service Worker in supporting browsers
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            // Check for service worker updates
            registration.onupdatefound = () => {
              const installingWorker = registration.installing;
              if (installingWorker) {
                installingWorker.onstatechange = () => {
                  if (
                    installingWorker.state === 'installed' &&
                    navigator.serviceWorker.controller
                  ) {
                    // New SW update available
                  }
                };
              }
            };
          })
          .catch((error) => {
            // SW registration failed (non-critical in dev/testing environments)
            console.debug('ServiceWorker registration error:', error);
          });
      });
    }

    // 2. Check if already running in standalone mode (installed PWA)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 3. Listen for the native beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);

      // Check if user previously dismissed prompt in this session
      const dismissed = sessionStorage.getItem('pwa_prompt_dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener(
      'beforeinstallprompt',
      handleBeforeInstallPrompt
    );

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setShowPrompt(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (!showPrompt || isInstalled) {
    return null;
  }

  return (
    <div
      id="pwa-install-banner"
      style={bannerContainerStyle}
      role="dialog"
      aria-labelledby="pwa-prompt-title"
      aria-describedby="pwa-prompt-desc"
    >
      <div style={bannerContentStyle}>
        <div style={iconContainerStyle}>
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--primary-400)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            <path d="M12 5v6" />
            <path d="M9 8h6" />
          </svg>
        </div>

        <div style={textContainerStyle}>
          <div id="pwa-prompt-title" style={titleStyle}>
            Install Caregiver Agency App
          </div>
          <p id="pwa-prompt-desc" style={descStyle}>
            Fast offline access, caregiver scheduling & direct emergency contact
            on your home screen.
          </p>
        </div>

        <div style={buttonGroupStyle}>
          <button
            id="pwa-install-btn"
            onClick={handleInstallClick}
            style={installButtonStyle}
          >
            Install
          </button>
          <button
            id="pwa-dismiss-btn"
            onClick={handleDismiss}
            style={dismissButtonStyle}
            aria-label="Dismiss installation prompt"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

const bannerContainerStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: '1.25rem',
  left: '50%',
  transform: 'translateX(-50%)',
  width: 'calc(100% - 2.5rem)',
  maxWidth: '560px',
  zIndex: 9999,
  animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
};

const bannerContentStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  background: 'rgba(17, 26, 46, 0.92)',
  border: '1px solid rgba(20, 184, 166, 0.35)',
  backdropFilter: 'blur(16px)',
  borderRadius: 'var(--radius-lg)',
  padding: '0.85rem 1.25rem',
  boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.5), 0 0 20px rgba(20, 184, 166, 0.2)',
};

const iconContainerStyle: React.CSSProperties = {
  flexShrink: 0,
  width: '44px',
  height: '44px',
  borderRadius: 'var(--radius-md)',
  background: 'rgba(20, 184, 166, 0.12)',
  border: '1px solid rgba(20, 184, 166, 0.25)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const textContainerStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const titleStyle: React.CSSProperties = {
  fontSize: '0.925rem',
  fontWeight: 700,
  color: 'var(--text-main)',
  lineHeight: 1.3,
};

const descStyle: React.CSSProperties = {
  fontSize: '0.785rem',
  color: 'var(--text-secondary)',
  lineHeight: 1.35,
  marginTop: '0.2rem',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const buttonGroupStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  flexShrink: 0,
};

const installButtonStyle: React.CSSProperties = {
  padding: '0.45rem 0.95rem',
  background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))',
  color: '#ffffff',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  fontWeight: 600,
  fontSize: '0.825rem',
  cursor: 'pointer',
  boxShadow: '0 2px 8px var(--primary-glow)',
  whiteSpace: 'nowrap',
};

const dismissButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--text-muted)',
  fontSize: '0.875rem',
  padding: '0.4rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 'var(--radius-sm)',
};
