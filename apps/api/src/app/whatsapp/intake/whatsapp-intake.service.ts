import {
  Injectable,
  Logger,
  Optional,
  Inject,
  forwardRef,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  WhatsAppIntakeSession,
  IntakeStep,
  IntakeSessionStatus,
} from '../entities/whatsapp-intake-session.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { CaregiverRequest } from '../../requests/entities/request.entity';
import { RequestsService } from '../../requests/requests.service';
import { RequestStatus } from '../../common/enums/request-status.enum';
import { WhatsAppService } from '../whatsapp.service';

export interface IntakeFlowResponse {
  reply: string;
  session: WhatsAppIntakeSession;
  isComplete: boolean;
}

export const KERALA_DISTRICTS: Record<string, string> = {
  ernakulam: 'Ernakulam',
  kochi: 'Ernakulam',
  cochin: 'Ernakulam',
  kakkanad: 'Ernakulam',
  aluva: 'Ernakulam',
  thiruvananthapuram: 'Thiruvananthapuram',
  trivandrum: 'Thiruvananthapuram',
  kozhikode: 'Kozhikode',
  calicut: 'Kozhikode',
  thrissur: 'Thrissur',
  trichur: 'Thrissur',
  kottayam: 'Kottayam',
  kollam: 'Kollam',
  quilon: 'Kollam',
  palakkad: 'Palakkad',
  palghat: 'Palakkad',
  malappuram: 'Malappuram',
  kannur: 'Kannur',
  cannanore: 'Kannur',
  alappuzha: 'Alappuzha',
  alleppey: 'Alappuzha',
  idukki: 'Idukki',
  kasaragod: 'Kasaragod',
  pathanamthitta: 'Pathanamthitta',
  wayanad: 'Wayanad',
};

@Injectable()
export class WhatsAppIntakeService {
  private readonly logger = new Logger(WhatsAppIntakeService.name);

  constructor(
    @InjectRepository(WhatsAppIntakeSession)
    private readonly sessionRepository: Repository<WhatsAppIntakeSession>,
    @Optional()
    @InjectRepository(Tenant)
    private readonly tenantRepository?: Repository<Tenant>,
    @Optional()
    @InjectRepository(CaregiverRequest)
    private readonly requestRepository?: Repository<CaregiverRequest>,
    @Optional()
    @Inject(forwardRef(() => RequestsService))
    private readonly requestsService?: RequestsService,
    @Optional()
    @Inject(forwardRef(() => WhatsAppService))
    private readonly whatsappService?: WhatsAppService
  ) {}

  /**
   * Format human-friendly service type name
   */
  formatService(service?: string | null): string {
    const map: Record<string, string> = {
      elderly_care: 'Elderly Daily Assistance',
      bedridden_care: 'Bedridden & Palliative Care',
      post_op: 'Post-Operative Recovery',
      dementia_care: 'Dementia & Alzheimer’s Care',
      specialized_nursing: 'Specialized Nursing Care',
      mother_baby: 'Mother & Newborn Care',
    };
    return (service && map[service]) || service || 'General Care';
  }

  /**
   * Format human-friendly shift duration
   */
  formatDuration(duration?: string | null): string {
    const map: Record<string, string> = {
      '24_hours': '24 Hours Live-In',
      '12_day': '12 Hours Day Shift',
      '12_night': '12 Hours Night Shift',
      custom: 'Custom / Hourly Shift',
    };
    return (duration && map[duration]) || duration || 'Standard Shift';
  }

  /**
   * Format human-friendly caregiver gender preference
   */
  formatGenderPreference(pref?: string | null): string {
    const map: Record<string, string> = {
      female: 'Female Caregiver',
      male: 'Male Caregiver',
      any: 'Any / No Preference',
    };
    return (pref && map[pref]) || pref || 'Any';
  }

  /**
   * Clean and normalize phone number
   */
  normalizePhoneNumber(phone: string): string {
    const digits = phone.replace(/[^0-9]/g, '');
    if (digits.length === 10) {
      return `91${digits}`;
    }
    return digits;
  }

