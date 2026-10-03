import { MatchingController } from './matching.controller';
import { UserRole } from '../common/enums/user-role.enum';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

describe('MatchingController', () => {
  let controller: MatchingController;
  let mockMatchingService: any;

  const mockStaffUser: JwtPayload = {
    userId: 'staff-1',
    sub: 'staff-1',
    name: 'Staff User',
    email: 'staff@agency.com',
    role: UserRole.OFFICE_STAFF,
    tenantId: 'tenant-123',
  };

  beforeEach(() => {
    mockMatchingService = {
      matchCaregivers: jest.fn().mockResolvedValue({
        targetLocation: { latitude: 10.0, longitude: 76.3, source: 'test' },
        searchCriteria: { radiusKm: 25, gender: 'any', minExperienceYears: 0, requiredSkills: [] },
        totalMatches: 1,
        matches: [{ caregiver: { id: 'cg-1', fullName: 'Sunitha' }, distanceKm: 4.5, matchScore: 90 }],
      }),
    };

    controller = new MatchingController(mockMatchingService);
  });

  it('should delegate GET /matching to matchingService with tenantId', async () => {
    const query = { radiusKm: 30, gender: 'female' };
    const res = await controller.matchCaregiversGet(query, mockStaffUser);

    expect(mockMatchingService.matchCaregivers).toHaveBeenCalledWith(
      query,
      'tenant-123'
    );
    expect(res.totalMatches).toBe(1);
  });

  it('should delegate POST /matching to matchingService with body and tenantId', async () => {
    const body = { radiusKm: 50, skills: ['Elderly Care'] };
    const res = await controller.matchCaregiversPost(body, mockStaffUser);

    expect(mockMatchingService.matchCaregivers).toHaveBeenCalledWith(
      body,
      'tenant-123'
    );
    expect(res.totalMatches).toBe(1);
  });

  it('should delegate GET /matching/request/:requestId to matchingService', async () => {
    const res = await controller.matchForRequest('req-1', {}, mockStaffUser);

    expect(mockMatchingService.matchCaregivers).toHaveBeenCalledWith(
      { requestId: 'req-1' },
      'tenant-123'
    );
    expect(res.totalMatches).toBe(1);
  });

  it('should delegate GET /matching/customer/:customerId to matchingService', async () => {
    const res = await controller.matchForCustomer('cust-1', {}, mockStaffUser);

    expect(mockMatchingService.matchCaregivers).toHaveBeenCalledWith(
      { customerId: 'cust-1' },
      'tenant-123'
    );
    expect(res.totalMatches).toBe(1);
  });

  it('should delegate GET /matching/assignment/:assignmentId to matchingService', async () => {
    const res = await controller.matchForAssignment('asgn-1', {}, mockStaffUser);

    expect(mockMatchingService.matchCaregivers).toHaveBeenCalledWith(
      { assignmentId: 'asgn-1' },
      'tenant-123'
    );
    expect(res.totalMatches).toBe(1);
  });
});
