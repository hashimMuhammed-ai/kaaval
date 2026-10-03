'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getSubdomain } from '../utils/subdomain';

interface NavbarProps {
  agencyName?: string;
  agencyPhone?: string;
}

export default function Navbar({
  agencyName: initialAgencyName,
  agencyPhone: initialAgencyPhone,
}: NavbarProps) {
  const [agencyName, setAgencyName] = useState(initialAgencyName || 'CareKerala');
  const [phone, setPhone] = useState(initialAgencyPhone || '+91 98765 43210');
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const sub = getSubdomain();
    setSubdomain(sub);
    if (sub) {
      // Format friendly name from subdomain if not supplied
      const formatted = sub
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      setAgencyName(`${formatted} Care`);
    }
  }, []);

  const navLinks = [
    { label: 'Home', href: '/', id: 'nav-link-home' },
    { label: 'Services', href: '/services', id: 'nav-link-services' },
    { label: 'About Us', href: '/about', id: 'nav-link-about' },
    { label: 'Contact', href: '/contact', id: 'nav-link-contact' },
  ];

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header
      id="main-header"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: 'rgba(7, 11, 20, 0.88)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '0.85rem 1.5rem',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand / Agency Logo */}
        <Link
          href="/"
          id="brand-logo"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(20, 184, 166, 0.35)',
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
          </div>
          <div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '1.2rem',
                color: '#f8fafc',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
              }}
            >
              {agencyName}
            </div>
            <div
              style={{
                fontSize: '0.725rem',
                color: 'var(--primary-400)',
                fontWeight: 500,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Verified Home Nursing
            </div>
          </div>
        </Link>

        {/* Center Desktop Navigation Links */}
        <nav
          id="desktop-nav"
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '0.5rem',
          }}
          className="desktop-nav-container"
        >
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                id={link.id}
                style={{
                  padding: '0.5rem 0.95rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.9rem',
                  fontWeight: active ? 600 : 500,
                  color: active ? '#ffffff' : 'var(--text-secondary)',
                  backgroundColor: active ? 'rgba(20, 184, 166, 0.14)' : 'transparent',
                  border: active ? '1px solid rgba(20, 184, 166, 0.3)' : '1px solid transparent',
                  transition: 'all 0.2s ease',
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Action Controls */}
        <div className="desktop-actions" style={{ display: 'none', alignItems: 'center', gap: '0.85rem' }}>
          {/* WhatsApp Direct Help */}
          <a
            href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(
              agencyName
            )}%2C%20I%20would%20like%20to%20enquire%20about%20caregiver%20services.`}
            target="_blank"
            rel="noreferrer"
            id="nav-whatsapp-btn"
            className="btn-whatsapp"
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.969.585 1.761.895 2.796.896h.005c3.181 0 5.767-2.586 5.768-5.766.001-1.54-.597-2.988-1.686-4.077-1.089-1.089-2.537-1.688-4.077-1.688zm0-1.872c4.218 0 7.64 3.422 7.64 7.638 0 2.042-.796 3.962-2.242 5.408s-3.366 2.23-5.398 2.23h-.006c-1.31 0-2.597-.34-3.729-.984l-4.148 1.088 1.107-4.045c-.71-1.222-1.085-2.614-1.085-4.041 0-4.216 3.422-7.638 7.64-7.638zm-3.295 4.398c-.183-.406-.375-.414-.548-.422-.142-.006-.304-.006-.467-.006s-.427.061-.65.305c-.223.244-.853.833-.853 2.032 0 1.199.873 2.358.995 2.521.122.163 1.685 2.688 4.144 3.655 2.044.804 2.459.644 2.906.604.447-.041 1.442-.589 1.645-1.159.203-.569.203-1.057.142-1.159-.061-.102-.223-.163-.467-.285-.244-.122-1.442-.711-1.666-.793-.223-.081-.386-.122-.548.122-.163.244-.63 1.159-.772 1.321-.142.163-.284.183-.528.061-.244-.122-1.03-.38-1.963-1.211-.726-.648-1.216-1.449-1.358-1.693-.142-.244-.015-.376.107-.498.11-.11.244-.285.366-.427.122-.142.163-.244.244-.406.081-.163.041-.305-.02-.427-.061-.122-.534-1.322-.743-1.782z" />
            </svg>
            <span>WhatsApp Us</span>
          </a>

          {/* Portal / Staff Login (No public registration link) */}
          <Link
            href="/login"
            id="nav-login-btn"
            className="btn-secondary"
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            <span>Staff Login</span>
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          id="mobile-nav-toggle"
          aria-label="Toggle Navigation Menu"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid var(--border-card)',
            color: 'var(--text-main)',
            cursor: 'pointer',
          }}
          className="mobile-toggle-btn"
        >
          {mobileMenuOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div
          id="mobile-menu-dropdown"
          style={{
            maxWidth: '1200px',
            margin: '0.75rem auto 0',
            padding: '1rem',
            backgroundColor: 'rgba(11, 17, 32, 0.98)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                id={`mobile-${link.id}`}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  padding: '0.65rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.95rem',
                  fontWeight: active ? 600 : 500,
                  color: active ? '#ffffff' : 'var(--text-secondary)',
                  backgroundColor: active ? 'rgba(20, 184, 166, 0.16)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>{link.label}</span>
                {active && (
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--primary-400)',
                    }}
                  />
                )}
              </Link>
            );
          })}

          <div
            style={{
              height: '1px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              margin: '0.5rem 0',
            }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <a
              href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(
                agencyName
              )}%2C%20I%20would%20like%20to%20enquire%20about%20caregiver%20services.`}
              target="_blank"
              rel="noreferrer"
              id="mobile-nav-whatsapp-btn"
              className="btn-whatsapp"
              style={{
                padding: '0.65rem 1rem',
                fontSize: '0.9rem',
                justifyContent: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.969.585 1.761.895 2.796.896h.005c3.181 0 5.767-2.586 5.768-5.766.001-1.54-.597-2.988-1.686-4.077-1.089-1.089-2.537-1.688-4.077-1.688zm0-1.872c4.218 0 7.64 3.422 7.64 7.638 0 2.042-.796 3.962-2.242 5.408s-3.366 2.23-5.398 2.23h-.006c-1.31 0-2.597-.34-3.729-.984l-4.148 1.088 1.107-4.045c-.71-1.222-1.085-2.614-1.085-4.041 0-4.216 3.422-7.638 7.64-7.638zm-3.295 4.398c-.183-.406-.375-.414-.548-.422-.142-.006-.304-.006-.467-.006s-.427.061-.65.305c-.223.244-.853.833-.853 2.032 0 1.199.873 2.358.995 2.521.122.163 1.685 2.688 4.144 3.655 2.044.804 2.459.644 2.906.604.447-.041 1.442-.589 1.645-1.159.203-.569.203-1.057.142-1.159-.061-.102-.223-.163-.467-.285-.244-.122-1.442-.711-1.666-.793-.223-.081-.386-.122-.548.122-.163.244-.63 1.159-.772 1.321-.142.163-.284.183-.528.061-.244-.122-1.03-.38-1.963-1.211-.726-.648-1.216-1.449-1.358-1.693-.142-.244-.015-.376.107-.498.11-.11.244-.285.366-.427.122-.142.163-.244.244-.406.081-.163.041-.305-.02-.427-.061-.122-.534-1.322-.743-1.782z" />
              </svg>
              <span>WhatsApp Us</span>
            </a>

            <Link
              href="/login"
              id="mobile-nav-login-btn"
              onClick={() => setMobileMenuOpen(false)}
              className="btn-secondary"
              style={{
                padding: '0.65rem 1rem',
                fontSize: '0.9rem',
                justifyContent: 'center',
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              <span>Staff Login</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
