import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { WhatsAppConfigService } from './whatsapp-config.service';
import { FeedbackService } from '../feedback/feedback.service';
import { WhatsAppIntakeService } from './intake/whatsapp-intake.service';
import {
  STANDARD_HEALTHCARE_TEMPLATES,
  WHATSAPP_TEMPLATES,
  WhatsAppCodeVerificationStatus,
  WhatsAppQualityRating,
} from './whatsapp.constants';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { AdminLeadAlertDto } from '../notifications/dto/admin-lead-alert.dto';

export interface WhatsAppPhoneNumberStatus {
  id: string;
  verifiedName: string;
  displayPhoneNumber: string;
  codeVerificationStatus: string;
  qualityRating: string;
  nameStatus: string;
  messagingLimitTier?: string;
  isMock: boolean;
}

export interface SendWhatsAppResponse {
  success: boolean;
  messageId?: string;
  recipient: string;
  mode: 'live' | 'mock';
  error?: string;
}

export interface CaregiverEnquiryNotificationDto {
  referenceId: string;
  patientName: string;
  serviceType: string;
  duration: string;
  contactName: string;
  phone: string;
  district: string;
  locality?: string;
  agencyName?: string;
  tenantId?: string;
  subdomain?: string;
  ownerPhone?: string;
  patientAge?: string;
  patientCondition?: string;
  notes?: string;
  requestId?: string;
  source?: string;
  isAutoCaptured?: boolean;
  genderPreference?: string;
  startDate?: string;
}

export interface EnquiryNotificationResult {
  success: boolean;
  referenceId: string;
  agencyName: string;
  targetOwnerPhone: string;
  ownerAlert: SendWhatsAppResponse;
  customerAck?: SendWhatsAppResponse;
  pushAlertSent?: boolean;
  adminPushDispatch?: any;
}

export interface PostAssignmentRatingRequestDto {
  assignmentId: string;
  customerPhone: string;
  contactName: string;
  patientName: string;
  caregiverName: string;
  agencyName?: string;
  tenantId?: string;
  subdomain?: string;
  feedbackUrl?: string;
}

