import { getSubdomain, isValidSubdomain } from './subdomain';

describe('Frontend Subdomain Utilities', () => {
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
