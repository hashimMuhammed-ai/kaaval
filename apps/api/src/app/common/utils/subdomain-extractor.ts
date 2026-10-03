/**
 * Utility for parsing and extracting tenant subdomains from HTTP Host headers, URLs, and hostnames.
 */
export class SubdomainExtractor {
  /**
   * System-reserved subdomains that should never resolve to a tenant.
   */
  static readonly RESERVED_SUBDOMAINS = new Set([
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
    'test',
    'demo',
  ]);

  /**
   * Extracts the tenant subdomain from an incoming host string.
   *
   * Examples:
   * - "carekerala.caregiverplatform.com" => "carekerala"
   * - "carekerala.localhost:3000" => "carekerala"
   * - "carekerala.localhost" => "carekerala"
   * - "localhost:3000" => null
   * - "127.0.0.1:3000" => null
   * - "www.caregiverplatform.com" => null (reserved)
   * - "api.caregiverplatform.com" => null (reserved)
   * - "caregiverplatform.com" => null (apex)
   */
  static extract(
    rawHost: string | null | undefined,
    baseDomain?: string
  ): string | null {
    if (!rawHost) {
      return null;
    }

    // 1. Clean host: strip protocol (if present), strip port, trim, lowercase
    let host = rawHost.trim().toLowerCase();
    if (host.includes('://')) {
      try {
        host = new URL(host).host;
      } catch {
        host = host.split('://')[1] || host;
      }
    }

    // Strip port (e.g., localhost:3000 => localhost)
    if (host.includes(':')) {
      host = host.split(':')[0];
    }

    if (!host) {
      return null;
    }

    // 2. Ignore pure IP addresses (IPv4 or IPv6)
    const isIPv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(host);
    const isIPv6 = host.startsWith('[') || host.includes(':');
    if (isIPv4 || isIPv6) {
      return null;
    }

    // 3. Handle localhost subdomain (e.g. "agency.localhost")
    if (host.endsWith('.localhost')) {
      const parts = host.split('.');
      if (parts.length >= 2) {
        const sub = parts[0].trim();
        return this.isValidSubdomain(sub) ? sub : null;
      }
      return null;
    }

    if (host === 'localhost') {
      return null;
    }

    // Free-tier cloud hosting domains that are not tenant subdomains
    if (
      host.endsWith('.vercel.app') ||
      host.endsWith('.onrender.com') ||
      host.endsWith('.upstash.io') ||
      host.endsWith('.neon.tech')
    ) {
      return null;
    }

    // 4. Handle configured base app domain (e.g. "caregiverplatform.com" or process.env.APP_DOMAIN)
    const effectiveBaseDomain = (
      baseDomain ||
      process.env.APP_DOMAIN ||
      'caregiverplatform.com'
    )
      .toLowerCase()
      .trim()
      .replace(/^https?:\/\//, '')
      .split(':')[0];

    if (effectiveBaseDomain && host.endsWith('.' + effectiveBaseDomain)) {
      const prefix = host.slice(0, -(effectiveBaseDomain.length + 1));
      // First segment of prefix is the tenant subdomain
      const sub = prefix.split('.')[0]?.trim();
      return this.isValidSubdomain(sub) ? sub : null;
    }

    // If host matches base domain exactly (apex domain), no subdomain
    if (effectiveBaseDomain && host === effectiveBaseDomain) {
      return null;
    }

    // 5. Generic multi-level domain fallback (e.g., "agency.something.com")
    const hostParts = host.split('.');
    if (hostParts.length > 2) {
      const candidate = hostParts[0].trim();
      return this.isValidSubdomain(candidate) ? candidate : null;
    }

    return null;
  }

  /**
   * Checks whether candidate is a valid, non-reserved tenant subdomain.
   */
  static isValidSubdomain(subdomain: string | null | undefined): boolean {
    if (!subdomain) {
      return false;
    }

    const clean = subdomain.trim().toLowerCase();

    // Must be 1-63 chars, start & end with alphanumeric, only allow alphanumeric and hyphens
    if (!/^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$|^[a-z0-9]$/.test(clean)) {
      return false;
    }

    // Check reserved list
    if (this.RESERVED_SUBDOMAINS.has(clean)) {
      return false;
    }

    return true;
  }
}
