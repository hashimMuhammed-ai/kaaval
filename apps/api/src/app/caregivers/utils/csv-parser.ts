export interface ParsedCaregiverCsvRow {
  rowNumber: number;
  fullName: string;
  phone: string;
  email?: string;
  gender?: string;
  district?: string;
  city?: string;
  address?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  skills?: string[];
  experienceYears?: number;
  dailyRate?: number;
  status?: string;
  languages?: string[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
}

export const KERALA_DISTRICT_COORDINATES: Record<string, { lat: number; lng: number }> = {
  alappuzha: { lat: 9.4981, lng: 76.3388 },
  ernakulam: { lat: 9.9816, lng: 76.2999 },
  idukki: { lat: 9.8514, lng: 76.9698 },
  kannur: { lat: 11.8745, lng: 75.3704 },
  kasaragod: { lat: 12.5102, lng: 74.9852 },
  kollam: { lat: 8.8932, lng: 76.6141 },
  kottayam: { lat: 9.5916, lng: 76.5222 },
  kozhikode: { lat: 11.2588, lng: 75.7804 },
  malappuram: { lat: 11.0510, lng: 76.0711 },
  palakkad: { lat: 10.7867, lng: 76.6548 },
  pathanamthitta: { lat: 9.2648, lng: 76.7870 },
  thiruvananthapuram: { lat: 8.5241, lng: 76.9366 },
  thrissur: { lat: 10.5276, lng: 76.2144 },
  wayanad: { lat: 11.6854, lng: 76.1320 },
};

/**
 * Robust RFC 4180-compliant CSV parser.
 * Handles quoted cells with embedded commas, newlines, and escaped quotes.
 */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    const nextChar = normalized[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentCell += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (char === '\n') {
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Normalizes header strings: lowercases and removes punctuation.
 */
function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Parses caregiver CSV text into strongly-typed row structures with smart defaults.
 */
export function parseCaregiverCsv(csvContent: string): ParsedCaregiverCsvRow[] {
  const table = parseCsvRows(csvContent);
  if (table.length < 2) {
    return [];
  }

  const headerRow = table[0];
  const headerMap: Record<string, number> = {};

  headerRow.forEach((colName, index) => {
    headerMap[normalizeHeader(colName)] = index;
  });

  const getColValue = (row: string[], ...aliases: string[]): string | undefined => {
    for (const alias of aliases) {
      const norm = normalizeHeader(alias);
      if (norm in headerMap) {
        const val = row[headerMap[norm]];
        if (val !== undefined && val.trim() !== '') {
          return val.trim();
        }
      }
    }
    return undefined;
  };

  const parsedRows: ParsedCaregiverCsvRow[] = [];

  for (let r = 1; r < table.length; r++) {
    const row = table[r];
    const fullName = getColValue(row, 'fullName', 'full_name', 'name', 'caregiver_name', 'caregiver');
    const phone = getColValue(row, 'phone', 'mobile', 'contact', 'phone_number', 'contact_number');

    // Skip entirely empty row
    if (!fullName && !phone && row.every((c) => c.trim() === '')) {
      continue;
    }

    const email = getColValue(row, 'email', 'email_address');
    const gender = getColValue(row, 'gender', 'sex');
    const district = getColValue(row, 'district', 'region');
    const city = getColValue(row, 'city', 'town', 'locality');
    const address = getColValue(row, 'address', 'street', 'location');
    const pincode = getColValue(row, 'pincode', 'postal_code', 'zip');

    const latRaw = getColValue(row, 'latitude', 'lat');
    const lngRaw = getColValue(row, 'longitude', 'lng', 'long');

    let latitude = latRaw ? parseFloat(latRaw) : undefined;
    let longitude = lngRaw ? parseFloat(lngRaw) : undefined;

    // Smart district geocoding if coordinates omitted
    if ((latitude == null || longitude == null) && district) {
      const districtKey = district.trim().toLowerCase();
      if (KERALA_DISTRICT_COORDINATES[districtKey]) {
        latitude = KERALA_DISTRICT_COORDINATES[districtKey].lat;
        longitude = KERALA_DISTRICT_COORDINATES[districtKey].lng;
      }
    }

    const skillsRaw = getColValue(row, 'skills', 'skill_list', 'competencies');
    const skills = skillsRaw
      ? skillsRaw
          .split(/[;,|]/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      : [];

    const expRaw = getColValue(row, 'experienceYears', 'experience_years', 'experience', 'exp');
    const experienceYears = expRaw ? parseFloat(expRaw) : undefined;

    const rateRaw = getColValue(row, 'dailyRate', 'daily_rate', 'rate', 'daily_wage');
    const dailyRate = rateRaw ? parseFloat(rateRaw.replace(/[^0-9.]/g, '')) : undefined;

    const status = getColValue(row, 'status', 'operational_status');

    const languagesRaw = getColValue(row, 'languages', 'language');
    const languages = languagesRaw
      ? languagesRaw
          .split(/[;,|]/)
          .map((l) => l.trim())
          .filter((l) => l.length > 0)
      : undefined;

    const emergencyContactName = getColValue(row, 'emergencyContactName', 'emergency_contact_name', 'emergency_name');
    const emergencyContactPhone = getColValue(row, 'emergencyContactPhone', 'emergency_contact_phone', 'emergency_phone');
    const notes = getColValue(row, 'notes', 'remarks', 'comments');

    parsedRows.push({
      rowNumber: r + 1, // 1-indexed line number in CSV
      fullName: fullName || '',
      phone: phone || '',
      email,
      gender,
      district,
      city,
      address,
      pincode,
      latitude,
      longitude,
      skills,
      experienceYears,
      dailyRate,
      status,
      languages,
      emergencyContactName,
      emergencyContactPhone,
      notes,
    });
  }

  return parsedRows;
}

/**
 * Generates an agency starter CSV template with example Kerala caregiver records.
 */
export function generateCaregiverCsvTemplate(): string {
  const headers = [
    'full_name',
    'phone',
    'email',
    'gender',
    'district',
    'city',
    'address',
    'pincode',
    'skills',
    'experience_years',
    'daily_rate',
    'status',
    'languages',
    'emergency_contact_name',
    'emergency_contact_phone',
    'notes',
  ];

  const sampleRows = [
    [
      'Sunitha Kumari',
      '+919847123456',
      'sunitha@keralacare.local',
      'female',
      'Ernakulam',
      'Aluva',
      'Bank Road, Near Railway Station',
      '683101',
      '"Elderly Care; Bedridden Care; Vital Signs Monitoring"',
      '4.5',
      '1200',
      'available',
      '"Malayalam; English"',
      'Ramesh Kumar',
      '+919847654321',
      'Experienced in dementia and geriatric palliative care',
    ],
    [
      'Rajesh Kumar V',
      '+919847234567',
      'rajesh@keralacare.local',
      'male',
      'Thrissur',
      'Chalakudy',
      'Market Road, South Junction',
      '680307',
      '"Post-Operative Care; Physiotherapy Support; Tube Feeding"',
      '6.0',
      '1400',
      'available',
      '"Malayalam; Tamil"',
      'Suresh V',
      '+919847765432',
      'Hospital ICU nursing assistant background',
    ],
    [
      'Anjali Menon',
      '+919847345678',
      '',
      'female',
      'Kozhikode',
      'Vadakara',
      'Temple Gate, Near New Bus Stand',
      '673101',
      '"Dementia / Alzheimer\'s; Medication Management; Elderly Care"',
      '3.0',
      '1100',
      'available',
      '"Malayalam"',
      'Devaki Menon',
      '+919847876543',
      'Certified General Nursing & Midwifery (GNM)',
    ],
  ];

  const csvLines = [headers.join(',')];
  for (const row of sampleRows) {
    csvLines.push(row.join(','));
  }

  return csvLines.join('\n');
}
