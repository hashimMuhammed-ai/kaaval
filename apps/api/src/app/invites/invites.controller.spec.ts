import { Test, TestingModule } from '@nestjs/testing';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../common/enums/user-role.enum';

describe('InvitesController', () => {
  let controller: InvitesController;
  let service: InvitesService;

  const mockInvitesService = {
    validateInvite: jest.fn(),
    acceptInvite: jest.fn(),
    createInvite: jest.fn(),
    getInvitesByTenant: jest.fn(),
    revokeInvite: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvitesController],
      providers: [
        {
          provide: InvitesService,
          useValue: mockInvitesService,
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<InvitesController>(InvitesController);
    service = module.get<InvitesService>(InvitesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate validateInvite', async () => {
    mockInvitesService.validateInvite.mockResolvedValue({ valid: true });
    const result = await controller.validateInvite('tok-123');
    expect(result).toEqual({ valid: true });
    expect(mockInvitesService.validateInvite).toHaveBeenCalledWith('tok-123');
  });

  it('should delegate acceptInvite', async () => {
    const dto = { token: 'tok-123', name: 'Anjali', password: 'Password123!' };
    mockInvitesService.acceptInvite.mockResolvedValue({ success: true });
    const result = await controller.acceptInvite(dto);
    expect(result).toEqual({ success: true });
    expect(mockInvitesService.acceptInvite).toHaveBeenCalledWith(dto);
  });

  it('should delegate createInvite with caller user id, tenantId, and role', async () => {
    const dto = { email: 'staff@test.com', role: UserRole.OFFICE_STAFF };
    const req = { user: { id: 'owner-1', tenantId: 'tenant-1', role: UserRole.OWNER } };
    mockInvitesService.createInvite.mockResolvedValue({ success: true });

    const result = await controller.createInvite(dto, req);
    expect(result).toEqual({ success: true });
    expect(mockInvitesService.createInvite).toHaveBeenCalledWith(
      dto,
      'owner-1',
      'tenant-1',
      UserRole.OWNER
    );
  });

  it('should delegate getInvites with caller tenantId', async () => {
    const req = { user: { tenantId: 'tenant-1' } };
    mockInvitesService.getInvitesByTenant.mockResolvedValue([]);

    const result = await controller.getInvites(req);
    expect(result).toEqual([]);
    expect(mockInvitesService.getInvitesByTenant).toHaveBeenCalledWith('tenant-1');
  });

  it('should delegate revokeInvite with id and caller tenantId', async () => {
    const req = { user: { tenantId: 'tenant-1' } };
    mockInvitesService.revokeInvite.mockResolvedValue({ success: true });

    const result = await controller.revokeInvite('inv-1', req);
    expect(result).toEqual({ success: true });
    expect(mockInvitesService.revokeInvite).toHaveBeenCalledWith('inv-1', 'tenant-1');
  });
});
