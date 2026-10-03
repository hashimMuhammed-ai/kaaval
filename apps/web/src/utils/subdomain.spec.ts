import { getSubdomain, getTenantSlug, tenantPath, isValidSubdomain } from './subdomain';

describe('Frontend Subdomain & Tenant Routing Utilities', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  describe('getSubdomain', () => {
    it('should extract subdomain from platform URL', () => {
      expect(getSubdomain('carekerala.caregiverplatform.com')).toBe('carekerala');
      expect(getSubdomain('https://kerala-care.caregiverplatform.com')).toBe('kerala-care');
    });

    it('should extract subdomain from local dev URL with port', () => {
      expect(getSubdomain('carekerala.localhost:4200')).toBe('carekerala');
      expect(getSubdomain('agency1.localhost')).toBe('agency1');
    });

    it('should return null for root localhost or raw IPs', () => {
      expect(getSubdomain('localhost:4200')).toBeNull();
      expect(getSubdomain('localhost')).toBeNull();
      expect(getSubdomain('127.0.0.1:4200')).toBeNull();
    });

    it('should return null for apex platform domain', () => {
      expect(getSubdomain('caregiverplatform.com')).toBeNull();
    });

    it('should return null for reserved platform subdomains', () => {
      expect(getSubdomain('www.caregiverplatform.com')).toBeNull();
      expect(getSubdomain('api.caregiverplatform.com')).toBeNull();
      expect(getSubdomain('admin.caregiverplatform.com')).toBeNull();
      expect(getSubdomain('app.caregiverplatform.com')).toBeNull();
    });

    it('should return null for free-tier cloud deployment platforms (vercel.app, onrender.com)', () => {
      expect(getSubdomain('kaaval-web.vercel.app')).toBeNull();
      expect(getSubdomain('caregiver-web.vercel.app')).toBeNull();
      expect(getSubdomain('caregiver-api.onrender.com')).toBeNull();
    });
  });

  describe('getTenantSlug (Path-based routing)', () => {
    it('should extract tenant slug from path /t/:tenantSlug', () => {
      expect(getTenantSlug(null, '/t/carekerala')).toBe('carekerala');
      expect(getTenantSlug(null, '/t/carekerala/dashboard')).toBe('carekerala');
      expect(getTenantSlug(null, '/t/carekerala/portal')).toBe('carekerala');
    });

    it('should return null or fallback to subdomain when not in /t/:tenantSlug path', () => {
      expect(getTenantSlug('carekerala.caregiverplatform.com', '/dashboard')).toBe('carekerala');
      expect(getTenantSlug('localhost:3000', '/dashboard')).toBeNull();
    });
  });

  describe('tenantPath', () => {
    it('should prefix path with /t/:slug when tenantSlug is present', () => {
      expect(tenantPath('/dashboard', 'carekerala')).toBe('/t/carekerala/dashboard');
      expect(tenantPath('/login', 'carekerala')).toBe('/t/carekerala/login');
      expect(tenantPath('/', 'carekerala')).toBe('/t/carekerala');
    });

    it('should not duplicate /t/:slug if already prefixed', () => {
      expect(tenantPath('/t/carekerala/dashboard', 'carekerala')).toBe('/t/carekerala/dashboard');
    });
  });

  describe('isValidSubdomain', () => {
    it('should validate format properly', () => {
      expect(isValidSubdomain('carekerala')).toBe(true);
      expect(isValidSubdomain('care-kerala')).toBe(true);
      expect(isValidSubdomain('a')).toBe(true);

      expect(isValidSubdomain('care_kerala')).toBe(false);
      expect(isValidSubdomain('-start')).toBe(false);
      expect(isValidSubdomain('end-')).toBe(false);
      expect(isValidSubdomain('www')).toBe(false);
      expect(isValidSubdomain('api')).toBe(false);
    });
  });
});
