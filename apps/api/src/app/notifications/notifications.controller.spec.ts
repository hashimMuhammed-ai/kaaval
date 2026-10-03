import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../common/enums/user-role.enum';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: any;

  const mockUser: JwtPayload = {
    userId: 'user-uuid-1',
    sub: 'user-uuid-1',
    name: 'Admin Owner',
    email: 'admin@carekerala.com',
    role: UserRole.OWNER,
    tenantId: 'tenant-uuid-1',
  };

  beforeEach(async () => {
    service = {
      subscribePush: jest.fn().mockResolvedValue({ id: 'sub-1', endpoint: 'https://push.com/1' }),
      unsubscribePush: jest.fn().mockResolvedValue(true),
      listSubscriptions: jest.fn().mockResolvedValue([{ id: 'sub-1' }]),
      notifyAdminOnAutoCapturedLead: jest.fn().mockResolvedValue({
        success: true,
        referenceId: 'REQ-2026-112233',
        pushDispatch: { sentCount: 1 },
        whatsappAlerts: [{ recipient: '+919847012345', success: true }],
      }),
      listAdminNotifications: jest.fn().mockResolvedValue({
        data: [{ id: 'notif-1', title: 'Lead Alert' }],
        total: 1,
        unreadCount: 0,
      }),
      markAsRead: jest.fn().mockResolvedValue({ id: 'notif-1', readAt: new Date() }),
    };

    controller = new NotificationsController(service);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should subscribe push endpoint', async () => {
    const res = await controller.subscribePush(
      {
        endpoint: 'https://push.com/1',
        p256dh: 'p256dh-key',
        auth: 'auth-key',
      },
      mockUser
    );

    expect(res.success).toBe(true);
    expect(service.subscribePush).toHaveBeenCalled();
  });

  it('should unsubscribe push endpoint', async () => {
    const res = await controller.unsubscribePush('https://push.com/1', mockUser);
    expect(res.success).toBe(true);
    expect(service.unsubscribePush).toHaveBeenCalledWith('https://push.com/1', mockUser.tenantId);
  });

  it('should list push subscriptions', async () => {
    const res = await controller.listSubscriptions(mockUser);
    expect(res.success).toBe(true);
    expect(res.data.length).toBe(1);
  });

  it('should trigger admin lead alert', async () => {
    const res = await controller.alertAdminOnNewLead(
      {
        referenceId: 'REQ-2026-112233',
        patientName: 'Mary Varghese',
        serviceType: 'elderly_care',
        duration: '24_hours',
        contactName: 'Thomas',
        phone: '9847012345',
        district: 'Ernakulam',
      },
      'tenant-uuid-1'
    );

    expect(res.success).toBe(true);
    expect(service.notifyAdminOnAutoCapturedLead).toHaveBeenCalled();
  });

  it('should list admin notifications', async () => {
    const res = await controller.listAdminNotifications({}, mockUser);
    expect(res.success).toBe(true);
    expect(res.data.length).toBe(1);
  });

  it('should mark admin notification as read', async () => {
    const res = await controller.markAsRead('notif-1', mockUser);
    expect(res.success).toBe(true);
    expect(service.markAsRead).toHaveBeenCalledWith('notif-1', mockUser.tenantId);
  });
});
