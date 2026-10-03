import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GeocodeQuery,
  GeocodeResult,
  ReverseGeocodeResult,
} from './geocoding.interface';
import {
  DISTRICT_ALIASES,
  KERALA_DISTRICTS,
  KERALA_PIN_PREFIX_MAP,
  KERALA_STATE_CENTROID,
  KERALA_TOWNS,
} from './kerala-locations.data';

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly provider: string;
  private readonly apiKey?: string;
  private readonly requestTimeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.provider = (
      this.configService.get<string>('GEOCODING_PROVIDER') || 'nominatim'
    ).toLowerCase();
    this.apiKey = this.configService.get<string>('GEOCODING_API_KEY');
    this.requestTimeoutMs = parseInt(
      this.configService.get<string>('GEOCODING_TIMEOUT_MS') || '2500',
      10
    );
  }

  /**
   * Geocodes an address into latitude and longitude coordinates.
   * Tries configured external provider (Nominatim / Google) first,
   * then falls back seamlessly to the curated Kerala Geographic Database.
   */
  async geocode(query: GeocodeQuery): Promise<GeocodeResult | null> {
    if (!query) return null;

    const address = query.address?.trim() || '';
    const city = query.city?.trim() || '';
    const district = query.district?.trim() || '';
    const pincode = query.pincode?.trim() || '';
    const explicitState = query.state?.trim();
    const state = explicitState || 'Kerala';

    if (!address && !city && !district && !pincode && !explicitState) {
      return null;
    }

    // 1. Try external provider if not in offline/mock mode
    if (this.provider === 'nominatim' && process.env.NODE_ENV !== 'test') {
      try {
        const externalResult = await this.geocodeWithNominatim(
          address,
          city,
          district,
          pincode,
          state
        );
        if (externalResult) {
          return externalResult;
        }
      } catch (err: any) {
        this.logger.warn(
          `Nominatim geocoding failed (${err?.message || err}). Falling back to local Kerala database.`
        );
      }
    } else if (
      this.provider === 'google' &&
      this.apiKey &&
      process.env.NODE_ENV !== 'test'
    ) {
      try {
        const externalResult = await this.geocodeWithGoogle(
          address,
          city,
          district,
          pincode,
          state
        );
        if (externalResult) {
          return externalResult;
        }
      } catch (err: any) {
        this.logger.warn(
          `Google geocoding failed (${err?.message || err}). Falling back to local Kerala database.`
        );
      }
    }

    // 2. High-precision fallback using Curated Kerala Geographic Database
    return this.geocodeWithKeralaDatabase(address, city, district, pincode, state);
  }

  /**
   * Geocodes using OpenStreetMap Nominatim API with timeout & validation.
   */
  private async geocodeWithNominatim(
    address: string,
    city: string,
    district: string,
    pincode: string,
    state: string
  ): Promise<GeocodeResult | null> {
    const parts = [address, city, district, pincode, state, 'India'].filter(
      Boolean
    );
    const queryStr = encodeURIComponent(parts.join(', '));
    const url = `https://nominatim.openstreetmap.org/search?q=${queryStr}&format=json&limit=1&addressdetails=1`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CaregiverPlatform/1.0 (caregiver-agency-platform)',
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as any[];
      if (!data || data.length === 0) {
        return null;
      }

      const top = data[0];
      const lat = parseFloat(top.lat);
      const lon = parseFloat(top.lon);

      if (isNaN(lat) || isNaN(lon)) {
        return null;
      }

      // Verify coordinate is reasonably within South India / Kerala bounds
      // Kerala is roughly Lat: 8.0° to 13.0° N, Lng: 74.5° to 77.8° E
      const isWithinBounds =
        lat >= 7.5 && lat <= 13.5 && lon >= 74.0 && lon <= 78.5;

      if (!isWithinBounds) {
        return null;
      }

      return {
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lon.toFixed(6)),
        provider: 'nominatim',
        displayName: top.display_name,
        confidence: 0.95,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Geocodes using Google Geocoding API if key is provided.
   */
  private async geocodeWithGoogle(
    address: string,
    city: string,
    district: string,
    pincode: string,
    state: string
  ): Promise<GeocodeResult | null> {
    const parts = [address, city, district, pincode, state, 'India'].filter(
      Boolean
    );
    const queryStr = encodeURIComponent(parts.join(', '));
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${queryStr}&key=${this.apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) return null;

      const data = (await response.json()) as any;
      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        return null;
      }

      const loc = data.results[0].geometry.location;
      return {
        latitude: Number(loc.lat.toFixed(6)),
        longitude: Number(loc.lng.toFixed(6)),
        provider: 'google',
        displayName: data.results[0].formatted_address,
        confidence: 0.98,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Geocodes using local Kerala spatial dataset.
   * Resolves localities, towns, postal PIN codes, and districts.
   */
  geocodeWithKeralaDatabase(
    address: string,
    city: string,
    district: string,
    pincode: string,
    state: string
  ): GeocodeResult | null {
    const cleanCity = this.cleanKey(city);
    const cleanDistrict = this.normalizeDistrict(district);
    const cleanPincode = pincode.replace(/\D/g, '');

    // 1. Direct city / locality match
    if (cleanCity && KERALA_TOWNS[cleanCity]) {
      const town = KERALA_TOWNS[cleanCity];
      return {
        latitude: town.lat,
        longitude: town.lng,
        provider: 'kerala_database',
        district: town.district,
        city: cleanCity,
        displayName: `${cleanCity}, ${town.district}, Kerala`,
        confidence: 0.9,
      };
    }

    // 2. Search address text for known Kerala towns/localities
    if (address) {
      const addressLower = address.toLowerCase();
      for (const [townName, townData] of Object.entries(KERALA_TOWNS)) {
        // Match whole word or clear delimiter
        const regex = new RegExp(`\\b${townName}\\b`, 'i');
        if (regex.test(addressLower)) {
          return {
            latitude: townData.lat,
            longitude: townData.lng,
            provider: 'kerala_database',
            district: townData.district,
            city: townName,
            displayName: `${townName}, ${townData.district}, Kerala`,
            confidence: 0.85,
          };
        }
      }
    }

    // 3. Match Kerala PIN code prefix (6 digits starting with 67, 68, or 69)
    if (cleanPincode.length >= 3 && cleanPincode.startsWith('6')) {
      const prefix = cleanPincode.slice(0, 3);
      const districtKey = KERALA_PIN_PREFIX_MAP[prefix];
      if (districtKey && KERALA_DISTRICTS[districtKey]) {
        const coords = KERALA_DISTRICTS[districtKey];
        const formattedDistrict =
          districtKey.charAt(0).toUpperCase() + districtKey.slice(1);
        return {
          latitude: coords.lat,
          longitude: coords.lng,
          provider: 'kerala_database',
          district: formattedDistrict,
          displayName: `PIN ${cleanPincode}, ${formattedDistrict}, Kerala`,
          confidence: 0.75,
        };
      }
    }

    // 4. Match district centroid
    if (cleanDistrict && KERALA_DISTRICTS[cleanDistrict]) {
      const coords = KERALA_DISTRICTS[cleanDistrict];
      const formattedDistrict =
        cleanDistrict.charAt(0).toUpperCase() + cleanDistrict.slice(1);
      return {
        latitude: coords.lat,
        longitude: coords.lng,
        provider: 'kerala_database',
        district: formattedDistrict,
        displayName: `${formattedDistrict} District, Kerala`,
        confidence: 0.7,
      };
    }

    // 5. If state is Kerala (or unspecified default in Kerala context), return Kerala centroid
    if (!state || state.toLowerCase() === 'kerala') {
      return {
        latitude: KERALA_STATE_CENTROID.lat,
        longitude: KERALA_STATE_CENTROID.lng,
        provider: 'kerala_database',
        displayName: 'Kerala, India',
        confidence: 0.5,
      };
    }

    return null;
  }

  /**
   * Reverse geocodes latitude/longitude into closest Kerala locality or district.
   */
  reverseGeocode(
    latitude: number,
    longitude: number
  ): ReverseGeocodeResult | null {
    if (latitude == null || longitude == null) return null;

    let closestTown: string | null = null;
    let closestDistrict: string | null = null;
    let minDistance = Infinity;

    for (const [townName, townData] of Object.entries(KERALA_TOWNS)) {
      const dist = this.calculateDistanceKm(
        latitude,
        longitude,
        townData.lat,
        townData.lng
      );
      if (dist < minDistance) {
        minDistance = dist;
        closestTown = townName;
        closestDistrict = townData.district;
      }
    }

    if (closestTown && minDistance <= 50) {
      return {
        city: closestTown.charAt(0).toUpperCase() + closestTown.slice(1),
        district: closestDistrict || undefined,
        formattedAddress: `${closestTown}, ${closestDistrict}, Kerala`,
        distanceKm: Number(minDistance.toFixed(2)),
      };
    }

    // Fallback to closest district
    let minDistrictDist = Infinity;
    let closestDistName: string | null = null;

    for (const [distKey, coords] of Object.entries(KERALA_DISTRICTS)) {
      const dist = this.calculateDistanceKm(
        latitude,
        longitude,
        coords.lat,
        coords.lng
      );
      if (dist < minDistrictDist) {
        minDistrictDist = dist;
        closestDistName = distKey;
      }
    }

    if (closestDistName) {
      const formatted =
        closestDistName.charAt(0).toUpperCase() + closestDistName.slice(1);
      return {
        district: formatted,
        formattedAddress: `${formatted} District, Kerala`,
        distanceKm: Number(minDistrictDist.toFixed(2)),
      };
    }

    return null;
  }

  /**
   * Calculates Haversine distance in kilometers between two coordinates.
   */
  calculateDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's mean radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private cleanKey(val?: string | null): string {
    if (!val) return '';
    return val.trim().toLowerCase().replace(/[^a-z0-9 ]/g, '');
  }

  private normalizeDistrict(district?: string | null): string {
    if (!district) return '';
    const key = this.cleanKey(district);
    return DISTRICT_ALIASES[key] || key;
  }
}
