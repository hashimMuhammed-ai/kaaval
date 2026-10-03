import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSubdomain } from './utils/subdomain';

/**
 * Next.js Edge Middleware for multi-tenant subdomain routing.
 * Extracts the tenant subdomain from the Host header and forwards it downstream
 * in both request and response headers (x-tenant-subdomain).
 */
export function middleware(request: NextRequest) {
  const host =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    '';

  const subdomain = getSubdomain(host);

  const requestHeaders = new Headers(request.headers);
  if (subdomain) {
    requestHeaders.set('x-tenant-subdomain', subdomain);
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (subdomain) {
    response.headers.set('x-tenant-subdomain', subdomain);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - PWA assets: manifest.json, sw.js, icons
     */
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons).*)',
  ],
};
