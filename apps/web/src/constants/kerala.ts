export interface DistrictCoordinate {
  name: string;
  lat: number;
  lng: number;
}

export const KERALA_DISTRICT_COORDINATES: DistrictCoordinate[] = [
  { name: 'Alappuzha', lat: 9.4981, lng: 76.3388 },
  { name: 'Ernakulam', lat: 9.9816, lng: 76.2999 },
  { name: 'Idukki', lat: 9.85, lng: 76.9667 },
  { name: 'Kannur', lat: 11.8745, lng: 75.3704 },
  { name: 'Kasaragod', lat: 12.4996, lng: 74.9869 },
  { name: 'Kollam', lat: 8.8932, lng: 76.6141 },
  { name: 'Kottayam', lat: 9.5916, lng: 76.5222 },
  { name: 'Kozhikode', lat: 11.2588, lng: 75.7804 },
  { name: 'Malappuram', lat: 11.051, lng: 76.0711 },
  { name: 'Palakkad', lat: 10.7867, lng: 76.6548 },
  { name: 'Pathanamthitta', lat: 9.2648, lng: 76.787 },
  { name: 'Thiruvananthapuram', lat: 8.5241, lng: 76.9366 },
  { name: 'Thrissur', lat: 10.5276, lng: 76.2144 },
  { name: 'Wayanad', lat: 11.6854, lng: 76.132 },
];

export const KERALA_DISTRICT_NAMES: string[] = KERALA_DISTRICT_COORDINATES.map((d) => d.name);

export const KERALA_DISTRICTS: string[] = [
  'All Districts',
  ...KERALA_DISTRICT_NAMES,
];

export function getDistrictCoordinates(districtName?: string | null): DistrictCoordinate | undefined {
  if (!districtName) return undefined;
  const cleanName = districtName.toLowerCase().replace(/\s*\(.*\)/, '').trim();
  return KERALA_DISTRICT_COORDINATES.find(
    (d) => d.name.toLowerCase() === cleanName
  );
}
