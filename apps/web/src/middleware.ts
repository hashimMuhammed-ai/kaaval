import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSubdomain, isValidSubdomain } from './utils/subdomain';

/**
 * Next.js Edge Middleware for multi-tenant path-based and subdomain routing.
 *
 * 1. Path-based routing (/t/:tenantSlug/...):
 *    Extracts the tenant slug from URL path, forwards it in x-tenant-slug and
 *    x-tenant-subdomain headers, and rewrites internally to the target route.
 *    e.g. /t/keralacare -> rewrites to /
 *    e.g. /t/keralacare/dashboard -> rewrites to /dashboard
 *
 * 2. Subdomain routing (tenantSlug.domain.com):
 *    Preserved for when custom domain with wildcard subdomains is purchased.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    '';

  const hostSubdomain = getSubdomain(host);

  // 1. Check for path-based tenant: /t/:tenantSlug(/.*)?
  const pathMatch = pathname.match(/^\/t\/([a-zA-Z0-9_-]+)(\/.*)?$/);
  if (pathMatch) {
    const slug = pathMatch[1].toLowerCase().trim();
    if (isValidSubdomain(slug)) {
      const targetSubPath = pathMatch[2] || '/';

      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-tenant-slug', slug);
      requestHeaders.set('x-tenant-subdomain', slug);

      const rewriteUrl = new URL(targetSubPath, request.url);
      const response = NextResponse.rewrite(rewriteUrl, {
        request: {
          headers: requestHeaders,
        },
      });

      response.headers.set('x-tenant-slug', slug);
      response.headers.set('x-tenant-subdomain', slug);
      return response;
    }
  }

  // 2. Subdomain-based tenant fallback
  const requestHeaders = new Headers(request.headers);
  if (hostSubdomain) {
    requestHeaders.set('x-tenant-slug', hostSubdomain);
    requestHeaders.set('x-tenant-subdomain', hostSubdomain);
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (hostSubdomain) {
    response.headers.set('x-tenant-slug', hostSubdomain);
    response.headers.set('x-tenant-subdomain', hostSubdomain);
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
