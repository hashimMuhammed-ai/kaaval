export interface GeocodeQuery {
  address?: string | null;
  city?: string | null;
  district?: string | null;
  pincode?: string | null;
  state?: string | null;
}

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  provider: 'nominatim' | 'google' | 'kerala_database' | 'mock';
  displayName?: string;
  district?: string;
  city?: string;
  confidence?: number; // 0.0 - 1.0
}

export interface ReverseGeocodeResult {
  district?: string;
  city?: string;
  formattedAddress?: string;
  distanceKm?: number;
}
