import { Test, TestingModule } from '@nestjs/testing';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppConfigService } from './whatsapp-config.service';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

describe('WhatsAppWebhookController', () => {
  let controller: WhatsAppWebhookController;
  let whatsappService: WhatsAppService;
  let configService: WhatsAppConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WhatsAppWebhookController],
      providers: [
        {
          provide: WhatsAppService,
          useValue: {
            verifyPhoneNumberStatus: jest.fn().mockResolvedValue({
              id: '1234567890',
              verifiedName: 'CareKerala',
              displayPhoneNumber: '+919876543210',
              codeVerificationStatus: 'VERIFIED',
              qualityRating: 'GREEN',
              nameStatus: 'APPROVED',
              isMock: true,
            }),
            registerPhoneNumber: jest.fn().mockResolvedValue({
              success: true,
              message: 'Phone registered.',
            }),
            getTemplates: jest.fn().mockResolvedValue([
              { name: 'agency_new_enquiry_alert', status: 'APPROVED' },
            ]),
            syncStandardTemplates: jest.fn().mockResolvedValue({
              synced: 4,
              results: [],
            }),
            verifyWebhookSignature: jest.fn().mockReturnValue(true),
            processWebhookEvent: jest.fn().mockResolvedValue({ handled: true }),
            sendPostAssignmentRatingRequest: jest.fn().mockResolvedValue({
              success: true,
              assignmentId: 'asgn-1',
              recipient: '919847012345',
              messageId: 'wamid.test',
              mode: 'mock',
            }),
          },
        },
        {
          provide: WhatsAppConfigService,
          useValue: {
            webhookVerifyToken: 'meta-verify-secret-123',
            apiVersion: 'v21.0',
            isDevMockMode: true,
            isConfigured: jest.fn().mockReturnValue(true),
            phoneNumberId: '1234567890',
            businessAccountId: '9876543210',
          },
        },
      ],
    }).compile();

    controller = module.get<WhatsAppWebhookController>(WhatsAppWebhookController);
    whatsappService = module.get<WhatsAppService>(WhatsAppService);
    configService = module.get<WhatsAppConfigService>(WhatsAppConfigService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /whatsapp/webhook (Meta Verification Challenge)', () => {
    it('should return challenge string if mode is subscribe and verify_token matches', () => {
      const challenge = 'random_challenge_string_abc123';
      const result = controller.verifyWebhook('subscribe', 'meta-verify-secret-123', challenge);
      expect(result).toBe(challenge);
    });

    it('should throw ForbiddenException if token is incorrect', () => {
      expect(() => {
        controller.verifyWebhook('subscribe', 'wrong-token', 'challenge');
      }).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if mode is not subscribe', () => {
      expect(() => {
        controller.verifyWebhook('not_subscribe', 'meta-verify-secret-123', 'challenge');
      }).toThrow(ForbiddenException);
    });
  });

  describe('POST /whatsapp/webhook', () => {
    it('should process webhook event and return EVENT_RECEIVED', async () => {
      const payload = { object: 'whatsapp_business_account' };
      const res = await controller.handleWebhook(payload, 'sha256=test');
      expect(res).toEqual({ status: 'EVENT_RECEIVED' });
      expect(whatsappService.processWebhookEvent).toHaveBeenCalledWith(payload);
    });

    it('should throw ForbiddenException if signature verification fails', async () => {
      jest.spyOn(whatsappService, 'verifyWebhookSignature').mockReturnValueOnce(false);
      await expect(controller.handleWebhook({}, 'sha256=invalid')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('GET /whatsapp/status', () => {
    it('should return phone number status and configuration', async () => {
      const res = await controller.getStatus();
      expect(res.success).toBe(true);
      expect(res.data.codeVerificationStatus).toBe('VERIFIED');
      expect(res.configuration.apiVersion).toBe('v21.0');
    });
  });

  describe('POST /whatsapp/register', () => {
    it('should register phone number with 6-digit PIN', async () => {
      const res = await controller.registerNumber({ pin: '654321' });
      expect(res.success).toBe(true);
      expect(whatsappService.registerPhoneNumber).toHaveBeenCalledWith('654321');
    });

    it('should throw BadRequestException if PIN is missing', async () => {
      await expect(controller.registerNumber({ pin: '' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('GET /whatsapp/templates', () => {
    it('should return list of registered templates', async () => {
      const res = await controller.getTemplates();
      expect(res.success).toBe(true);
      expect(res.count).toBe(1);
    });
  });

  describe('POST /whatsapp/sync-templates', () => {
    it('should trigger sync of templates to Meta API', async () => {
      const res = await controller.syncTemplates();
      expect(res.success).toBe(true);
      expect(res.synced).toBe(4);
    });
  });

  describe('POST /whatsapp/feedback-request', () => {
    it('should dispatch post-assignment WhatsApp rating request', async () => {
      const dto = {
        assignmentId: 'asgn-1',
        customerPhone: '+91 98470 12345',
        contactName: 'Thomas',
        patientName: 'Mary',
        caregiverName: 'Priya',
      };
      const res = await controller.sendFeedbackRequest(dto);
      expect(res.success).toBe(true);
      expect(whatsappService.sendPostAssignmentRatingRequest).toHaveBeenCalledWith(dto);
    });
  });

  describe('Conversational Intake Simulation & Sessions', () => {
    const mockIntakeService = {
      handleInboundMessage: jest.fn().mockResolvedValue('Welcome! What care do you need?'),
      getSessionByPhone: jest.fn().mockResolvedValue({
        id: 'session-123',
        phone: '919847012345',
        currentStep: 'service',
      }),
      listSessions: jest.fn().mockResolvedValue([
        {
          id: 'session-123',
          phone: '919847012345',
          currentStep: 'service',
        },
      ]),
      createRequestFromSession: jest.fn().mockResolvedValue({
        id: 'req-auto-uuid',
        referenceId: 'REQ-2026-894102',
        patientName: 'Devaki Amma',
        status: 'pending',
        source: 'whatsapp',
      }),
    };

    let controllerWithIntake: WhatsAppWebhookController;

    beforeEach(() => {
      controllerWithIntake = new WhatsAppWebhookController(
        whatsappService,
        configService,
        mockIntakeService as any
      );
    });

    it('should simulate intake step response', async () => {
      const res = await controllerWithIntake.simulateIntake({
        phone: '+91 98470 12345',
        text: 'Hi, looking for nurse',
      });

      expect(res.success).toBe(true);
      expect(res.reply).toBe('Welcome! What care do you need?');
      expect(res.session?.currentStep).toBe('service');
    });

    it('should throw BadRequestException if phone or text missing in simulation', async () => {
      await expect(
        controllerWithIntake.simulateIntake({ phone: '', text: 'Hi' })
      ).rejects.toThrow(BadRequestException);
    });

    it('should list all intake sessions', async () => {
      const res = await controllerWithIntake.getIntakeSessions();
      expect(res.success).toBe(true);
      expect(res.count).toBe(1);
      expect(res.data[0].id).toBe('session-123');
    });

    it('should get session by phone', async () => {
      const res = await controllerWithIntake.getIntakeSessionByPhone('919847012345');
      expect(res.success).toBe(true);
      expect(res.data?.id).toBe('session-123');
    });

    it('should convert an intake session into a caregiver request row', async () => {
      const res = await controllerWithIntake.convertSessionToRequest('session-123');
      expect(res.success).toBe(true);
      expect(res.data.id).toBe('req-auto-uuid');
      expect(res.data.referenceId).toBe('REQ-2026-894102');
      expect(mockIntakeService.createRequestFromSession).toHaveBeenCalledWith('session-123');
    });
  });
});
