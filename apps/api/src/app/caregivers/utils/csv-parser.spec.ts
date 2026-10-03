import {
  parseCsvRows,
  parseCaregiverCsv,
  generateCaregiverCsvTemplate,
  KERALA_DISTRICT_COORDINATES,
} from './csv-parser';

describe('Caregiver CSV Parser', () => {
  describe('parseCsvRows (RFC 4180 parsing)', () => {
    it('should parse standard CSV text into rows and cells', () => {
      const csv = 'name,phone,district\nSunitha,+919847111222,Ernakulam\nRajesh,+919847333444,Thrissur';
      const rows = parseCsvRows(csv);
      expect(rows.length).toBe(3);
      expect(rows[0]).toEqual(['name', 'phone', 'district']);
      expect(rows[1]).toEqual(['Sunitha', '+919847111222', 'Ernakulam']);
      expect(rows[2]).toEqual(['Rajesh', '+919847333444', 'Thrissur']);
    });

    it('should correctly handle quotes, internal commas, and escaped quotes', () => {
      const csv = 'name,skills,notes\n"Sunitha, K","Elderly Care, Dementia","Specialist in ""ICU"" care"';
      const rows = parseCsvRows(csv);
      expect(rows.length).toBe(2);
      expect(rows[1][0]).toBe('Sunitha, K');
      expect(rows[1][1]).toBe('Elderly Care, Dementia');
      expect(rows[1][2]).toBe('Specialist in "ICU" care');
    });

    it('should ignore completely empty lines', () => {
      const csv = 'name,phone\n\nSunitha,+919847111222\n\n\n';
      const rows = parseCsvRows(csv);
      expect(rows.length).toBe(2);
    });
  });

  describe('parseCaregiverCsv', () => {
    it('should parse caregiver rows and map headers flexibly with aliases', () => {
      const csv = [
        'Full Name,Mobile,Region,Competencies,Daily Wage,Experience',
        'Sunitha Kumari,+919847123456,Ernakulam,"Elderly Care; Bedridden Care",1200,4.5',
      ].join('\n');

      const result = parseCaregiverCsv(csv);
      expect(result.length).toBe(1);
      expect(result[0].fullName).toBe('Sunitha Kumari');
      expect(result[0].phone).toBe('+919847123456');
      expect(result[0].district).toBe('Ernakulam');
      expect(result[0].skills).toEqual(['Elderly Care', 'Bedridden Care']);
      expect(result[0].dailyRate).toBe(1200);
      expect(result[0].experienceYears).toBe(4.5);
      // Smart district geocoding coordinates should be auto-filled for Ernakulam
      expect(result[0].latitude).toBe(KERALA_DISTRICT_COORDINATES['ernakulam'].lat);
      expect(result[0].longitude).toBe(KERALA_DISTRICT_COORDINATES['ernakulam'].lng);
    });

    it('should preserve explicit latitude and longitude if provided in CSV', () => {
      const csv = [
        'full_name,phone,district,latitude,longitude',
        'Rajesh V,+919847222333,Thrissur,10.5123,76.2234',
      ].join('\n');

      const result = parseCaregiverCsv(csv);
      expect(result.length).toBe(1);
      expect(result[0].latitude).toBe(10.5123);
      expect(result[0].longitude).toBe(76.2234);
    });

    it('should return empty array if CSV contains only header or is empty', () => {
      expect(parseCaregiverCsv('')).toEqual([]);
      expect(parseCaregiverCsv('full_name,phone')).toEqual([]);
    });
  });

  describe('generateCaregiverCsvTemplate', () => {
    it('should produce a valid CSV template containing standard headers and sample Kerala rows', () => {
      const template = generateCaregiverCsvTemplate();
      expect(template).toContain('full_name,phone,email,gender,district');
      expect(template).toContain('Sunitha Kumari');
      expect(template).toContain('Ernakulam');
      expect(template).toContain('Thrissur');

      // Verify template parses cleanly
      const parsed = parseCaregiverCsv(template);
      expect(parsed.length).toBeGreaterThanOrEqual(3);
      expect(parsed[0].fullName).toBe('Sunitha Kumari');
    });
  });
});
