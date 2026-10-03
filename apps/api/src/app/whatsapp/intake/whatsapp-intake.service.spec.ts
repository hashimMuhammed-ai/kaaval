import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsAppIntakeService } from './whatsapp-intake.service';
import {
  WhatsAppIntakeSession,
  IntakeStep,
  IntakeSessionStatus,
} from '../entities/whatsapp-intake-session.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { CaregiverRequest } from '../../requests/entities/request.entity';
import { RequestsService } from '../../requests/requests.service';

describe('WhatsAppIntakeService', () => {
  let service: WhatsAppIntakeService;
  let sessionRepository: jest.Mocked<Repository<WhatsAppIntakeSession>>;
  let tenantRepository: jest.Mocked<Repository<Tenant>>;
  let requestRepository: jest.Mocked<Repository<CaregiverRequest>>;
  let requestsService: jest.Mocked<RequestsService>;

  beforeEach(async () => {
    const mockSessionRepo = {
      create: jest.fn((dto) => ({
        id: 'new-session-uuid',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMessageAt: new Date(),
        metadata: {},
        ...dto,
      })),
      save: jest.fn(async (session) => session),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    const mockTenantRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'tenant-123',
        name: 'CareKerala Healthcare',
      }),
    };

    const mockRequestRepo = {
      create: jest.fn((dto) => ({
        id: 'new-request-uuid',
        referenceId: 'REQ-2026-894102',
        ...dto,
      })),
      save: jest.fn(async (entity) => ({
        id: 'new-request-uuid',
        referenceId: 'REQ-2026-894102',
        ...entity,
      })),
      findOne: jest.fn(),
    };

    const mockRequestsService = {
      createRequest: jest.fn().mockResolvedValue({
        request: {
          id: 'new-request-uuid',
          referenceId: 'REQ-2026-894102',
          patientName: 'Mary',
          serviceType: 'elderly_care',
          status: 'pending',
          source: 'whatsapp',
        },
        whatsappNotification: { success: true },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppIntakeService,
        {
          provide: getRepositoryToken(WhatsAppIntakeSession),
          useValue: mockSessionRepo,
        },
        {
          provide: getRepositoryToken(Tenant),
          useValue: mockTenantRepo,
        },
        {
          provide: getRepositoryToken(CaregiverRequest),
          useValue: mockRequestRepo,
        },
        {
          provide: RequestsService,
          useValue: mockRequestsService,
        },
      ],
    }).compile();

    service = module.get<WhatsAppIntakeService>(WhatsAppIntakeService);
    sessionRepository = module.get(getRepositoryToken(WhatsAppIntakeSession));
    tenantRepository = module.get(getRepositoryToken(Tenant));
    requestRepository = module.get(getRepositoryToken(CaregiverRequest));
    requestsService = module.get(RequestsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Utility & Parsing Methods', () => {
    it('should normalize Indian phone numbers to E.164 without plus', () => {
      expect(service.normalizePhoneNumber('9847012345')).toBe('919847012345');
      expect(service.normalizePhoneNumber('+91 98470-12345')).toBe('919847012345');
    });

    it('should parse service types from numbers and keywords', () => {
      expect(service.parseServiceType('1')).toBe('elderly_care');
      expect(service.parseServiceType('Elderly assistance')).toBe('elderly_care');
      expect(service.parseServiceType('2')).toBe('bedridden_care');
      expect(service.parseServiceType('Palliative care')).toBe('bedridden_care');
      expect(service.parseServiceType('3')).toBe('post_op');
      expect(service.parseServiceType('Surgery recovery')).toBe('post_op');
      expect(service.parseServiceType('4')).toBe('dementia_care');
      expect(service.parseServiceType('5')).toBe('specialized_nursing');
      expect(service.parseServiceType('6')).toBe('mother_baby');
      expect(service.parseServiceType('unknown random string')).toBeNull();
    });

    it('should parse shift durations from numbers and keywords', () => {
      expect(service.parseDuration('1')).toBe('24_hours');
      expect(service.parseDuration('24 hours live-in')).toBe('24_hours');
      expect(service.parseDuration('2')).toBe('12_day');
      expect(service.parseDuration('day shift')).toBe('12_day');
      expect(service.parseDuration('3')).toBe('12_night');
      expect(service.parseDuration('night')).toBe('12_night');
      expect(service.parseDuration('4')).toBe('custom');
      expect(service.parseDuration('hourly')).toBe('custom');
      expect(service.parseDuration('invalid')).toBeNull();
    });

    it('should parse caregiver gender preferences', () => {
      expect(service.parseGenderPreference('1')).toBe('female');
      expect(service.parseGenderPreference('female caregiver')).toBe('female');
      expect(service.parseGenderPreference('2')).toBe('male');
      expect(service.parseGenderPreference('3')).toBe('any');
      expect(service.parseGenderPreference('no preference')).toBe('any');
      expect(service.parseGenderPreference('random')).toBeNull();
    });

    it('should parse Kerala districts and localities', () => {
      const loc1 = service.parseLocation('Ernakulam, Kakkanad');
      expect(loc1.district).toBe('Ernakulam');
      expect(loc1.locality).toBe('Kakkanad');

      const loc2 = service.parseLocation('Kozhikode');
      expect(loc2.district).toBe('Kozhikode');

      const loc3 = service.parseLocation('Trichur Swaraj Round');
      expect(loc3.district).toBe('Thrissur');
      expect(loc3.locality).toBe('Swaraj Round');

      const loc4 = service.parseLocation('Trivandrum Kazhakoottam');
      expect(loc4.district).toBe('Thiruvananthapuram');
      expect(loc4.locality).toBe('Kazhakoottam');
    });

    it('should parse patient age and name correctly', () => {
      const p1 = service.parsePatientInfo('Mary Varghese, 78 years');
      expect(p1.age).toBe('78');
      expect(p1.name).toBe('Mary Varghese');

      const p2 = service.parsePatientInfo('82');
      expect(p2.age).toBe('82');
      expect(p2.name).toBe('Patient');

      const p3 = service.parsePatientInfo('No age mentioned');
      expect(p3.age).toBeNull();
    });

    it('should format services, durations, and gender preferences cleanly', () => {
      expect(service.formatService('elderly_care')).toBe('Elderly Daily Assistance');
      expect(service.formatDuration('24_hours')).toBe('24 Hours Live-In');
      expect(service.formatGenderPreference('female')).toBe('Female Caregiver');
    });
  });

  describe('Conversational State Machine', () => {
    it('should start a new session on initial greeting and prompt service selection', async () => {
      sessionRepository.findOne.mockResolvedValueOnce(null);

      const reply = await service.handleInboundMessage('+91 98470 12345', 'Hi, need caregiver');

      expect(sessionRepository.create).toHaveBeenCalled();
      expect(sessionRepository.save).toHaveBeenCalled();
      expect(reply).toContain('Welcome to CareKerala Healthcare!');
      expect(reply).toContain('1️⃣ Elderly Daily Assistance');
    });

    it('should automatically detect service if provided in initial greeting', async () => {
      sessionRepository.findOne.mockResolvedValueOnce(null);

      const reply = await service.handleInboundMessage(
        '+91 98470 12345',
        'Need elderly care for mother'
      );

      expect(reply).toContain('Elderly Daily Assistance');
      expect(reply).toContain('Which district and town/locality in Kerala is care needed in?');
    });

    it('should handle service selection step and transition to location', async () => {
      const activeSession = {
        id: 'session-1',
        phone: '919847012345',
        currentStep: IntakeStep.SERVICE,
        status: IntakeSessionStatus.IN_PROGRESS,
        tenantId: 'tenant-123',
      } as WhatsAppIntakeSession;

      sessionRepository.findOne.mockResolvedValueOnce(activeSession);

      const reply = await service.handleInboundMessage('919847012345', '2');

      expect(activeSession.serviceType).toBe('bedridden_care');
      expect(activeSession.currentStep).toBe(IntakeStep.LOCATION);
      expect(reply).toContain('Bedridden & Palliative Care');
      expect(reply).toContain('Which district and town/locality in Kerala is care needed in?');
    });

    it('should re-prompt if service selection is invalid', async () => {
      const activeSession = {
        id: 'session-1',
        phone: '919847012345',
        currentStep: IntakeStep.SERVICE,
        status: IntakeSessionStatus.IN_PROGRESS,
      } as WhatsAppIntakeSession;

      sessionRepository.findOne.mockResolvedValueOnce(activeSession);

      const reply = await service.handleInboundMessage('919847012345', 'gibberish text');

      expect(activeSession.currentStep).toBe(IntakeStep.SERVICE);
      expect(reply).toContain('Please choose a valid care option');
    });

    it('should handle location step and transition to duration', async () => {
      const activeSession = {
        id: 'session-1',
        phone: '919847012345',
        currentStep: IntakeStep.LOCATION,
        serviceType: 'elderly_care',
        status: IntakeSessionStatus.IN_PROGRESS,
      } as WhatsAppIntakeSession;

      sessionRepository.findOne.mockResolvedValueOnce(activeSession);

      const reply = await service.handleInboundMessage('919847012345', 'Ernakulam, Kakkanad');

      expect(activeSession.district).toBe('Ernakulam');
      expect(activeSession.locality).toBe('Kakkanad');
      expect(activeSession.currentStep).toBe(IntakeStep.DURATION);
      expect(reply).toContain('Location recorded: *Ernakulam (Kakkanad)*');
      expect(reply).toContain('What care schedule or shift duration do you need?');
    });

    it('should handle duration step and transition to patient age', async () => {
      const activeSession = {
        id: 'session-1',
        phone: '919847012345',
        currentStep: IntakeStep.DURATION,
        serviceType: 'elderly_care',
        district: 'Ernakulam',
        status: IntakeSessionStatus.IN_PROGRESS,
      } as WhatsAppIntakeSession;

      sessionRepository.findOne.mockResolvedValueOnce(activeSession);

      const reply = await service.handleInboundMessage('919847012345', '1');

      expect(activeSession.duration).toBe('24_hours');
      expect(activeSession.currentStep).toBe(IntakeStep.PATIENT_AGE);
      expect(reply).toContain('24 Hours Live-In');
      expect(reply).toContain("Could you please share the patient's name and age?");
    });

    it('should handle patient age step and transition to gender preference', async () => {
      const activeSession = {
        id: 'session-1',
        phone: '919847012345',
        currentStep: IntakeStep.PATIENT_AGE,
        status: IntakeSessionStatus.IN_PROGRESS,
      } as WhatsAppIntakeSession;

      sessionRepository.findOne.mockResolvedValueOnce(activeSession);

      const reply = await service.handleInboundMessage('919847012345', 'Mary Varghese, 78 years');

      expect(activeSession.patientAge).toBe('78');
      expect(activeSession.patientName).toBe('Mary Varghese');
      expect(activeSession.currentStep).toBe(IntakeStep.GENDER_PREFERENCE);
      expect(reply).toContain('Patient recorded: *Mary Varghese* (Age: 78)');
      expect(reply).toContain('Do you have a caregiver gender preference?');
    });

    it('should re-prompt if patient age is missing a number', async () => {
      const activeSession = {
        id: 'session-1',
        phone: '919847012345',
        currentStep: IntakeStep.PATIENT_AGE,
        status: IntakeSessionStatus.IN_PROGRESS,
      } as WhatsAppIntakeSession;

      sessionRepository.findOne.mockResolvedValueOnce(activeSession);

      const reply = await service.handleInboundMessage('919847012345', 'Just Mary');

      expect(reply).toContain("Please mention the patient's age in years");
      expect(activeSession.currentStep).toBe(IntakeStep.PATIENT_AGE);
    });

    it('should handle gender preference step and transition to start date', async () => {
      const activeSession = {
        id: 'session-1',
        phone: '919847012345',
        currentStep: IntakeStep.GENDER_PREFERENCE,
        status: IntakeSessionStatus.IN_PROGRESS,
      } as WhatsAppIntakeSession;

      sessionRepository.findOne.mockResolvedValueOnce(activeSession);

      const reply = await service.handleInboundMessage('919847012345', '1');

      expect(activeSession.genderPreference).toBe('female');
      expect(activeSession.currentStep).toBe(IntakeStep.START_DATE);
      expect(reply).toContain('Female Caregiver');
      expect(reply).toContain('When would you like care to start?');
    });

    it('should handle start date step and transition to contact name', async () => {
      const activeSession = {
        id: 'session-1',
        phone: '919847012345',
        currentStep: IntakeStep.START_DATE,
        status: IntakeSessionStatus.IN_PROGRESS,
      } as WhatsAppIntakeSession;

      sessionRepository.findOne.mockResolvedValueOnce(activeSession);

      const reply = await service.handleInboundMessage('919847012345', 'Immediately');

      expect(activeSession.startDate).toBe('Immediately');
      expect(activeSession.currentStep).toBe(IntakeStep.CONTACT_NAME);
      expect(reply).toContain('Start date: *Immediately*');
      expect(reply).toContain('Lastly, what is your name so our care coordinator can address you?');
    });

    it('should handle contact name step and present full confirmation summary', async () => {
      const activeSession = {
        id: 'session-1',
        phone: '919847012345',
        currentStep: IntakeStep.CONTACT_NAME,
        serviceType: 'elderly_care',
        district: 'Ernakulam',
        locality: 'Kakkanad',
        duration: '24_hours',
        patientName: 'Mary Varghese',
        patientAge: '78',
        genderPreference: 'female',
        startDate: 'Immediately',
        status: IntakeSessionStatus.IN_PROGRESS,
      } as WhatsAppIntakeSession;

      sessionRepository.findOne.mockResolvedValueOnce(activeSession);

      const reply = await service.handleInboundMessage('919847012345', 'Dr. Thomas Varghese');

      expect(activeSession.contactName).toBe('Dr. Thomas Varghese');
      expect(activeSession.currentStep).toBe(IntakeStep.CONFIRMATION);
      expect(reply).toContain('Care Request Summary');
      expect(reply).toContain('Service: *Elderly Daily Assistance*');
      expect(reply).toContain('Location: *Ernakulam (Kakkanad)*');
      expect(reply).toContain('Patient: *Mary Varghese* (Age: 78)');
      expect(reply).toContain('Caregiver Preference: *Female Caregiver*');
      expect(reply).toContain('Start Date: *Immediately*');
      expect(reply).toContain('Contact: *Dr. Thomas Varghese*');
      expect(reply).toContain('Reply *YES* or *1* to confirm and submit your request.');
    });

    it('should finalize intake on confirmation YES, auto-create requests row, and mark session COMPLETED', async () => {
      const activeSession = {
        id: 'session-1',
        phone: '919847012345',
        tenantId: 'tenant-123',
        currentStep: IntakeStep.CONFIRMATION,
        serviceType: 'elderly_care',
        duration: '24_hours',
        district: 'Ernakulam',
        locality: 'Kakkanad',
        contactName: 'Dr. Thomas',
        patientName: 'Mary',
        patientAge: '78',
        genderPreference: 'female',
        startDate: 'Immediately',
        status: IntakeSessionStatus.IN_PROGRESS,
      } as WhatsAppIntakeSession;

      sessionRepository.findOne.mockResolvedValueOnce(activeSession);

      const reply = await service.handleInboundMessage('919847012345', 'YES');

      expect(activeSession.status).toBe(IntakeSessionStatus.COMPLETED);
      expect(activeSession.currentStep).toBe(IntakeStep.COMPLETED);
      expect(activeSession.requestId).toBe('new-request-uuid');
      expect(activeSession.referenceId).toBe('REQ-2026-894102');
      expect(reply).toContain('Care Request Confirmed!');
      expect(reply).toContain('REQ-2026-894102');
      expect(reply).toContain('Dr. Thomas');
      expect(reply).toContain('within 60 minutes');
    });

    it('should reset session when user types RESTART at any point', async () => {
      const activeSession = {
        id: 'session-1',
        phone: '919847012345',
        currentStep: IntakeStep.DURATION,
        serviceType: 'elderly_care',
        status: IntakeSessionStatus.IN_PROGRESS,
      } as WhatsAppIntakeSession;

      sessionRepository.findOne.mockResolvedValueOnce(activeSession);

      const reply = await service.handleInboundMessage('919847012345', 'RESTART');

      expect(activeSession.currentStep).toBe(IntakeStep.SERVICE);
      expect(activeSession.serviceType).toBeNull();
      expect(reply).toContain('Intake Flow Restarted');
      expect(reply).toContain('1️⃣ Elderly Daily Assistance');
    });

    it('should return help guidance when user types HELP', async () => {
      const activeSession = {
        id: 'session-1',
        phone: '919847012345',
        currentStep: IntakeStep.LOCATION,
        status: IntakeSessionStatus.IN_PROGRESS,
      } as WhatsAppIntakeSession;

      sessionRepository.findOne.mockResolvedValueOnce(activeSession);

      const reply = await service.handleInboundMessage('919847012345', 'HELP');

      expect(reply).toContain('Caregiver Intake Assistance');
      expect(reply).toContain('LOCATION');
    });
  });

  describe('createRequestFromSession', () => {
    it('should auto-create a requests row from session and link request_id and reference_id', async () => {
      const session = {
        id: 'session-100',
        phone: '919847012345',
        tenantId: 'tenant-123',
        serviceType: 'bedridden_care',
        duration: '24_hours',
        district: 'Ernakulam',
        locality: 'Kaloor',
        patientName: 'Devaki Amma',
        patientAge: '82',
        genderPreference: 'female',
        startDate: 'Tomorrow',
        contactName: 'Suresh Kumar',
        status: IntakeSessionStatus.IN_PROGRESS,
      } as WhatsAppIntakeSession;

      const result = await service.createRequestFromSession(session);

      expect(result).toBeDefined();
      expect(result.id).toBe('new-request-uuid');
      expect(result.referenceId).toBe('REQ-2026-894102');
      expect(session.requestId).toBe('new-request-uuid');
      expect(session.referenceId).toBe('REQ-2026-894102');
      expect(session.status).toBe(IntakeSessionStatus.COMPLETED);
      expect(requestsService.createRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-123',
          patientName: 'Devaki Amma',
          patientAge: '82',
          serviceType: 'bedridden_care',
          duration: '24_hours',
          district: 'Ernakulam',
          locality: 'Kaloor',
          genderPreference: 'female',
          source: 'whatsapp',
        }),
        'tenant-123'
      );
    });

    it('should look up session by ID and return existing request if already created', async () => {
      const existingRequest = {
        id: 'existing-req-uuid',
        referenceId: 'REQ-2026-112233',
      } as CaregiverRequest;

      sessionRepository.findOne.mockResolvedValueOnce({
        id: 'session-200',
        requestId: 'existing-req-uuid',
        request: existingRequest,
      } as WhatsAppIntakeSession);

      const result = await service.createRequestFromSession('session-200');
      expect(result.id).toBe('existing-req-uuid');
      expect(result.referenceId).toBe('REQ-2026-112233');
    });

    it('should trigger admin notification when using requestRepository fallback', async () => {
      const mockWhatsappService = {
        notifyAgencyOwnerOnEnquiry: jest.fn().mockResolvedValue({ success: true }),
      };

      const fallbackService = new WhatsAppIntakeService(
        sessionRepository,
        tenantRepository,
        requestRepository,
        undefined,
        mockWhatsappService as any
      );

      const session = {
        id: 'session-fallback',
        phone: '919847012345',
        tenantId: 'tenant-123',
        serviceType: 'bedridden_care',
        duration: '24_hours',
        district: 'Ernakulam',
        patientName: 'Devaki Amma',
        status: IntakeSessionStatus.IN_PROGRESS,
      } as WhatsAppIntakeSession;

      requestRepository.create.mockReturnValue({
        id: 'req-fallback-id',
        referenceId: 'REQ-2026-888888',
        patientName: 'Devaki Amma',
        serviceType: 'bedridden_care',
        duration: '24_hours',
        district: 'Ernakulam',
      } as any);
      requestRepository.save.mockResolvedValue({
        id: 'req-fallback-id',
        referenceId: 'REQ-2026-888888',
        patientName: 'Devaki Amma',
        serviceType: 'bedridden_care',
        duration: '24_hours',
        district: 'Ernakulam',
      } as any);

      const res = await fallbackService.createRequestFromSession(session);
      expect(res.id).toBe('req-fallback-id');
      expect(mockWhatsappService.notifyAgencyOwnerOnEnquiry).toHaveBeenCalledWith(
        expect.objectContaining({
          referenceId: 'REQ-2026-888888',
          isAutoCaptured: true,
          source: 'whatsapp',
        })
      );
    });
  });

  describe('Session Retrieval', () => {
    it('should get session by phone number', async () => {
      sessionRepository.findOne.mockResolvedValueOnce({
        id: 's-123',
        phone: '919847012345',
      } as WhatsAppIntakeSession);

      const session = await service.getSessionByPhone('+91 98470 12345');
      expect(session?.id).toBe('s-123');
    });

    it('should list sessions with tenant filter', async () => {
      sessionRepository.find.mockResolvedValueOnce([
        { id: 's-1', tenantId: 't-1' } as WhatsAppIntakeSession,
      ]);

      const list = await service.listSessions('t-1');
      expect(list.length).toBe(1);
    });
  });
});
