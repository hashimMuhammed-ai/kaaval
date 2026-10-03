import { RequestsController } from './requests.controller';
import { RequestStatus } from '../common/enums/request-status.enum';

describe('RequestsController', () => {
  let controller: RequestsController;
  let mockRequestsService: any;

  beforeEach(() => {
    mockRequestsService = {
      createRequest: jest.fn().mockResolvedValue({
        request: {
          id: 'req-1',
          referenceId: 'REQ-2026-894102',
          patientName: 'Mary Varghese',
          status: RequestStatus.PENDING,
        },
        whatsappNotification: { success: true },
      }),
      findAll: jest.fn().mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
        stats: { total: 0, pending: 0, contacted: 0, matched: 0, assigned: 0, completed: 0 },
      }),
      findOne: jest.fn().mockResolvedValue({
        id: 'req-1',
        patientName: 'Mary Varghese',
      }),
      updateStatus: jest.fn().mockResolvedValue({
        id: 'req-1',
        status: RequestStatus.CONTACTED,
      }),
    };

    controller = new RequestsController(mockRequestsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createPublicRequest', () => {
    it('should create public request without requiring authentication', async () => {
      const dto: any = {
        serviceType: 'bedridden_care',
        duration: '24_hours',
        startDate: 'immediate',
        district: 'Ernakulam (Kochi)',
        patientName: 'Mary Varghese',
        contactName: 'Dr. Thomas Varghese',
        phone: '+919847012345',
      };

      const result = await controller.createPublicRequest(dto);

      expect(mockRequestsService.createRequest).toHaveBeenCalledWith(dto);
      expect(result.success).toBe(true);
      expect(result.data.referenceId).toBe('REQ-2026-894102');
    });
  });

  describe('getRequests', () => {
    it('should return list of requests scoped to user tenant', async () => {
      const user: any = { tenantId: 'tenant-123', role: 'owner' };
      const query: any = { status: RequestStatus.PENDING };

      const result = await controller.getRequests(user, query);

      expect(mockRequestsService.findAll).toHaveBeenCalledWith('tenant-123', query);
      expect(result.success).toBe(true);
    });
  });

  describe('updateStatus', () => {
    it('should update request status for tenant', async () => {
      const user: any = { tenantId: 'tenant-123', role: 'owner' };
      const dto = { status: RequestStatus.CONTACTED };

      const result = await controller.updateStatus('req-1', dto, user);

      expect(mockRequestsService.updateStatus).toHaveBeenCalledWith('req-1', 'tenant-123', dto);
      expect(result.success).toBe(true);
      expect(result.data.status).toBe(RequestStatus.CONTACTED);
    });
  });
});
