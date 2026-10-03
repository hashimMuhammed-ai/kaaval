import { ConfigService } from '@nestjs/config';
import { GeocodingService } from './geocoding.service';
import {
  KERALA_DISTRICTS,
  KERALA_STATE_CENTROID,
  KERALA_TOWNS,
} from './kerala-locations.data';

describe('GeocodingService', () => {
  let service: GeocodingService;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'GEOCODING_PROVIDER') return 'mock';
        if (key === 'GEOCODING_TIMEOUT_MS') return '1000';
        return undefined;
      }),
    };

    service = new GeocodingService(mockConfigService as ConfigService);
  });

  describe('geocode() with Kerala database fallback', () => {
    it('should return null for empty query', async () => {
      const result = await service.geocode({});
      expect(result).toBeNull();
    });

    it('should geocode by specific Kerala town (e.g. Kakkanad)', async () => {
      const result = await service.geocode({
        city: 'Kakkanad',
        district: 'Ernakulam',
      });

      expect(result).not.toBeNull();
      expect(result?.latitude).toBeCloseTo(KERALA_TOWNS['kakkanad'].lat, 3);
      expect(result?.longitude).toBeCloseTo(KERALA_TOWNS['kakkanad'].lng, 3);
      expect(result?.provider).toBe('kerala_database');
      expect(result?.district).toBe('Ernakulam');
      expect(result?.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('should match town mentioned inside freeform address string', async () => {
      const result = await service.geocode({
        address: 'Door 14/231, Near Infopark, Kakkanad, Kerala',
      });

      expect(result).not.toBeNull();
      expect(result?.latitude).toBeCloseTo(KERALA_TOWNS['kakkanad'].lat, 3);
      expect(result?.longitude).toBeCloseTo(KERALA_TOWNS['kakkanad'].lng, 3);
      expect(result?.city).toBe('kakkanad');
      expect(result?.district).toBe('Ernakulam');
    });

    it('should geocode by Kerala district name', async () => {
      const result = await service.geocode({
        district: 'Thrissur',
      });

      expect(result).not.toBeNull();
      expect(result?.latitude).toBeCloseTo(KERALA_DISTRICTS['thrissur'].lat, 3);
      expect(result?.longitude).toBeCloseTo(KERALA_DISTRICTS['thrissur'].lng, 3);
      expect(result?.district).toBe('Thrissur');
      expect(result?.provider).toBe('kerala_database');
    });

    it('should handle district aliases like Cochin -> Ernakulam or Trivandrum -> Thiruvananthapuram', async () => {
      const resultCochin = await service.geocode({
        district: 'Cochin',
      });
      expect(resultCochin?.latitude).toBeCloseTo(
        KERALA_DISTRICTS['ernakulam'].lat,
        3
      );

      const resultTvm = await service.geocode({
        district: 'Trivandrum',
      });
      expect(resultTvm?.latitude).toBeCloseTo(
        KERALA_DISTRICTS['thiruvananthapuram'].lat,
        3
      );
    });

    it('should geocode by Kerala PIN code prefix (e.g. 682020 -> Ernakulam)', async () => {
      const result = await service.geocode({
        pincode: '682020',
      });

      expect(result).not.toBeNull();
      expect(result?.latitude).toBeCloseTo(
        KERALA_DISTRICTS['ernakulam'].lat,
        3
      );
      expect(result?.district).toBe('Ernakulam');
    });

    it('should fallback to Kerala state centroid if only state is specified', async () => {
      const result = await service.geocode({
        state: 'Kerala',
      });

      expect(result).not.toBeNull();
      expect(result?.latitude).toBeCloseTo(KERALA_STATE_CENTROID.lat, 3);
      expect(result?.longitude).toBeCloseTo(KERALA_STATE_CENTROID.lng, 3);
    });
  });

  describe('reverseGeocode()', () => {
    it('should return null if latitude or longitude is null', () => {
      expect(service.reverseGeocode(null as any, null as any)).toBeNull();
    });

    it('should resolve coordinates close to Aluva to Aluva and Ernakulam', () => {
      const result = service.reverseGeocode(10.1076, 76.3516);
      expect(result).not.toBeNull();
      expect(result?.city).toBe('Aluva');
      expect(result?.district).toBe('Ernakulam');
      expect(result?.distanceKm).toBeLessThan(1);
    });

    it('should resolve district centroid coordinates', () => {
      const result = service.reverseGeocode(8.5241, 76.9366);
      expect(result).not.toBeNull();
      expect(result?.district).toBe('Thiruvananthapuram');
    });
  });

  describe('calculateDistanceKm()', () => {
    it('should calculate distance between Kochi and Trivandrum (~180-210 km)', () => {
      const dist = service.calculateDistanceKm(
        9.9312,
        76.2673, // Kochi
        8.5241,
        76.9366 // Trivandrum
      );
      expect(dist).toBeGreaterThan(170);
      expect(dist).toBeLessThan(220);
    });

    it('should return 0 for identical coordinates', () => {
      const dist = service.calculateDistanceKm(10.0, 76.0, 10.0, 76.0);
      expect(dist).toBe(0);
    });
  });
});
