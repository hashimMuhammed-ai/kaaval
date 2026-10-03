import { NotFoundException } from '@nestjs/common';
import { MatchingService } from './matching.service';
import { CaregiverStatus } from '../common/enums/caregiver-status.enum';

describe('MatchingService', () => {
  let service: MatchingService;
  let mockCaregiverRepo: any;
  let mockRequestRepo: any;
  let mockCustomerRepo: any;
  let mockGeocodingService: any;
  let mockQueryBuilder: any;

  const mockCaregiversList = [
    {
      id: 'cg-1',
      tenantId: 'tenant-123',
      fullName: 'Sunitha Kumari',
      phone: '+919847111222',
      email: 'sunitha@example.com',
      gender: 'female',
      district: 'Ernakulam',
      city: 'Kakkanad',
      skills: ['Elderly Care', 'Bedridden Care'],
      experienceYears: 5,
      status: CaregiverStatus.AVAILABLE,
      dailyRate: 1200,
      languages: ['Malayalam'],
      latitude: 10.0159,
      longitude: 76.3419,
    },
    {
      id: 'cg-2',
      tenantId: 'tenant-123',
      fullName: 'Biju George',
      phone: '+919847333444',
      email: 'biju@example.com',
      gender: 'male',
      district: 'Ernakulam',
      city: 'Aluva',
      skills: ['Dementia Care', 'Elderly Care'],
      experienceYears: 8,
      status: CaregiverStatus.AVAILABLE,
      dailyRate: 1400,
      languages: ['Malayalam', 'English'],
      latitude: 10.1076,
      longitude: 76.3516,
    },
  ];

  let mockAssignmentRepo: any;

  beforeEach(() => {
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getRawAndEntities: jest.fn().mockResolvedValue({
        entities: mockCaregiversList,
        raw: [{ distance_km: '3.45' }, { distance_km: '12.80' }],
      }),
    };

    mockCaregiverRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    mockRequestRepo = {
      findOne: jest.fn(),
    };

    mockCustomerRepo = {
      findOne: jest.fn(),
    };

    mockAssignmentRepo = {
      findOne: jest.fn(),
    };

    mockGeocodingService = {
      geocode: jest.fn().mockResolvedValue({
        latitude: 10.0159,
        longitude: 76.3419,
        provider: 'kerala_database',
        displayName: 'Kakkanad, Ernakulam, Kerala',
      }),
      calculateDistanceKm: jest.fn().mockReturnValue(5.0),
    };

    service = new MatchingService(
      mockCaregiverRepo,
      mockRequestRepo,
      mockCustomerRepo,
      mockAssignmentRepo,
      mockGeocodingService
    );
  });

  describe('matchCaregivers() with PostGIS Spatial Filters', () => {
    it('should query caregivers using PostGIS bounding box and ST_DWithin radius filters', async () => {
      const result = await service.matchCaregivers(
        {
          latitude: 10.0,
          longitude: 76.3,
          radiusKm: 25,
          gender: 'female',
          minExperienceYears: 2,
          skills: ['Elderly Care'],
        },
        'tenant-123'
      );

      // Verify multi-tenant scoping
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'caregiver.tenantId = :tenantId',
        { tenantId: 'tenant-123' }
      );

      // Verify availability filter
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'caregiver.status = :status',
        { status: CaregiverStatus.AVAILABLE }
      );

      // Verify experience filter
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'caregiver.experienceYears >= :minExp',
        { minExp: 2 }
      );

      // Verify gender filter
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'LOWER(caregiver.gender) = :gender',
        { gender: 'female' }
      );

      // Verify PostGIS GiST bounding box clause (&& ST_Expand) was invoked
      const andWhereCalls = mockQueryBuilder.andWhere.mock.calls.map(
        (c: any[]) => c[0]
      );
      const hasBoundingBox = andWhereCalls.some((c: string) =>
        c.includes('caregiver.location && ST_Expand(')
      );
      expect(hasBoundingBox).toBe(true);

      // Verify PostGIS ST_DWithin geography radius filter was invoked
      const hasDWithin = andWhereCalls.some((c: string) =>
        c.includes('ST_DWithin(caregiver.location::geography')
      );
      expect(hasDWithin).toBe(true);

      // Verify distance computation select
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        expect.stringContaining('ROUND((ST_Distance('),
        'distance_km'
      );

      // Verify result structure
      expect(result.totalMatches).toBe(2);
      expect(result.matches[0].caregiver.fullName).toBe('Sunitha Kumari');
      expect(result.matches[0].distanceKm).toBe(3.45);
      expect(result.matches[0].isAvailable).toBe(true);
      expect(result.matches[0].matchScore).toBeGreaterThan(0);
      expect(result.matches[0].scoreBreakdown.distanceScore).toBe(40); // <= 5km
    });

    it('should auto-geocode target address if coordinates are not explicitly passed', async () => {
      const result = await service.matchCaregivers(
        {
          district: 'Ernakulam',
          city: 'Kakkanad',
          radiusKm: 20,
        },
        'tenant-123'
      );

      expect(mockGeocodingService.geocode).toHaveBeenCalledWith(
        expect.objectContaining({
          district: 'Ernakulam',
          city: 'Kakkanad',
        })
      );
      expect(result.targetLocation.latitude).toBe(10.0159);
      expect(result.targetLocation.longitude).toBe(76.3419);
      expect(result.targetLocation.source).toContain('geocoded');
    });

    it('should ignore gender constraint when gender is "any"', async () => {
      await service.matchCaregivers(
        {
          gender: 'any',
        },
        'tenant-123'
      );

      const andWhereCalls = mockQueryBuilder.andWhere.mock.calls.map(
        (c: any[]) => c[0]
      );
      const hasGenderFilter = andWhereCalls.some((c: string) =>
        c.includes('caregiver.gender')
      );
      expect(hasGenderFilter).toBe(false);
    });

    it('should allow includeAllStatuses=true to search non-available caregivers for replacement', async () => {
      await service.matchCaregivers(
        {
          includeAllStatuses: true,
        },
        'tenant-123'
      );

      const andWhereCalls = mockQueryBuilder.andWhere.mock.calls.map(
        (c: any[]) => c[0]
      );
      const hasStatusFilter = andWhereCalls.some((c: string) =>
        c.includes('caregiver.status = :status')
      );
      expect(hasStatusFilter).toBe(false);
    });
  });

  describe('matchCaregivers() Scoped to Request or Customer', () => {
    it('should load requirement from CaregiverRequest and run spatial matching', async () => {
      mockRequestRepo.findOne.mockResolvedValueOnce({
        id: 'req-999',
        tenantId: 'tenant-123',
        district: 'Ernakulam',
        locality: 'Kakkanad',
        serviceType: 'Bedridden Care',
        genderPreference: 'female',
      });

      const result = await service.matchCaregivers(
        { requestId: 'req-999' },
        'tenant-123'
      );

      expect(mockRequestRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'req-999', tenantId: 'tenant-123' },
      });
      expect(result.searchCriteria.gender).toBe('female');
      expect(result.searchCriteria.requiredSkills).toContain('Bedridden Care');
    });

    it('should throw NotFoundException if requestId does not exist', async () => {
      mockRequestRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.matchCaregivers({ requestId: 'non-existent' }, 'tenant-123')
      ).rejects.toThrow(NotFoundException);
    });

    it('should load requirement from Customer and run spatial matching', async () => {
      mockCustomerRepo.findOne.mockResolvedValueOnce({
        id: 'cust-888',
        tenantId: 'tenant-123',
        district: 'Ernakulam',
        locality: 'Kakkanad',
        serviceType: 'Elderly Care',
        genderPreference: 'any',
      });

      const result = await service.matchCaregivers(
        { customerId: 'cust-888' },
        'tenant-123'
      );

      expect(mockCustomerRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'cust-888', tenantId: 'tenant-123' },
      });
      expect(result.searchCriteria.requiredSkills).toContain('Elderly Care');
    });

    it('should load requirement from Assignment, scope search, and exclude current caregiver', async () => {
      mockAssignmentRepo.findOne.mockResolvedValueOnce({
        id: 'asgn-777',
        tenantId: 'tenant-123',
        caregiverId: 'cg-current',
        customer: {
          id: 'cust-888',
          district: 'Ernakulam',
          locality: 'Kakkanad',
          serviceType: 'Dementia Care',
          genderPreference: 'female',
        },
      });

      const result = await service.matchCaregivers(
        { assignmentId: 'asgn-777' },
        'tenant-123'
      );

      expect(mockAssignmentRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'asgn-777', tenantId: 'tenant-123' },
        relations: ['customer', 'caregiver'],
      });
      expect(result.searchCriteria.gender).toBe('female');
      expect(result.searchCriteria.requiredSkills).toContain('Dementia Care');

      // Verify that current caregiver is excluded via query builder
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'caregiver.id != :excludedCaregiverId',
        { excludedCaregiverId: 'cg-current' }
      );
    });

    it('should throw NotFoundException if assignmentId is not found', async () => {
      mockAssignmentRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.matchCaregivers({ assignmentId: 'non-existent-asgn' }, 'tenant-123')
      ).rejects.toThrow(NotFoundException);
    });
  });
});