  /**
   * Parse service choice from user input
   */
  parseServiceType(input: string): string | null {
    const clean = input.trim().toLowerCase();
    if (clean === '1' || clean.includes('elderly')) return 'elderly_care';
    if (clean === '2' || clean.includes('bedridden') || clean.includes('palliative')) return 'bedridden_care';
    if (clean === '3' || clean.includes('post') || clean.includes('op') || clean.includes('surgery') || clean.includes('recovery')) return 'post_op';
    if (clean === '4' || clean.includes('dementia') || clean.includes('alzheimer')) return 'dementia_care';
    if (clean === '5' || clean.includes('nurs') || clean.includes('injection') || clean.includes('medical')) return 'specialized_nursing';
    if (clean === '6' || clean.includes('mother') || clean.includes('baby') || clean.includes('newborn') || clean.includes('postnatal')) return 'mother_baby';
    return null;
  }

  /**
   * Parse shift duration from user input
   */
  parseDuration(input: string): string | null {
    const clean = input.trim().toLowerCase();
    if (clean === '1' || clean.includes('24') || clean.includes('live-in') || clean.includes('live in')) return '24_hours';
    if (clean === '2' || clean.includes('day') || clean.includes('12_day') || clean === '12 day') return '12_day';
    if (clean === '3' || clean.includes('night') || clean.includes('12_night') || clean === '12 night') return '12_night';
    if (clean === '4' || clean.includes('custom') || clean.includes('hour') || clean.includes('part')) return 'custom';
    return null;
  }

  /**
   * Parse gender preference from user input
   */
  parseGenderPreference(input: string): string | null {
    const clean = input.trim().toLowerCase();
    if (clean === '1' || clean.includes('female') || clean.includes('woman') || clean.includes('lady')) return 'female';
    if (clean === '2' || clean.includes('male') || clean.includes('man') || clean.includes('gentleman')) return 'male';
    if (clean === '3' || clean.includes('any') || clean.includes('no pref') || clean.includes('either') || clean.includes('none')) return 'any';
    return null;
  }

