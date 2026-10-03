import { SubdomainExtractor } from './subdomain-extractor';

describe('SubdomainExtractor', () => {
  const baseDomain = 'caregiverplatform.com';

  describe('extract', () => {
    it('should extract subdomain from standard platform domain', () => {
      expect(
        SubdomainExtractor.extract('carekerala.caregiverplatform.com', baseDomain)
      ).toBe('carekerala');
      expect(
        SubdomainExtractor.extract('kerala-care.caregiverplatform.com', baseDomain)
      ).toBe('kerala-care');
    });

    it('should extract subdomain from localhost with port', () => {
      expect(
        SubdomainExtractor.extract('carekerala.localhost:3000', baseDomain)
      ).toBe('carekerala');
      expect(
        SubdomainExtractor.extract('agency1.localhost', baseDomain)
      ).toBe('agency1');
    });

    it('should strip protocol and port', () => {
      expect(
        SubdomainExtractor.extract('https://carekerala.caregiverplatform.com:443', baseDomain)
      ).toBe('carekerala');
      expect(
        SubdomainExtractor.extract('http://carekerala.localhost:4200', baseDomain)
      ).toBe('carekerala');
    });

    it('should return null for apex / root domain', () => {
      expect(
        SubdomainExtractor.extract('caregiverplatform.com', baseDomain)
      ).toBeNull();
      expect(
        SubdomainExtractor.extract('http://caregiverplatform.com', baseDomain)
      ).toBeNull();
    });

    it('should return null for plain localhost and raw IP addresses', () => {
      expect(SubdomainExtractor.extract('localhost:3000')).toBeNull();
      expect(SubdomainExtractor.extract('localhost')).toBeNull();
      expect(SubdomainExtractor.extract('127.0.0.1:3000')).toBeNull();
      expect(SubdomainExtractor.extract('192.168.1.10')).toBeNull();
    });

    it('should return null for reserved system subdomains', () => {
      expect(
        SubdomainExtractor.extract('www.caregiverplatform.com', baseDomain)
      ).toBeNull();
      expect(
        SubdomainExtractor.extract('api.caregiverplatform.com', baseDomain)
      ).toBeNull();
      expect(
        SubdomainExtractor.extract('admin.caregiverplatform.com', baseDomain)
      ).toBeNull();
      expect(
        SubdomainExtractor.extract('app.caregiverplatform.com', baseDomain)
      ).toBeNull();
      expect(
        SubdomainExtractor.extract('static.caregiverplatform.com', baseDomain)
      ).toBeNull();
    });

    it('should return null for invalid, empty, or undefined input', () => {
      expect(SubdomainExtractor.extract(null)).toBeNull();
      expect(SubdomainExtractor.extract(undefined)).toBeNull();
      expect(SubdomainExtractor.extract('')).toBeNull();
    });
  });

  describe('isValidSubdomain', () => {
    it('should accept valid lowercase alphanumeric subdomains with hyphens', () => {
      expect(SubdomainExtractor.isValidSubdomain('carekerala')).toBe(true);
      expect(SubdomainExtractor.isValidSubdomain('care-kerala-2026')).toBe(true);
      expect(SubdomainExtractor.isValidSubdomain('a')).toBe(true);
    });

    it('should reject invalid subdomains with underscores or special characters', () => {
      expect(SubdomainExtractor.isValidSubdomain('care_kerala')).toBe(false);
      expect(SubdomainExtractor.isValidSubdomain('-leading-hyphen')).toBe(false);
      expect(SubdomainExtractor.isValidSubdomain('trailing-hyphen-')).toBe(false);
      expect(SubdomainExtractor.isValidSubdomain('care@kerala')).toBe(false);
    });

    it('should reject reserved subdomains', () => {
      expect(SubdomainExtractor.isValidSubdomain('www')).toBe(false);
      expect(SubdomainExtractor.isValidSubdomain('api')).toBe(false);
      expect(SubdomainExtractor.isValidSubdomain('admin')).toBe(false);
      expect(SubdomainExtractor.isValidSubdomain('dashboard')).toBe(false);
    });
  });
});
