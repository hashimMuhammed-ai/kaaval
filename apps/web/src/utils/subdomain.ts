/**
 * Reserved system subdomains that are not agency tenants.
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
