import './global.css';
import type { Metadata, Viewport } from 'next';
import { PwaInstallPrompt } from '../components/pwa-install-prompt';

export const metadata: Metadata = {
  title: 'Caregiver Agency Platform — Verified In-Home Nursing & Healthcare',
  description:
    'Dedicated multi-tenant home-nursing and caregiver management platform. Request compassionate, verified caregivers for elderly assistance, post-operative, and bedridden patient care.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192.svg',
    apple: '/icons/icon-192.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Caregiver Agency',
  },
  keywords: [
    'caregiver agency',
    'home nursing kerala',
    'elderly care',
    'bedridden patient care',
    'palliative care',
    'verified nurse',
  ],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#14b8a6',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        {children}
        <PwaInstallPrompt />
      </body>
    </html>
  );
}

