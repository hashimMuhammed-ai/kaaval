import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppConfigService } from './whatsapp-config.service';
import { WhatsAppCodeVerificationStatus, WhatsAppQualityRating, WHATSAPP_TEMPLATES } from './whatsapp.constants';
import { WhatsAppIntakeService } from './intake/whatsapp-intake.service';
import * as crypto from 'crypto';

describe('WhatsAppService', () => {
  let service: WhatsAppService;
  let configService: WhatsAppConfigService;
  let intakeService: WhatsAppIntakeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppService,
        WhatsAppConfigService,
        {
          provide: WhatsAppIntakeService,
          useValue: {
            handleInboundMessage: jest
              .fn()
              .mockResolvedValue('Welcome! What care service do you need?'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                WHATSAPP_API_VERSION: 'v21.0',
                WHATSAPP_API_TOKEN: 'test-token',
                WHATSAPP_PHONE_NUMBER_ID: '1234567890',
                WHATSAPP_BUSINESS_ACCOUNT_ID: '9876543210',
                WHATSAPP_WEBHOOK_VERIFY_TOKEN: 'verify-token-123',
                WHATSAPP_APP_SECRET: 'test-app-secret',
                WHATSAPP_DEFAULT_ORIGIN_PHONE: '+919876543210',
                WHATSAPP_DEV_MOCK_MODE: 'true',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<WhatsAppService>(WhatsAppService);
    configService = module.get<WhatsAppConfigService>(WhatsAppConfigService);
    intakeService = module.get<WhatsAppIntakeService>(WhatsAppIntakeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(configService).toBeDefined();
  });

  describe('Phone Number Normalization', () => {
    it('should prepend 91 for 10-digit Indian numbers', () => {
      expect(service.normalizePhoneNumber('9847012345')).toBe('919847012345');
      expect(service.normalizePhoneNumber('+91 98470 12345')).toBe('919847012345');
    });

    it('should strip special characters from numbers with country code', () => {
      expect(service.normalizePhoneNumber('+91-9876543210')).toBe('919876543210');
    });
  });

  describe('verifyPhoneNumberStatus', () => {
    it('should return verified status in mock mode', async () => {
      const status = await service.verifyPhoneNumberStatus();
      expect(status.codeVerificationStatus).toBe(WhatsAppCodeVerificationStatus.VERIFIED);
      expect(status.qualityRating).toBe(WhatsAppQualityRating.GREEN);
      expect(status.verifiedName).toContain('CareKerala');
      expect(status.isMock).toBe(true);
    });
  });

  describe('registerPhoneNumber', () => {
    it('should throw BadRequestException if PIN is not 6 digits', async () => {
      await expect(service.registerPhoneNumber('123')).rejects.toThrow();
      await expect(service.registerPhoneNumber('1234567')).rejects.toThrow();
    });

    it('should successfully register with a 6-digit PIN', async () => {
      const res = await service.registerPhoneNumber('123456');
      expect(res.success).toBe(true);
      expect(res.message).toBeDefined();
    });
  });

  describe('Template Management', () => {
    it('should return pre-configured standard healthcare templates', async () => {
      const templates = await service.getTemplates();
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.some((t) => t.name === WHATSAPP_TEMPLATES.AGENCY_NEW_ENQUIRY_ALERT)).toBe(true);
    });

    it('should sync standard templates for Meta App Review', async () => {
      const result = await service.syncStandardTemplates();
      expect(result.synced).toBeGreaterThan(0);
      expect(result.results.length).toBe(result.synced);
    });
  });

  describe('Sending Messages', () => {
    it('should send template message in mock mode with a generated wamid', async () => {
      const res = await service.sendTemplateMessage(
        '+919847012345',
        WHATSAPP_TEMPLATES.AGENCY_NEW_ENQUIRY_ALERT,
        'en_US',
        []
      );
      expect(res.success).toBe(true);
      expect(res.messageId).toContain('wamid.');
      expect(res.recipient).toBe('919847012345');
      expect(res.mode).toBe('mock');
    });

    it('should send text message in mock mode', async () => {
      const res = await service.sendTextMessage('+919847012345', 'Hello from CareKerala!');
      expect(res.success).toBe(true);
      expect(res.messageId).toBeDefined();
      expect(res.recipient).toBe('919847012345');
    });
  });

  describe('notifyAgencyOwnerOnEnquiry', () => {
    it('should throw BadRequestException if required fields are missing', async () => {
      await expect(
        service.notifyAgencyOwnerOnEnquiry({
          referenceId: '',
          patientName: 'Test Patient',
          serviceType: 'elderly_care',
          duration: '24_hours',
          contactName: 'Family Member',
          phone: '+919847012345',
          district: 'Ernakulam',
        })
      ).rejects.toThrow();
    });

    it('should successfully trigger instant WhatsApp notification to agency owner and customer', async () => {
      const result = await service.notifyAgencyOwnerOnEnquiry({
        referenceId: 'REQ-2026-894102',
        patientName: 'Mary Varghese',
        serviceType: 'bedridden_care',
        duration: '24_hours',
        contactName: 'Dr. Thomas Varghese',
        phone: '+91 98470 12345',
        district: 'Ernakulam (Kochi)',
        agencyName: 'CareKerala Healthcare',
        ownerPhone: '+91 98765 43210',
      });

      expect(result.success).toBe(true);
      expect(result.referenceId).toBe('REQ-2026-894102');
      expect(result.targetOwnerPhone).toBe('+91 98765 43210');
      expect(result.ownerAlert.success).toBe(true);
      expect(result.ownerAlert.recipient).toBe('919876543210');
      expect(result.customerAck?.success).toBe(true);
      expect(result.customerAck?.recipient).toBe('919847012345');
    });

    it('should fallback to defaultOriginPhone when no custom ownerPhone is found', async () => {
      const result = await service.notifyAgencyOwnerOnEnquiry({
        referenceId: 'REQ-2026-123456',
        patientName: 'K. Raman',
        serviceType: 'post_op',
        duration: '12_day',
        contactName: 'Suresh Kumar',
        phone: '9847099999',
        district: 'Kozhikode',
      });

      expect(result.success).toBe(true);
      expect(result.targetOwnerPhone).toBe('+919876543210');
      expect(result.ownerAlert.recipient).toBe('919876543210');
    });

    it('should format header as [WhatsApp Lead] and skip customer ack when source is whatsapp', async () => {
      const result = await service.notifyAgencyOwnerOnEnquiry({
        referenceId: 'REQ-2026-990011',
        patientName: 'Mary Varghese',
        patientAge: '78',
        serviceType: 'elderly_care',
        duration: '24_hours',
        contactName: 'Dr. Thomas',
        phone: '9847012345',
        district: 'Ernakulam',
        source: 'whatsapp',
        isAutoCaptured: true,
      });

      expect(result.success).toBe(true);
      expect(result.referenceId).toBe('REQ-2026-990011');
      expect(result.customerAck).toBeUndefined();
    });
  });

  describe('Webhook Signature Verification', () => {
    it('should return true for valid HMAC-SHA256 signature', () => {
      const rawBody = JSON.stringify({ object: 'whatsapp_business_account' });
      const secret = 'test-app-secret';
      const hash = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      const signature = `sha256=${hash}`;

      expect(service.verifyWebhookSignature(rawBody, signature)).toBe(true);
    });

    it('should return false for invalid HMAC-SHA256 signature', () => {
      const rawBody = JSON.stringify({ object: 'whatsapp_business_account' });
      const signature = 'sha256=invalidhashvalue1234567890abcdef1234567890abcdef1234567890abcdef';

      expect(service.verifyWebhookSignature(rawBody, signature)).toBe(false);
    });
  });

  describe('Webhook Event Processing', () => {
    it('should process delivery status receipts', async () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            changes: [
              {
                field: 'messages',
                value: {
                  statuses: [
                    {
                      id: 'wamid.123',
                      status: 'delivered',
                      recipient_id: '919847012345',
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const result = await service.processWebhookEvent(payload);
      expect(result.handled).toBe(true);
      expect(result.eventType).toBe('status_receipt');
    });

    it('should process incoming messages', async () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            changes: [
              {
                field: 'messages',
                value: {
                  messages: [
                    {
                      from: '919847012345',
                      id: 'wamid.incoming.1',
                      type: 'text',
                      text: { body: 'Need caregiver for bedridden patient in Kochi' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const result = await service.processWebhookEvent(payload);
      expect(result.handled).toBe(true);
      expect(result.eventType).toBe('inbound_message');
      expect(intakeService.handleInboundMessage).toHaveBeenCalledWith(
        '919847012345',
        'Need caregiver for bedridden patient in Kochi'
      );
    });
  });

  describe('sendPostAssignmentRatingRequest', () => {
    it('should throw BadRequestException if required fields are missing', async () => {
      await expect(
        service.sendPostAssignmentRatingRequest({
          assignmentId: '',
          customerPhone: '9847012345',
          contactName: 'Thomas',
          patientName: 'Mary',
          caregiverName: 'Anjali',
        })
      ).rejects.toThrow();
    });

    it('should successfully send post-assignment feedback request via template message in mock mode', async () => {
      const res = await service.sendPostAssignmentRatingRequest({
        assignmentId: 'asgn-12345',
        customerPhone: '+91 98470 12345',
        contactName: 'Dr. Thomas Varghese',
        patientName: 'Mary Varghese',
        caregiverName: 'Priya Lakshmi',
        agencyName: 'CareKerala Healthcare',
      });

      expect(res.success).toBe(true);
      expect(res.assignmentId).toBe('asgn-12345');
      expect(res.recipient).toBe('919847012345');
      expect(res.mode).toBe('mock');
      expect(res.messageId).toContain('wamid.');
    });
  });
});