export interface PostAssignmentRatingResult {
  success: boolean;
  assignmentId: string;
  recipient: string;
  messageId?: string;
  mode: 'live' | 'mock';
  error?: string;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private readonly config: WhatsAppConfigService,
    @Optional()
    @InjectRepository(User)
    private readonly userRepository?: Repository<User>,
    @Optional()
    @InjectRepository(Tenant)
    private readonly tenantRepository?: Repository<Tenant>,
    @Optional()
    @Inject(forwardRef(() => FeedbackService))
    private readonly feedbackService?: FeedbackService,
    @Optional()
    @Inject(forwardRef(() => WhatsAppIntakeService))
    private readonly intakeService?: WhatsAppIntakeService,
    @Optional()
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService?: NotificationsService
  ) {}

  /**
   * Check phone number verification and quality status from Meta Graph API
   */
  async verifyPhoneNumberStatus(overridePhoneNumberId?: string): Promise<WhatsAppPhoneNumberStatus> {
    const phoneId = overridePhoneNumberId || this.config.phoneNumberId;

    if (this.config.isDevMockMode || !this.config.isConfigured()) {
      this.logger.log(`[WhatsApp Mock Mode] Fetching phone status for ID: ${phoneId || 'mock-phone-id'}`);
      return {
        id: phoneId || '104829104812345',
        verifiedName: 'CareKerala Healthcare Network',
        displayPhoneNumber: this.config.defaultOriginPhone,
        codeVerificationStatus: WhatsAppCodeVerificationStatus.VERIFIED,
        qualityRating: WhatsAppQualityRating.GREEN,
        nameStatus: 'APPROVED',
        messagingLimitTier: 'TIER_1K',
        isMock: true,
      };
    }

    try {
      const url = `${this.config.apiBaseUrl}/${phoneId}?fields=verified_name,code_verification_status,display_phone_number,quality_rating,name_status,messaging_limit_tier`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.config.apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || `Meta API error (${res.status})`);
      }

      return {
        id: data.id,
        verifiedName: data.verified_name || '',
        displayPhoneNumber: data.display_phone_number || '',
        codeVerificationStatus: data.code_verification_status || WhatsAppCodeVerificationStatus.NOT_VERIFIED,
        qualityRating: data.quality_rating || WhatsAppQualityRating.UNKNOWN,
        nameStatus: data.name_status || 'UNKNOWN',
        messagingLimitTier: data.messaging_limit_tier,
        isMock: false,
      };
    } catch (err: any) {
      this.logger.error(`Failed to verify WhatsApp phone status: ${err.message}`, err.stack);
      throw new InternalServerErrorException(`WhatsApp Phone Verification failed: ${err.message}`);
    }
  }

  /**
   * Submit registration PIN for an agency's new phone number on Meta Cloud API
   */
  async registerPhoneNumber(pin: string, overridePhoneNumberId?: string): Promise<{ success: boolean; message: string }> {
    const phoneId = overridePhoneNumberId || this.config.phoneNumberId;

    if (!pin || pin.length !== 6) {
      throw new BadRequestException('A 6-digit PIN is required for WhatsApp registration.');
    }

    if (this.config.isDevMockMode || !this.config.isConfigured()) {
      this.logger.log(`[WhatsApp Mock Mode] Registered phone number ID ${phoneId} with PIN: ******`);
      return {
        success: true,
        message: 'Phone number registered successfully (development mock mode).',
      };
    }

    try {
      const url = `${this.config.apiBaseUrl}/${phoneId}/register`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          pin,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || `Meta API error (${res.status})`);
      }

      return {
        success: true,
        message: 'Phone number successfully registered on Meta WhatsApp Cloud API.',
      };
    } catch (err: any) {
      this.logger.error(`WhatsApp register failed: ${err.message}`, err.stack);
      throw new InternalServerErrorException(`WhatsApp Registration failed: ${err.message}`);
    }
  }

  /**
   * Fetch approved/pending message templates for the WhatsApp Business Account (WABA)
   */
  async getTemplates(overrideWabaId?: string): Promise<any[]> {
    const wabaId = overrideWabaId || this.config.businessAccountId;

    if (this.config.isDevMockMode || !this.config.isConfigured()) {
      this.logger.log(`[WhatsApp Mock Mode] Returning ${STANDARD_HEALTHCARE_TEMPLATES.length} pre-configured templates`);
      return STANDARD_HEALTHCARE_TEMPLATES.map((t) => ({
        ...t,
        id: `mock-tmpl-${t.name}`,
        status: 'APPROVED',
      }));
    }

    try {
      const url = `${this.config.apiBaseUrl}/${wabaId}/message_templates`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.config.apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || `Meta API error (${res.status})`);
      }

      return data.data || [];
    } catch (err: any) {
      this.logger.error(`Failed to get WhatsApp templates: ${err.message}`, err.stack);
      throw new InternalServerErrorException(`Failed to get WhatsApp templates: ${err.message}`);
    }
  }

  /**
   * Submit standard healthcare templates to Meta for approval / App Review
   */
  async syncStandardTemplates(overrideWabaId?: string): Promise<{ synced: number; results: any[] }> {
    const wabaId = overrideWabaId || this.config.businessAccountId;
    const results: any[] = [];

    for (const template of STANDARD_HEALTHCARE_TEMPLATES) {
      if (this.config.isDevMockMode || !this.config.isConfigured()) {
        results.push({
          name: template.name,
          status: 'MOCK_REGISTERED',
          message: 'Simulated submission to Meta App Review.',
        });
      } else {
        try {
          const url = `${this.config.apiBaseUrl}/${wabaId}/message_templates`;
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.config.apiToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(template),
          });

          const data = await res.json();
          results.push({
            name: template.name,
            status: res.ok ? 'SUBMITTED_FOR_REVIEW' : 'ERROR',
            data,
          });
        } catch (err: any) {
          results.push({
            name: template.name,
            status: 'ERROR',
            error: err.message,
          });
        }
      }
    }

    return {
      synced: results.length,
      results,
    };
  }

  /**
   * Send pre-approved template message (Official Meta Cloud API)
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode = 'en_US',
    components: any[] = []
  ): Promise<SendWhatsAppResponse> {
    const cleanTo = this.normalizePhoneNumber(to);

    if (this.config.isDevMockMode || !this.config.isConfigured()) {
      const mockId = `wamid.MOCK_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      this.logger.log(
        `[WhatsApp Mock Mode] Sent template "${templateName}" to ${cleanTo} (ID: ${mockId})\nPayload components: ${JSON.stringify(
          components
        )}`
      );
      return {
        success: true,
        messageId: mockId,
        recipient: cleanTo,
        mode: 'mock',
      };
    }

    try {
      const url = `${this.config.apiBaseUrl}/${this.config.phoneNumberId}/messages`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanTo,
          type: 'template',
          template: {
            name: templateName,
            language: { code: languageCode },
            components,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || `Meta API error (${res.status})`);
      }

      const messageId = data?.messages?.[0]?.id;
      this.logger.log(`WhatsApp template "${templateName}" sent to ${cleanTo} (ID: ${messageId})`);

      return {
        success: true,
        messageId,
        recipient: cleanTo,
        mode: 'live',
      };
    } catch (err: any) {
      this.logger.error(`Failed to send WhatsApp template "${templateName}": ${err.message}`, err.stack);
      return {
        success: false,
        recipient: cleanTo,
        mode: 'live',
        error: err.message,
      };
    }
  }

  /**
   * Send free-form text message (Allowed inside active 24-hour service conversation window)
   */
  async sendTextMessage(to: string, text: string): Promise<SendWhatsAppResponse> {
    const cleanTo = this.normalizePhoneNumber(to);

    if (this.config.isDevMockMode || !this.config.isConfigured()) {
      const mockId = `wamid.MOCK_TXT_${Date.now()}`;
      this.logger.log(`[WhatsApp Mock Mode] Sent text to ${cleanTo}: "${text}"`);
      return {
        success: true,
        messageId: mockId,
        recipient: cleanTo,
        mode: 'mock',
      };
    }

    try {
      const url = `${this.config.apiBaseUrl}/${this.config.phoneNumberId}/messages`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanTo,
          type: 'text',
          text: {
            preview_url: false,
            body: text,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || `Meta API error (${res.status})`);
      }

      return {
        success: true,
        messageId: data?.messages?.[0]?.id,
        recipient: cleanTo,
        mode: 'live',
      };
    } catch (err: any) {
      this.logger.error(`Failed to send WhatsApp text: ${err.message}`, err.stack);
      return {
        success: false,
        recipient: cleanTo,
        mode: 'live',
        error: err.message,
      };
    }
  }

  /**
   * Verify Meta Webhook HMAC-SHA256 signature
   */
  verifyWebhookSignature(rawBody: string, signatureHeader?: string): boolean {
    if (!this.config.appSecret) {
      // In dev or when secret not configured, log warning
      return true;
    }
    if (!signatureHeader) return false;

    try {
      const [algo, signature] = signatureHeader.split('=');
      if (algo !== 'sha256') return false;

      const expected = crypto
        .createHmac('sha256', this.config.appSecret)
        .update(rawBody)
        .digest('hex');

      return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
    } catch {
      return false;
    }
  }

  /**
   * Process inbound Meta Webhook Event (message statuses, inbound texts)
   */
  async processWebhookEvent(payload: any): Promise<{ handled: boolean; eventType: string }> {
    if (payload.object !== 'whatsapp_business_account') {
      return { handled: false, eventType: 'unknown' };
    }

    const entries = payload.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field === 'messages') {
          const value = change.value;

          // 1. Message Delivery Status Receipts
          if (value.statuses && value.statuses.length > 0) {
            for (const status of value.statuses) {
              this.logger.log(
                `WhatsApp delivery receipt: ID ${status.id} -> ${status.status} (recipient: ${status.recipient_id})`
              );
            }
            return { handled: true, eventType: 'status_receipt' };
          }

          // 2. Incoming customer messages
          if (value.messages && value.messages.length > 0) {
            for (const msg of value.messages) {
              const from = msg.from;
              const text = msg.text?.body || msg.interactive?.button_reply?.title || '';
              this.logger.log(
                `Inbound WhatsApp message from ${from}: type=${msg.type} body=${text}`
              );

              // 2a. Auto-record rating & comment if customer replied to rating request
              let handledByFeedback = false;
              if (this.feedbackService && text) {
                try {
                  const ratingResult = await this.feedbackService.recordInboundWhatsAppRating(
                    from,
                    text,
                    msg.id
                  );
                  if (ratingResult.matched && ratingResult.thankYouMessage) {
                    await this.sendTextMessage(from, ratingResult.thankYouMessage);
                    handledByFeedback = true;
                  }
                } catch (err: any) {
                  this.logger.warn(`Could not process rating from inbound message: ${err.message}`);
                }
              }

              // 2b. Conversational lead intake flow (Phase 9, Point 1)
              if (!handledByFeedback && this.intakeService && text) {
                try {
                  const intakeReply = await this.intakeService.handleInboundMessage(from, text);
                  if (intakeReply) {
                    await this.sendTextMessage(from, intakeReply);
                  }
                } catch (err: any) {
                  this.logger.warn(`Could not process intake from inbound message: ${err.message}`);
                }
              }
            }
            return { handled: true, eventType: 'inbound_message' };
          }
        }
      }
    }

    return { handled: true, eventType: 'generic_event' };
  }

  /**
   * Format phone number to international E.164 without '+' or spaces for Meta API
   * e.g., '+91 98470 12345' -> '919847012345'
   */
  normalizePhoneNumber(phone: string): string {
    const digits = phone.replace(/[^0-9]/g, '');
    if (digits.length === 10) {
      // Default to India (+91)
      return `91${digits}`;
    }
    return digits;
  }

  /**
   * Format service type identifier to human-friendly display label
   */
  formatServiceType(id: string): string {
    const map: Record<string, string> = {
      elderly_care: 'Elderly Daily Assistance',
      bedridden_care: 'Bedridden & Palliative Care',
      post_op: 'Post-Operative Recovery',
      dementia_care: 'Dementia & Alzheimer’s Care',
      specialized_nursing: 'Specialized Nursing Care',
      mother_baby: 'Mother & Newborn Care',
    };
    return map[id] || id;
  }

  /**
   * Format care duration/shift identifier to human-friendly display label
   */
  formatDuration(id: string): string {
    const map: Record<string, string> = {
      '24_hours': '24 Hours Live-In',
      '12_day': '12 Hours Day Shift',
      '12_night': '12 Hours Night Shift',
      custom: 'Custom Shift',
    };
    return map[id] || id;
  }

  /**
   * Instant WhatsApp notification to agency owner (and customer acknowledgement) on form submit.
   * Multi-tenant aware: resolves owner/agency phone from subdomain or tenant settings,
   * with fallback to default origin phone.
   */
  async notifyAgencyOwnerOnEnquiry(
    dto: CaregiverEnquiryNotificationDto
  ): Promise<EnquiryNotificationResult> {
    if (!dto.referenceId || !dto.patientName || !dto.contactName || !dto.phone) {
      throw new BadRequestException(
        'Missing required enquiry details for WhatsApp notification (referenceId, patientName, contactName, phone).'
      );
    }

    let agencyName = dto.agencyName || 'CareKerala Healthcare';
    let targetOwnerPhone = dto.ownerPhone;

    // 1. Resolve owner phone from tenant_id if not directly provided
    if (!targetOwnerPhone && dto.tenantId && this.userRepository) {
      try {
        const ownerUser = await this.userRepository.findOne({
          where: {
            tenantId: dto.tenantId,
            role: UserRole.OWNER,
            isActive: true,
          },
        });
        if (ownerUser?.phone) {
          targetOwnerPhone = ownerUser.phone;
        }
      } catch (err: any) {
        this.logger.warn(`Could not lookup tenant owner user for tenant ${dto.tenantId}: ${err.message}`);
      }
    }

    // 2. Resolve from subdomain if provided
    if (!targetOwnerPhone && dto.subdomain && this.tenantRepository) {
      try {
        const tenant = await this.tenantRepository.findOne({
          where: { subdomain: dto.subdomain },
        });
        if (tenant) {
          if (!dto.agencyName && tenant.name) {
            agencyName = tenant.name;
          }
          if (tenant.phone) {
            targetOwnerPhone = tenant.phone;
          }
          if (!targetOwnerPhone && this.userRepository) {
            const ownerUser = await this.userRepository.findOne({
              where: {
                tenantId: tenant.id,
                role: UserRole.OWNER,
                isActive: true,
              },
            });
            if (ownerUser?.phone) {
              targetOwnerPhone = ownerUser.phone;
            }
          }
        }
      } catch (err: any) {
        this.logger.warn(`Could not lookup tenant by subdomain ${dto.subdomain}: ${err.message}`);
      }
    }

    // 3. Resolve from tenant table by tenantId
    if (!targetOwnerPhone && dto.tenantId && this.tenantRepository) {
      try {
        const tenant = await this.tenantRepository.findOne({
          where: { id: dto.tenantId },
        });
        if (tenant) {
          if (!dto.agencyName && tenant.name) {
            agencyName = tenant.name;
          }
          if (tenant.phone) {
            targetOwnerPhone = tenant.phone;
          }
        }
      } catch (err: any) {
        this.logger.warn(`Could not lookup tenant ${dto.tenantId}: ${err.message}`);
      }
    }

    // 4. Default fallback phone
    if (!targetOwnerPhone) {
      targetOwnerPhone = this.config.defaultOriginPhone;
    }

    const formattedService = this.formatServiceType(dto.serviceType || 'elderly_care');
    const formattedDuration = this.formatDuration(dto.duration || '24_hours');
    const districtLocation = dto.district || 'Kerala';

    const isWhatsAppLead = dto.source === 'whatsapp' || dto.isAutoCaptured === true;
    const headerTitle = isWhatsAppLead ? `[WhatsApp Lead] ${districtLocation}` : districtLocation;
    const patientDisplay = dto.patientAge
      ? `${dto.patientName} (${dto.patientAge}y)`
      : dto.patientName;

    this.logger.log(
      `Triggering instant WhatsApp alert for Enquiry ${dto.referenceId} -> Agency Owner (${targetOwnerPhone}) [isWhatsAppLead=${isWhatsAppLead}]`
    );

    // Build components for official Meta Cloud API template: agency_new_enquiry_alert
    const ownerComponents = [
      {
        type: 'header',
        parameters: [
          {
            type: 'text',
            text: headerTitle,
          },
        ],
      },
      {
        type: 'body',
        parameters: [
          { type: 'text', text: dto.referenceId },
          { type: 'text', text: patientDisplay },
          { type: 'text', text: formattedService },
          { type: 'text', text: formattedDuration },
          { type: 'text', text: dto.contactName },
          { type: 'text', text: dto.phone },
        ],
      },
    ];

    const ownerAlert = await this.sendTemplateMessage(
      targetOwnerPhone,
      WHATSAPP_TEMPLATES.AGENCY_NEW_ENQUIRY_ALERT,
      'en_US',
      ownerComponents
    );

    // Customer acknowledgement dispatch (skipped if user completed conversation directly in WhatsApp bot)
    let customerAck: SendWhatsAppResponse | undefined;
    if (dto.phone && !isWhatsAppLead) {
      const helpline = targetOwnerPhone || this.config.defaultOriginPhone;
      const customerComponents = [
        {
          type: 'header',
          parameters: [
            {
              type: 'text',
              text: agencyName,
            },
          ],
        },
        {
          type: 'body',
          parameters: [
            { type: 'text', text: dto.contactName },
            { type: 'text', text: agencyName },
            { type: 'text', text: dto.referenceId },
            { type: 'text', text: dto.patientName },
            { type: 'text', text: districtLocation },
            { type: 'text', text: helpline },
          ],
        },
      ];

      customerAck = await this.sendTemplateMessage(
        dto.phone,
        WHATSAPP_TEMPLATES.CUSTOMER_ENQUIRY_ACKNOWLEDGEMENT,
        'en_US',
        customerComponents
      );
    }

    // Web Push alert to agency admin PWA devices
    let pushAlertSent = false;
    let adminPushDispatch: any = null;
    const effectiveTenantId = dto.tenantId;

    if (this.notificationsService && effectiveTenantId) {
      try {
        adminPushDispatch = await this.notificationsService.broadcastPushNotification(
          effectiveTenantId,
          {
            title: isWhatsAppLead
              ? `🚨 New WhatsApp Lead: ${dto.patientName}`
              : `New Enquiry: ${dto.patientName}`,
            body: `${formattedService} in ${districtLocation} (${formattedDuration}). Contact: ${dto.contactName} (${dto.phone}). 60m SLA active.`,
            icon: '/icons/icon-192.svg',
            tag: `lead-${dto.referenceId}`,
            data: {
              url: `/dashboard/requests`,
              referenceId: dto.referenceId,
              requestId: dto.requestId,
              source: dto.source || (isWhatsAppLead ? 'whatsapp' : 'public_form'),
            },
          }
        );
        pushAlertSent = adminPushDispatch.sentCount > 0;
      } catch (err: any) {
        this.logger.warn(`Push alert dispatch failed for lead ${dto.referenceId}: ${err.message}`);
      }
    }

    return {
      success: ownerAlert.success,
      referenceId: dto.referenceId,
      agencyName,
      targetOwnerPhone,
      ownerAlert,
      customerAck,
      pushAlertSent,
      adminPushDispatch,
    };
  }

  /**
   * Push/WhatsApp alert to admin for new auto-captured lead (Phase 9, Point 3).
   */
  async notifyAdminOnAutoCapturedLead(dto: AdminLeadAlertDto) {
    if (this.notificationsService) {
      return this.notificationsService.notifyAdminOnAutoCapturedLead(dto);
    }
    return this.notifyAgencyOwnerOnEnquiry({
      ...dto,
      source: 'whatsapp',
      isAutoCaptured: true,
    });
  }

  /**
   * Post-assignment-completion WhatsApp rating request to customer.
   * Dispatches official Meta template: post_assignment_feedback_request
   * Prompts family to provide 1-5 star caregiver rating and optional review.
   */
  async sendPostAssignmentRatingRequest(
    dto: PostAssignmentRatingRequestDto
  ): Promise<PostAssignmentRatingResult> {
    if (!dto.assignmentId || !dto.customerPhone || !dto.patientName || !dto.caregiverName) {
      throw new BadRequestException(
        'Missing required parameters for post-assignment feedback request (assignmentId, customerPhone, patientName, caregiverName).'
      );
    }

    let agencyName = dto.agencyName;
    let subdomain = dto.subdomain;

    if ((!agencyName || !subdomain) && dto.tenantId && this.tenantRepository) {
      try {
        const tenant = await this.tenantRepository.findOne({
          where: { id: dto.tenantId },
        });
        if (tenant) {
          if (!agencyName && tenant.name) agencyName = tenant.name;
          if (!subdomain && tenant.subdomain) subdomain = tenant.subdomain;
        }
      } catch (err: any) {
        this.logger.warn(`Could not resolve tenant for feedback request: ${err.message}`);
      }
    }

    agencyName = agencyName || 'CareKerala Healthcare';
    const contactName = dto.contactName || 'Valued Customer';
    const feedbackUrl =
      dto.feedbackUrl ||
      `https://${subdomain ? `${subdomain}.` : ''}app.caregiver.com/feedback/${dto.assignmentId}`;

    this.logger.log(
      `Dispatching post-assignment WhatsApp rating request for assignment ${dto.assignmentId} to customer ${dto.customerPhone}`
    );

    const components = [
      {
        type: 'header',
        parameters: [
          {
            type: 'text',
            text: agencyName,
          },
        ],
      },
      {
        type: 'body',
        parameters: [
          { type: 'text', text: contactName },
          { type: 'text', text: agencyName },
          { type: 'text', text: dto.patientName },
          { type: 'text', text: dto.caregiverName },
          { type: 'text', text: feedbackUrl },
        ],
      },
    ];

    const response = await this.sendTemplateMessage(
      dto.customerPhone,
      WHATSAPP_TEMPLATES.POST_ASSIGNMENT_FEEDBACK_REQUEST,
      'en_US',
      components
    );

    return {
      success: response.success,
      assignmentId: dto.assignmentId,
      recipient: response.recipient,
      messageId: response.messageId,
      mode: response.mode,
      error: response.error,
    };
  }
}

