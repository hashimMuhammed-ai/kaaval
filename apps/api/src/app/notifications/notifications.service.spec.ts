import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { PushSubscription } from './entities/push-subscription.entity';
import { AdminNotification, NotificationType } from './entities/admin-notification.entity';
import { User } from '../users/entities/user.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { UserRole } from '../common/enums/user-role.enum';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('NotificationsService (Phase 9 Point 3 — Push/WhatsApp Admin Alert)', () => {
  let service: NotificationsService;
  let pushRepo: any;
  let adminNotifRepo: any;
  let userRepo: any;
  let tenantRepo: any;
  let whatsappService: any;

  const mockTenantId = '11111111-1111-1111-1111-111111111111';
  const mockUserId = '22222222-2222-2222-2222-222222222222';

  beforeEach(async () => {
    pushRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((entity) => ({ id: 'push-sub-1', ...entity })),
      save: jest.fn((entity) => Promise.resolve({ id: entity.id || 'push-sub-1', ...entity })),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    adminNotifRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((entity) => ({ id: 'notif-1', ...entity })),
      save: jest.fn((entity) => Promise.resolve({ id: entity.id || 'notif-1', ...entity })),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [
            {
              id: 'notif-1',
              tenantId: mockTenantId,
              title: 'New WhatsApp Lead',
              type: NotificationType.NEW_AUTO_CAPTURED_LEAD,
            },
          ],
          1,
        ]),
        getCount: jest.fn().mockResolvedValue(1),
      })),
    };

    userRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: mockUserId,
          tenantId: mockTenantId,
          role: UserRole.OWNER,
          phone: '+919847012345',
          isActive: true,
        },
        {
          id: 'staff-uuid-1',
          tenantId: mockTenantId,
          role: UserRole.OFFICE_STAFF,
          phone: '+919847054321',
          isActive: true,
        },
      ]),
    };

    tenantRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: mockTenantId,
        name: 'CareKerala Ernakulam',
        phone: '+919847012345',
      }),
    };

    whatsappService = {
      formatServiceType: jest.fn().mockReturnValue('Elderly Daily Assistance'),
      formatDuration: jest.fn().mockReturnValue('24 Hours Live-In'),
      sendTemplateMessage: jest.fn().mockResolvedValue({
        success: true,
        messageId: 'wamid.HBgLMjAyNi0wOS0yOQ==',
        recipient: '+919847012345',
        mode: 'mock',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(PushSubscription),
          useValue: pushRepo,
        },
        {
          provide: getRepositoryToken(AdminNotification),
          useValue: adminNotifRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
        {
          provide: getRepositoryToken(Tenant),
          useValue: tenantRepo,
        },
        {
          provide: WhatsAppService,
          useValue: whatsappService,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  describe('Push Subscriptions Management', () => {
    it('should register a new push subscription for tenant and user', async () => {
      pushRepo.findOne.mockResolvedValue(null);

      const res = await service.subscribePush(
        {
          endpoint: 'https://fcm.googleapis.com/fcm/send/token123',
          p256dh: 'BKm8...',
          auth: 'AbCd...',
          userAgent: 'Mozilla/5.0 PWA Browser',
        },
        mockTenantId,
        mockUserId
      );

      expect(res).toBeDefined();
      expect(pushRepo.create).toHaveBeenCalled();
      expect(pushRepo.save).toHaveBeenCalled();
    });

    it('should update existing push subscription if already registered', async () => {
      pushRepo.findOne.mockResolvedValue({
        id: 'push-sub-existing',
        tenantId: mockTenantId,
        endpoint: 'https://fcm.googleapis.com/fcm/send/token123',
        p256dh: 'old-p256dh',
        auth: 'old-auth',
      });

      const res = await service.subscribePush(
        {
          endpoint: 'https://fcm.googleapis.com/fcm/send/token123',
          p256dh: 'new-p256dh',
          auth: 'new-auth',
        },
        mockTenantId
      );

      expect(res.id).toBe('push-sub-existing');
      expect(res.p256dh).toBe('new-p256dh');
      expect(pushRepo.save).toHaveBeenCalled();
    });

    it('should reject subscription without endpoint or keys', async () => {
      await expect(
        service.subscribePush(
          { endpoint: '', p256dh: '', auth: '' },
          mockTenantId
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should unsubscribe an endpoint', async () => {
      const res = await service.unsubscribePush('https://fcm.googleapis.com/fcm/send/token123', mockTenantId);
      expect(res).toBe(true);
      expect(pushRepo.delete).toHaveBeenCalledWith({
        endpoint: 'https://fcm.googleapis.com/fcm/send/token123',
        tenantId: mockTenantId,
      });
    });

    it('should list all push subscriptions for a tenant', async () => {
      pushRepo.find.mockResolvedValue([{ id: 'sub-1' }, { id: 'sub-2' }]);
      const subs = await service.listSubscriptions(mockTenantId);
      expect(subs.length).toBe(2);
      expect(pushRepo.find).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('broadcastPushNotification', () => {
    it('should broadcast push notification to all tenant subscriptions', async () => {
      pushRepo.find.mockResolvedValue([
        { endpoint: 'https://push.service.com/sub-1' },
        { endpoint: 'https://push.service.com/sub-2' },
      ]);

      const result = await service.broadcastPushNotification(mockTenantId, {
        title: '🚨 New Lead Alert',
        body: 'Mary Varghese requested 24h care.',
      });

      expect(result.sentCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(result.results.length).toBe(2);
    });
  });

  describe('notifyAdminOnAutoCapturedLead (Phase 9 Point 3)', () => {
    it('should dispatch WhatsApp alert to owner and office staff and broadcast Web Push', async () => {
      pushRepo.find.mockResolvedValue([
        { endpoint: 'https://fcm.googleapis.com/sub1' },
      ]);

      const result = await service.notifyAdminOnAutoCapturedLead({
        referenceId: 'REQ-2026-998877',
        patientName: 'Mary Varghese',
        patientAge: '78',
        serviceType: 'elderly_care',
        duration: '24_hours',
        contactName: 'Dr. Thomas Varghese',
        phone: '9847099999',
        district: 'Ernakulam',
        locality: 'Kakkanad',
        genderPreference: 'female',
        startDate: 'Tomorrow',
        tenantId: mockTenantId,
        requestId: 'req-uuid-1',
      });

      expect(result.success).toBe(true);
      expect(result.referenceId).toBe('REQ-2026-998877');

      // Dispatched WhatsApp alerts to both Owner and Staff
      expect(result.whatsappAlerts.length).toBe(2);
      expect(whatsappService.sendTemplateMessage).toHaveBeenCalledTimes(2);

      // Verify template parameters include [WhatsApp Lead] and patient with age
      const callArgs = whatsappService.sendTemplateMessage.mock.calls[0];
      expect(callArgs[3][0].parameters[0].text).toContain('[WhatsApp Lead]');
      expect(callArgs[3][1].parameters[1].text).toContain('Mary Varghese (78y)');

      // Web Push dispatch
      expect(result.pushDispatch.sentCount).toBe(1);

      // AdminNotification record created in DB
      expect(adminNotifRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.NEW_AUTO_CAPTURED_LEAD,
          tenantId: mockTenantId,
          status: 'sent',
        })
      );
      expect(adminNotifRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if required lead details are missing', async () => {
      await expect(
        service.notifyAdminOnAutoCapturedLead({
          referenceId: '',
          patientName: '',
          serviceType: 'elderly_care',
          duration: '24_hours',
          contactName: '',
          phone: '',
          district: 'Ernakulam',
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('listAdminNotifications & markAsRead', () => {
    it('should list admin notifications and return unread count', async () => {
      const res = await service.listAdminNotifications(mockTenantId);
      expect(res.data.length).toBe(1);
      expect(res.total).toBe(1);
      expect(res.unreadCount).toBe(1);
    });

    it('should mark notification as read', async () => {
      const notif = { id: 'notif-1', tenantId: mockTenantId, readAt: null };
      adminNotifRepo.findOne.mockResolvedValue(notif);

      const res = await service.markAsRead('notif-1', mockTenantId);
      expect(res.readAt).toBeInstanceOf(Date);
      expect(adminNotifRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if notification does not exist', async () => {
      adminNotifRepo.findOne.mockResolvedValue(null);
      await expect(service.markAsRead('non-existent', mockTenantId)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('escalateReplacementSla (Phase 10 Point 3 — Replacement SLA Escalation)', () => {
    it('should dispatch WhatsApp template and Web Push to Owner and record REPLACEMENT_SLA_ALERT', async () => {
      pushRepo.find.mockResolvedValue([
        { endpoint: 'https://fcm.googleapis.com/fcm/send/owner-sub-1', tenantId: mockTenantId },
      ]);

      const res = await service.escalateReplacementSla({
        tenantId: mockTenantId,
        assignmentId: 'asgn-123',
        customerId: 'cust-456',
        patientName: 'Devaki Amma',
        district: 'Ernakulam',
        locality: 'Kakkanad',
        absenceReason: 'Medical Leave',
        absenceNotes: 'Caregiver has high fever',
        slaMinutes: 120,
      });

      expect(res.success).toBe(true);
      expect(res.notificationId).toBe('notif-1');
      expect(res.whatsappAlerts.length).toBeGreaterThan(0);
      expect(whatsappService.sendTemplateMessage).toHaveBeenCalledWith(
        '+919847012345',
        'replacement_sla_escalation',
        'en_US',
        expect.arrayContaining([
          expect.objectContaining({
            type: 'body',
            parameters: [
              { type: 'text', text: 'Devaki Amma' },
              { type: 'text', text: 'Ernakulam (Kakkanad)' },
              { type: 'text', text: 'Medical Leave: Caregiver has high fever' },
              { type: 'text', text: '120' },
            ],
          }),
        ])
      );
      expect(adminNotifRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.REPLACEMENT_SLA_ALERT,
          title: expect.stringContaining('Devaki Amma'),
        })
      );
    });
  });
});
