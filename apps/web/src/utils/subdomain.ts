/**
 * Reserved system subdomains and path segments that are not agency tenants.
 */
export const RESERVED_SUBDOMAINS = new Set([
  'www',
  'api',
  'admin',
  'app',
  'platform',
  'mail',
  'static',
  'assets',
  'cdn',
  'dashboard',
  'status',
]);

/**
 * Extracts the tenant slug or subdomain from the current URL path or hostname.
 * Supports path-based routing (/t/:tenantSlug) and subdomain routing (subdomain.domain.com).
 *
 * Path-based examples:
 * - "/t/carekerala" => "carekerala"
 * - "/t/carekerala/dashboard" => "carekerala"
 *
 * Subdomain examples:
 * - "carekerala.caregiverplatform.com" => "carekerala"
 * - "carekerala.localhost:4200" => "carekerala"
 */
export function getTenantSlug(
  host?: string | null,
  pathname?: string | null
): string | null {
  // 1. Check path-based routing (/t/:tenantSlug/...)
  const currentPath =
    pathname ||
    (typeof window !== 'undefined' ? window.location.pathname : '');

  if (currentPath) {
    const match = currentPath.match(/^\/t\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      const slug = match[1].toLowerCase().trim();
      if (isValidSubdomain(slug)) {
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('tenant_slug', slug);
          } catch {
            // Ignore localStorage errors
          }
        }
        return slug;
      }
    }
  }

  // 2. Check hostname subdomain routing (for future or local custom domain)
  const sub = getSubdomain(host);
  if (sub) {
    return sub;
  }

  // 3. Fallback to localStorage if in browser
  if (typeof window !== 'undefined') {
    const stored =
      localStorage.getItem('tenant_slug') ||
      localStorage.getItem('tenant_subdomain');
    if (stored && isValidSubdomain(stored)) {
      return stored.toLowerCase().trim();
    }
  }

  return null;
}

/**
 * Generates an agency-scoped URL path based on current routing mode.
 * In path-based mode (/t/:tenantSlug), prefixes path with /t/:slug.
 * When a custom domain with subdomains is active, returns unchanged path.
 */
export function tenantPath(path: string, explicitSlug?: string): string {
  const slug = explicitSlug || getTenantSlug();
  if (!slug) return path;

  // Don't modify external URLs or api routes
  if (path.startsWith('http') || path.startsWith('/api/')) return path;

  // If already prefixed with /t/slug, return as is
  if (path.startsWith(`/t/${slug}`)) return path;

  // If path is '/', return `/t/${slug}`
  if (path === '/' || path === '') return `/t/${slug}`;

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `/t/${slug}${cleanPath}`;
}

/**
 * Extracts the tenant subdomain from a hostname (works in both browser and server environments).
 *
 * Examples:
 * - "carekerala.caregiverplatform.com" => "carekerala"
 * - "carekerala.localhost:4200" => "carekerala"
 * - "carekerala.localhost" => "carekerala"
 * - "localhost:4200" => null
 * - "www.caregiverplatform.com" => null
 */
export function getSubdomain(host?: string | null): string | null {
  // When no host is explicitly passed in browser, check if path-based slug is present
  if (!host && typeof window !== 'undefined') {
    const match = window.location.pathname.match(/^\/t\/([a-zA-Z0-9_-]+)/);
    if (match && match[1] && isValidSubdomain(match[1])) {
      return match[1].toLowerCase().trim();
    }
  }

  const hostname =
    host ||
    (typeof window !== 'undefined' ? window.location.host : '') ||
    '';

  if (!hostname) {
    return null;
  }

  let clean = hostname.trim().toLowerCase();

  // Strip protocol if present
  if (clean.includes('://')) {
    clean = clean.split('://')[1];
  }

  // Strip port
  if (clean.includes(':')) {
    clean = clean.split(':')[0];
  }

  // Pure IP or localhost root
  if (
    clean === 'localhost' ||
    /^(\d{1,3}\.){3}\d{1,3}$/.test(clean) ||
    clean.includes(':')
  ) {
    return null;
  }

  // Cloud hosting domains (free-tier deployments without wildcard subdomains)
  // e.g. kaaval-web.vercel.app, caregiver-api.onrender.com
  if (
    clean.endsWith('.vercel.app') ||
    clean.endsWith('.onrender.com')
  ) {
    return null;
  }

  // .localhost subdomain (e.g. carekerala.localhost)
  if (clean.endsWith('.localhost')) {
    const parts = clean.split('.');
    if (parts.length >= 2) {
      const sub = parts[0].trim();
      return isValidSubdomain(sub) ? sub : null;
    }
    return null;
  }

  // Base platform domain
  const appDomain = (
    process.env.NEXT_PUBLIC_APP_DOMAIN ||
    'caregiverplatform.com'
  ).toLowerCase().trim();

  if (appDomain && clean.endsWith('.' + appDomain)) {
    const prefix = clean.slice(0, -(appDomain.length + 1));
    const sub = prefix.split('.')[0]?.trim();
    return isValidSubdomain(sub) ? sub : null;
  }

  if (clean === appDomain) {
    return null;
  }

  // Multi-level domain fallback
  const parts = clean.split('.');
  if (parts.length > 2) {
    const sub = parts[0].trim();
    return isValidSubdomain(sub) ? sub : null;
  }

  return null;
}

/**
 * Validates format and checks against reserved names.
 */
export function isValidSubdomain(subdomain?: string | null): boolean {
  if (!subdomain) return false;
  const clean = subdomain.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$|^[a-z0-9]$/.test(clean)) {
    return false;
  }
  return !RESERVED_SUBDOMAINS.has(clean);
}
