import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DEFAULT_WHATSAPP_API_VERSION, WHATSAPP_API_BASE_URL } from './whatsapp.constants';

@Injectable()
export class WhatsAppConfigService {
  private readonly logger = new Logger(WhatsAppConfigService.name);

  constructor(private readonly configService: ConfigService) {}

  get apiVersion(): string {
    return this.configService.get<string>('WHATSAPP_API_VERSION') || DEFAULT_WHATSAPP_API_VERSION;
  }

  get apiBaseUrl(): string {
    return `${WHATSAPP_API_BASE_URL}/${this.apiVersion}`;
  }

  get apiToken(): string {
    return (
      this.configService.get<string>('WHATSAPP_ACCESS_TOKEN') ||
      this.configService.get<string>('WHATSAPP_API_TOKEN') ||
      ''
    );
  }

  get isTestMode(): boolean {
    const testMode = this.configService.get<string>('WHATSAPP_TEST_MODE');
    if (testMode === 'true' || testMode === '1') return true;
    return false;
  }

  get phoneNumberId(): string {
    return this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID') || '';
  }

  get businessAccountId(): string {
    return this.configService.get<string>('WHATSAPP_BUSINESS_ACCOUNT_ID') || '';
  }

  get webhookVerifyToken(): string {
    return this.configService.get<string>('WHATSAPP_WEBHOOK_VERIFY_TOKEN') || 'caregiver-whatsapp-verify-token';
  }

  get appSecret(): string {
    return this.configService.get<string>('WHATSAPP_APP_SECRET') || '';
  }

  get defaultOriginPhone(): string {
    return this.configService.get<string>('WHATSAPP_DEFAULT_ORIGIN_PHONE') || '+919876543210';
  }

  get isDevMockMode(): boolean {
    const mock = this.configService.get<string>('WHATSAPP_DEV_MOCK_MODE');
    if (mock === 'true' || mock === '1') return true;
    // Auto mock if credentials are placeholder or empty
    return !this.apiToken || this.apiToken.includes('your-meta');
  }

  isConfigured(): boolean {
    return (
      Boolean(this.apiToken) &&
      Boolean(this.phoneNumberId) &&
      !this.apiToken.includes('your-meta')
    );
  }
}