  /**
   * Parse Kerala district and locality from user text
   */
  parseLocation(input: string): { district: string; locality: string | null } {
    const raw = input.trim();
    const lower = raw.toLowerCase();

    for (const [key, dist] of Object.entries(KERALA_DISTRICTS)) {
      if (lower.includes(key)) {
        // Remove district keyword to extract locality if present
        const localityPart = raw
          .replace(new RegExp(key, 'gi'), '')
          .replace(/[,\-–.]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        return {
          district: dist,
          locality: localityPart.length > 0 ? localityPart : null,
        };
      }
    }

    // If no specific district keyword was matched, treat the input as locality and default district to Ernakulam
    return {
      district: 'Ernakulam',
      locality: raw,
    };
  }

  /**
   * Parse patient age and optional name from user input
   */
  parsePatientInfo(input: string): { age: string | null; name: string } {
    const text = input.trim();
    const ageMatch = text.match(/\b([1-9][0-9]?|1[01][0-9]|120)\b/);

    if (!ageMatch) {
      return { age: null, name: text };
    }

    const age = ageMatch[1];
    // Remove age number and common words like "years", "yrs", "age"
    const cleanedName = text
      .replace(ageMatch[0], '')
      .replace(/\b(years?|yrs?|old|age|year|வயது|വയസ്സ്)\b/gi, '')
      .replace(/[,\-–:]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      age,
      name: cleanedName.length > 0 ? cleanedName : 'Patient',
    };
  }

  /**
   * Resolve agency name for message greetings
   */
  private async getAgencyName(tenantId?: string | null): Promise<string> {
    if (tenantId && this.tenantRepository) {
      try {
        const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
        if (tenant?.name) return tenant.name;
      } catch (err: any) {
        this.logger.warn(`Could not lookup tenant: ${err.message}`);
      }
    }
    return 'CareKerala Healthcare';
  }

  /**
   * Main conversational intake state machine.
   * Processes inbound WhatsApp message, validates step input, advances step,
   * and returns conversational bot reply.
   */
  async handleInboundMessage(
    fromPhone: string,
    rawText: string,
    tenantId?: string
  ): Promise<string> {
    const phone = this.normalizePhoneNumber(fromPhone);
    const text = rawText.trim();
    const lowerText = text.toLowerCase();

    this.logger.log(`Processing intake message from ${phone}: "${text}"`);

    // 1. Look up existing active session
    let session = await this.sessionRepository.findOne({
      where: {
        phone,
        status: IntakeSessionStatus.IN_PROGRESS,
      },
      order: { createdAt: 'DESC' },
    });

    const agencyName = await this.getAgencyName(session?.tenantId || tenantId);

    // 2. Check for global commands (restart, cancel, reset)
    if (
      lowerText === 'restart' ||
      lowerText === 'reset' ||
      lowerText === 'start over' ||
      lowerText === 'cancel'
    ) {
      if (session) {
        session.currentStep = IntakeStep.SERVICE;
        session.serviceType = null;
        session.district = null;
        session.locality = null;
        session.duration = null;
        session.patientName = null;
        session.patientAge = null;
        session.genderPreference = 'any';
        session.startDate = null;
        session.contactName = null;
        session.lastMessageAt = new Date();
        await this.sessionRepository.save(session);
      }
      return (
        `🔄 *Intake Flow Restarted*\n\n` +
        `Welcome to ${agencyName}! 👋 We provide certified home-nursing and caregiver support across Kerala.\n\n` +
        `To match the right caregiver for your family, what type of care do you require?\n` +
        `1️⃣ Elderly Daily Assistance\n` +
        `2️⃣ Bedridden & Palliative Care\n` +
        `3️⃣ Post-Operative Recovery\n` +
        `4️⃣ Dementia & Alzheimer's Care\n` +
        `5️⃣ Specialized Nursing Care\n` +
        `6️⃣ Mother & Newborn Care\n\n` +
        `Please reply with the number (1-6) or service name.`
      );
    }

    // 3. Check for help command
    if (lowerText === 'help' || lowerText === 'menu') {
      return (
        `ℹ️ *Caregiver Intake Assistance*\n\n` +
        `We are here to help you find verified caregiver and nursing staff for your home.\n` +
        `• Current step: *${session ? session.currentStep.toUpperCase() : 'NEW INTAKE'}*\n` +
        `• Type *RESTART* anytime to start over.\n\n` +
        (session
          ? `Please reply to the previous question, or type *RESTART* to begin again.`
          : `Type *HI* to begin your caregiver enquiry.`)
      );
    }

    // 4. If no active session exists, start a new one
    if (!session) {
      session = this.sessionRepository.create({
        phone,
        tenantId: tenantId || null,
        currentStep: IntakeStep.SERVICE,
        status: IntakeSessionStatus.IN_PROGRESS,
        genderPreference: 'any',
        lastMessageAt: new Date(),
      });
      session = await this.sessionRepository.save(session);

      // Check if user already provided service type in their first message
      const parsedInitialService = this.parseServiceType(text);
      if (parsedInitialService) {
        session.serviceType = parsedInitialService;
        session.currentStep = IntakeStep.LOCATION;
        await this.sessionRepository.save(session);

        return (
          `Welcome to ${agencyName}! 👋\n\n` +
          `Care requirement recorded: *${this.formatService(parsedInitialService)}* ✅\n\n` +
          `Which district and town/locality in Kerala is care needed in?\n` +
          `(e.g., 'Ernakulam, Kakkanad' or 'Kozhikode', 'Thrissur', 'Trivandrum')`
        );
      }

      return (
        `Welcome to ${agencyName}! 👋 We provide certified home-nursing and caregiver support across Kerala.\n\n` +
        `To help us match the right caregiver for your family, what type of care do you require?\n` +
        `1️⃣ Elderly Daily Assistance\n` +
        `2️⃣ Bedridden & Palliative Care\n` +
        `3️⃣ Post-Operative Recovery\n` +
        `4️⃣ Dementia & Alzheimer's Care\n` +
        `5️⃣ Specialized Nursing Care\n` +
        `6️⃣ Mother & Newborn Care\n\n` +
        `Please reply with the number (1-6) or service name.`
      );
    }

    session.lastMessageAt = new Date();

    // 5. State Machine Step Transitions
    switch (session.currentStep) {
      // Step 1: Service Type
      case IntakeStep.SERVICE: {
        const service = this.parseServiceType(text);
        if (!service) {
          return (
            `⚠️ Please choose a valid care option by replying with the number (1-6) or name:\n\n` +
            `1️⃣ Elderly Daily Assistance\n` +
            `2️⃣ Bedridden & Palliative Care\n` +
            `3️⃣ Post-Operative Recovery\n` +
            `4️⃣ Dementia & Alzheimer's Care\n` +
            `5️⃣ Specialized Nursing Care\n` +
            `6️⃣ Mother & Newborn Care`
          );
        }

        session.serviceType = service;
        session.currentStep = IntakeStep.LOCATION;
        await this.sessionRepository.save(session);

        return (
          `Selected: *${this.formatService(service)}* ✅\n\n` +
          `Which district and town/locality in Kerala is care needed in?\n` +
          `(e.g., 'Ernakulam, Kakkanad' or 'Kozhikode, Calicut beach', 'Thrissur', 'Trivandrum')`
        );
      }

      // Step 2: Location (District & Locality)
      case IntakeStep.LOCATION: {
        const { district, locality } = this.parseLocation(text);
        session.district = district;
        session.locality = locality;
        session.currentStep = IntakeStep.DURATION;
        await this.sessionRepository.save(session);

        const locDisplay = locality ? `${district} (${locality})` : district;
        return (
          `Location recorded: *${locDisplay}* 📍\n\n` +
          `What care schedule or shift duration do you need?\n` +
          `1️⃣ 24 Hours Live-In Care (24_hours)\n` +
          `2️⃣ 12 Hours Day Shift (12_day)\n` +
          `3️⃣ 12 Hours Night Shift (12_night)\n` +
          `4️⃣ Custom / Hourly Shift (custom)\n\n` +
          `Please reply with 1, 2, 3, or 4.`
        );
      }

      // Step 3: Shift Duration
      case IntakeStep.DURATION: {
        const duration = this.parseDuration(text);
        if (!duration) {
          return (
            `⚠️ Please select a valid shift schedule by replying with 1, 2, 3, or 4:\n\n` +
            `1️⃣ 24 Hours Live-In Care\n` +
            `2️⃣ 12 Hours Day Shift\n` +
            `3️⃣ 12 Hours Night Shift\n` +
            `4️⃣ Custom / Hourly Shift`
          );
        }

        session.duration = duration;
        session.currentStep = IntakeStep.PATIENT_AGE;
        await this.sessionRepository.save(session);

        return (
          `Shift duration: *${this.formatDuration(duration)}* ⏱️\n\n` +
          `Could you please share the patient's name and age?\n` +
          `(e.g., 'Mary Varghese, 78' or 'Age 82, George' or '75')`
        );
      }

      // Step 4: Patient Age & Name
      case IntakeStep.PATIENT_AGE: {
        const { age, name } = this.parsePatientInfo(text);
        if (!age) {
          return (
            `⚠️ Please mention the patient's age in years (e.g., '78' or 'Mary, 78 years') so we can ensure proper nursing qualifications.`
          );
        }

        session.patientAge = age;
        session.patientName = name || 'Patient';
        session.currentStep = IntakeStep.GENDER_PREFERENCE;
        await this.sessionRepository.save(session);

        return (
          `Patient recorded: *${session.patientName}* (Age: ${age}) 👤\n\n` +
          `Do you have a caregiver gender preference?\n` +
          `1️⃣ Female Caregiver\n` +
          `2️⃣ Male Caregiver\n` +
          `3️⃣ Any / No Preference\n\n` +
          `Please reply with 1, 2, or 3.`
        );
      }

      // Step 5: Caregiver Gender Preference
      case IntakeStep.GENDER_PREFERENCE: {
        const genderPref = this.parseGenderPreference(text);
        if (!genderPref) {
          return (
            `⚠️ Please select a caregiver gender preference by replying with 1, 2, or 3:\n\n` +
            `1️⃣ Female Caregiver\n` +
            `2️⃣ Male Caregiver\n` +
            `3️⃣ Any / No Preference`
          );
        }

        session.genderPreference = genderPref;
        session.currentStep = IntakeStep.START_DATE;
        await this.sessionRepository.save(session);

        return (
          `Gender preference: *${this.formatGenderPreference(genderPref)}* 🩺\n\n` +
          `When would you like care to start?\n` +
          `(e.g., 'Immediately / Today', 'Tomorrow', or a specific date like '5th October')`
        );
      }

      // Step 6: Start Date
      case IntakeStep.START_DATE: {
        let startDate = text;
        if (
          lowerText.includes('immediate') ||
          lowerText.includes('today') ||
          lowerText.includes('urgent') ||
          lowerText.includes('now')
        ) {
          startDate = 'Immediately';
        } else if (lowerText.includes('tomorrow')) {
          startDate = 'Tomorrow';
        }

        session.startDate = startDate;
        session.currentStep = IntakeStep.CONTACT_NAME;
        await this.sessionRepository.save(session);

        return (
          `Start date: *${startDate}* 📅\n\n` +
          `Lastly, what is your name so our care coordinator can address you?`
        );
      }

      // Step 7: Contact Person Name
      case IntakeStep.CONTACT_NAME: {
        const contactName = text.replace(/^my name is /i, '').trim();
        session.contactName = contactName || 'Family Member';
        session.currentStep = IntakeStep.CONFIRMATION;
        await this.sessionRepository.save(session);

        const locDisplay = session.locality
          ? `${session.district} (${session.locality})`
          : `${session.district}`;

        return (
          `Thank you, *${session.contactName}*! Please review your care request summary:\n\n` +
          `📋 *Care Request Summary*:\n` +
          `• Service: *${this.formatService(session.serviceType)}*\n` +
          `• Location: *${locDisplay}*\n` +
          `• Duration: *${this.formatDuration(session.duration)}*\n` +
          `• Patient: *${session.patientName}* (Age: ${session.patientAge})\n` +
          `• Caregiver Preference: *${this.formatGenderPreference(session.genderPreference)}*\n` +
          `• Start Date: *${session.startDate}*\n` +
          `• Contact: *${session.contactName}* (+${session.phone})\n\n` +
          `Reply *YES* or *1* to confirm and submit your request.\n` +
          `Reply *RESTART* to start over.`
        );
      }

      // Step 8: Confirmation
      case IntakeStep.CONFIRMATION: {
        if (
          lowerText === 'yes' ||
          lowerText === 'y' ||
          lowerText === '1' ||
          lowerText === 'confirm' ||
          lowerText === 'ok' ||
          lowerText === 'sure'
        ) {
          // Auto-create requests row from completed conversation (Phase 9, Point 2)
          let createdRequest: CaregiverRequest | null = null;
          try {
            createdRequest = await this.createRequestFromSession(session);
          } catch (err: any) {
            this.logger.error(
              `Error auto-creating request from WhatsApp session ${session.id}: ${err.message}`,
              err.stack
            );
            session.status = IntakeSessionStatus.COMPLETED;
            session.currentStep = IntakeStep.COMPLETED;
            await this.sessionRepository.save(session);
          }

          const refDisplay = createdRequest?.referenceId
            ? `\n\n• Reference Code: *${createdRequest.referenceId}*`
            : '';

          this.logger.log(
            `WhatsApp intake completed for phone ${phone}: Ref=${createdRequest?.referenceId || 'N/A'}, Patient=${session.patientName}, Service=${session.serviceType}, District=${session.district}`
          );

          return (
            `✅ *Care Request Confirmed!*\n\n` +
            `Thank you, ${session.contactName}. Your care enquiry has been registered with ${agencyName}.${refDisplay}\n\n` +
            `Our nurse coordinator will review your requirement and contact you on this WhatsApp number within 60 minutes with verified caregiver profiles matching ${session.patientName}'s needs.\n\n` +
            `For urgent assistance, feel free to reply directly to this chat.`
          );
        }

        if (lowerText === 'no' || lowerText === 'restart') {
          session.currentStep = IntakeStep.SERVICE;
          await this.sessionRepository.save(session);
          return (
            `Request cancelled. Let's start over.\n\n` +
            `What type of care do you require?\n` +
            `1️⃣ Elderly Daily Assistance\n` +
            `2️⃣ Bedridden & Palliative Care\n` +
            `3️⃣ Post-Operative Recovery\n` +
            `4️⃣ Dementia & Alzheimer's Care\n` +
            `5️⃣ Specialized Nursing Care\n` +
            `6️⃣ Mother & Newborn Care`
          );
        }

        return (
          `⚠️ Please reply *YES* to confirm and submit your care request, or *RESTART* to start over.`
        );
      }

      case IntakeStep.COMPLETED: {
        // User messaged again after completion -> Start a fresh new intake
        const newSession = this.sessionRepository.create({
          phone,
          tenantId: session.tenantId,
          currentStep: IntakeStep.SERVICE,
          status: IntakeSessionStatus.IN_PROGRESS,
          genderPreference: 'any',
          lastMessageAt: new Date(),
        });
        await this.sessionRepository.save(newSession);

        return (
          `Hello again! Welcome back to ${agencyName}. 👋\n\n` +
          `Would you like to register a new caregiver request?\n` +
          `1️⃣ Elderly Daily Assistance\n` +
          `2️⃣ Bedridden & Palliative Care\n` +
          `3️⃣ Post-Operative Recovery\n` +
          `4️⃣ Dementia & Alzheimer's Care\n` +
          `5️⃣ Specialized Nursing Care\n` +
          `6️⃣ Mother & Newborn Care\n\n` +
          `Please reply with 1-6 or care type.`
        );
      }

      default: {
        session.currentStep = IntakeStep.SERVICE;
        await this.sessionRepository.save(session);
        return `Please reply with the care service needed (1-6) or type *RESTART*.`;
      }
    }
  }

  /**
   * Auto-create a `requests` row from a completed WhatsApp intake conversation.
   * Links request_id and reference_id back to the intake session and updates session status.
   */
  async createRequestFromSession(
    sessionOrId: WhatsAppIntakeSession | string
  ): Promise<CaregiverRequest> {
    let session: WhatsAppIntakeSession | null = null;
    if (typeof sessionOrId === 'string') {
      session = await this.sessionRepository.findOne({
        where: { id: sessionOrId },
        relations: ['request'],
      });
      if (!session) {
        throw new NotFoundException(`Intake session with ID ${sessionOrId} not found.`);
      }
    } else {
      session = sessionOrId;
    }

    // If request has already been auto-created, return existing
    if (session.requestId && session.request) {
      return session.request;
    }
    if (session.requestId && this.requestRepository) {
      const existing = await this.requestRepository.findOne({
        where: { id: session.requestId },
      });
      if (existing) {
        session.request = existing;
        return existing;
      }
    }

    // Resolve tenantId
    let effectiveTenantId = session.tenantId;
    if (!effectiveTenantId && this.tenantRepository) {
      const defaultTenant = await this.tenantRepository.findOne({
        order: { createdAt: 'ASC' },
      });
      if (defaultTenant) {
        effectiveTenantId = defaultTenant.id;
        session.tenantId = defaultTenant.id;
      }
    }

    const referenceId =
      session.referenceId ||
      `REQ-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const serviceType = session.serviceType || 'elderly_care';
    const duration = session.duration || '24_hours';
    const district = session.district || 'Ernakulam';
    const patientName = session.patientName || 'Patient';
    const contactName = session.contactName || 'Family Contact';
    const phone = session.phone;

    let savedRequest: CaregiverRequest;

    if (this.requestsService) {
      const result = await this.requestsService.createRequest(
        {
          tenantId: effectiveTenantId || undefined,
          referenceId,
          serviceType,
          duration,
          genderPreference: session.genderPreference || 'any',
          startDate: session.startDate || 'Immediately',
          district,
          locality: session.locality || undefined,
          patientName,
          patientAge: session.patientAge || undefined,
          patientGender: 'unspecified',
          contactName,
          phone,
          isWhatsapp: true,
          source: 'whatsapp',
          notes: `Auto-captured via WhatsApp conversational intake (Session: ${session.id})`,
        },
        effectiveTenantId || undefined
      );
      savedRequest = result.request;
    } else if (this.requestRepository) {
      const newEntity = this.requestRepository.create({
        tenantId: effectiveTenantId || '00000000-0000-0000-0000-000000000001',
        referenceId,
        serviceType,
        duration,
        engagementPeriod: 'ongoing',
        genderPreference: session.genderPreference || 'any',
        startDate: session.startDate || 'Immediately',
        district,
        locality: session.locality || null,
        patientName,
        patientAge: session.patientAge || null,
        patientGender: 'unspecified',
        contactName,
        relationship: 'family',
        phone,
        isWhatsapp: true,
        source: 'whatsapp',
        status: RequestStatus.PENDING,
        notes: `Auto-captured via WhatsApp conversational intake (Session: ${session.id})`,
      });
      savedRequest = await this.requestRepository.save(newEntity);

      if (this.whatsappService) {
        try {
          await this.whatsappService.notifyAgencyOwnerOnEnquiry({
            referenceId: savedRequest.referenceId,
            requestId: savedRequest.id,
            patientName: savedRequest.patientName,
            serviceType: savedRequest.serviceType,
            duration: savedRequest.duration,
            contactName: savedRequest.contactName,
            phone: savedRequest.phone,
            district: savedRequest.district,
            locality: savedRequest.locality || undefined,
            tenantId: effectiveTenantId || undefined,
            patientAge: savedRequest.patientAge ? String(savedRequest.patientAge) : undefined,
            source: 'whatsapp',
            isAutoCaptured: true,
            genderPreference: savedRequest.genderPreference,
            startDate: savedRequest.startDate,
          });
        } catch (err: any) {
          this.logger.warn(`Could not dispatch admin alert for session ${session.id}: ${err.message}`);
        }
      }
    } else {
      throw new BadRequestException('Request repository is not available to create request row.');
    }

    // Link back to intake session
    session.requestId = savedRequest.id;
    session.referenceId = savedRequest.referenceId;
    session.status = IntakeSessionStatus.COMPLETED;
    session.currentStep = IntakeStep.COMPLETED;
    session.request = savedRequest;
    await this.sessionRepository.save(session);

    this.logger.log(
      `Auto-created requests row from WhatsApp intake session ${session.id}: Request ID=${savedRequest.id}, Ref=${savedRequest.referenceId}`
    );

    return savedRequest;
  }

  /**
   * Get active or latest session by phone number
   */
  async getSessionByPhone(phone: string): Promise<WhatsAppIntakeSession | null> {
    const cleanPhone = this.normalizePhoneNumber(phone);
    return this.sessionRepository.findOne({
      where: { phone: cleanPhone },
      relations: ['request'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * List sessions with optional filtering
   */
  async listSessions(tenantId?: string): Promise<WhatsAppIntakeSession[]> {
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    return this.sessionRepository.find({
      where,
      relations: ['request'],
      order: { lastMessageAt: 'DESC' },
    });
  }
}
