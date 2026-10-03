import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import {
  WhatsAppService,
  CaregiverEnquiryNotificationDto,
  PostAssignmentRatingRequestDto,
} from './whatsapp.service';
import { WhatsAppConfigService } from './whatsapp-config.service';
import { WhatsAppIntakeService } from './intake/whatsapp-intake.service';
import { AdminLeadAlertDto } from '../notifications/dto/admin-lead-alert.dto';

@Controller('whatsapp')
export class WhatsAppWebhookController {
  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly config: WhatsAppConfigService,
    @Optional()
    private readonly intakeService?: WhatsAppIntakeService
  ) {}

  /**
   * Meta Webhook Verification Endpoint (Official Cloud API handshake)
   * Responds with hub.challenge when verify token matches.
   */
  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string
  ): string {
    if (mode === 'subscribe' && token === this.config.webhookVerifyToken) {
      return challenge;
    }
    throw new ForbiddenException('Invalid WhatsApp webhook verification token.');
  }

  /**
   * Meta Inbound Webhook Event Receiver (statuses, messages, errors)
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() body: any,
    @Headers('x-hub-signature-256') signature?: string
  ): Promise<{ status: string }> {
    // Verify HMAC-SHA256 signature if configured
    const rawBody = typeof body === 'string' ? body : JSON.stringify(body);
    if (!this.whatsappService.verifyWebhookSignature(rawBody, signature)) {
      throw new ForbiddenException('Invalid Meta webhook signature.');
    }

    await this.whatsappService.processWebhookEvent(body);
    return { status: 'EVENT_RECEIVED' };
  }

  /**
   * Check WhatsApp phone number verification, quality rating, and messaging tier
   */
  @Get('status')
  async getStatus() {
    const status = await this.whatsappService.verifyPhoneNumberStatus();
    return {
      success: true,
      data: status,
      configuration: {
        configured: this.config.isConfigured(),
        apiVersion: this.config.apiVersion,
        isDevMockMode: this.config.isDevMockMode,
        phoneNumberIdConfigured: Boolean(this.config.phoneNumberId),
        businessAccountIdConfigured: Boolean(this.config.businessAccountId),
      },
    };
  }

  /**
   * Register a verified phone number using 2-step verification PIN
   */
  @Post('register')
  async registerNumber(@Body() body: { pin: string }) {
    if (!body?.pin) {
      throw new BadRequestException('A 6-digit registration PIN is required.');
    }
    const result = await this.whatsappService.registerPhoneNumber(body.pin);
    return result;
  }

  /**
   * View registered WhatsApp message templates and Meta review statuses
   */
  @Get('templates')
  async getTemplates() {
    const templates = await this.whatsappService.getTemplates();
    return {
      success: true,
      count: templates.length,
      data: templates,
    };
  }

  /**
   * Sync/Submit standard home healthcare utility templates to Meta for review
   */
  @Post('sync-templates')
  async syncTemplates() {
    const syncResult = await this.whatsappService.syncStandardTemplates();
    return {
      success: true,
      message: 'Standard healthcare utility templates submitted for Meta review.',
      ...syncResult,
    };
  }

  /**
   * Instant WhatsApp notification to agency owner on caregiver enquiry form submit.
   * Dispatches agency SLA alert to agency owner and booking acknowledgement to customer.
   */
  @Post('notify-enquiry')
  async notifyEnquiry(@Body() dto: CaregiverEnquiryNotificationDto) {
    const result = await this.whatsappService.notifyAgencyOwnerOnEnquiry(dto);
    return {
      success: true,
      message: 'Instant WhatsApp notification dispatched to agency owner and customer.',
      data: result,
    };
  }

  /**
   * Push/WhatsApp alert to admin for new auto-captured lead (Phase 9, Point 3).
   */
  @Post('admin/lead-alert')
  async alertAdminOnLead(@Body() dto: AdminLeadAlertDto) {
    const result = await this.whatsappService.notifyAdminOnAutoCapturedLead(dto);
    return {
      success: true,
      message: 'Push and WhatsApp alerts dispatched to agency administrators.',
      data: result,
    };
  }

  /**
   * Dispatches post-assignment WhatsApp rating request to customer
   */
  @Post('feedback-request')
  async sendFeedbackRequest(@Body() dto: PostAssignmentRatingRequestDto) {
    const result = await this.whatsappService.sendPostAssignmentRatingRequest(dto);
    return {
      success: true,
      message: 'Post-assignment WhatsApp rating request dispatched to customer.',
      data: result,
    };
  }

  /**
   * Simulate a WhatsApp conversational intake message (for testing & interactive demo)
   */
  @Post('intake/simulate')
  async simulateIntake(
    @Body() body: { phone: string; text: string; tenantId?: string }
  ) {
    if (!body?.phone || body?.text === undefined) {
      throw new BadRequestException('Both phone and text are required to simulate intake message.');
    }
    if (!this.intakeService) {
      throw new BadRequestException('WhatsAppIntakeService is not available.');
    }

    const reply = await this.intakeService.handleInboundMessage(
      body.phone,
      body.text,
      body.tenantId
    );
    const session = await this.intakeService.getSessionByPhone(body.phone);

    return {
      success: true,
      phone: body.phone,
      reply,
      session,
      request: session?.request || null,
    };
  }

  /**
   * List all lead intake sessions
   */
  @Get('intake/sessions')
  async getIntakeSessions(@Query('tenantId') tenantId?: string) {
    if (!this.intakeService) {
      return { success: true, count: 0, data: [] };
    }
    const sessions = await this.intakeService.listSessions(tenantId);
    return {
      success: true,
      count: sessions.length,
      data: sessions,
    };
  }

  /**
   * Convert an intake session to an official CaregiverRequest row
   */
  @Post('intake/sessions/:id/convert-request')
  async convertSessionToRequest(@Param('id') id: string) {
    if (!this.intakeService) {
      throw new BadRequestException('WhatsAppIntakeService is not available.');
    }
    const request = await this.intakeService.createRequestFromSession(id);
    return {
      success: true,
      message: 'Caregiver request row successfully created from WhatsApp intake conversation.',
      data: request,
    };
  }

  /**
   * Get intake session by customer phone number
   */
  @Get('intake/sessions/:phone')
  async getIntakeSessionByPhone(@Param('phone') phone: string) {
    if (!this.intakeService) {
      return { success: false, data: null };
    }
    const session = await this.intakeService.getSessionByPhone(phone);
    return {
      success: true,
      data: session,
    };
  }
}
