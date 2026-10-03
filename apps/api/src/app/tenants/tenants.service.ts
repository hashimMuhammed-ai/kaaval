import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { InviteToken } from '../users/entities/invite-token.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { TenantStatus } from '../common/enums/tenant-status.enum';
import {
  ProvisionTenantDto,
  PaymentMethod,
  ConfirmationChannel,
} from './dto/provision-tenant.dto';
import { ProvisionTenantResponseDto } from './dto/provision-tenant-response.dto';
import { PasswordHasher } from '../common/utils/password-hasher';

@Injectable()
export class TenantsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(InviteToken)
    private readonly inviteTokenRepository: Repository<InviteToken>
  ) {}

  /**
   * Super Admin manual tenant & initial Owner provisioning.
   * Executed atomically within a single database transaction after out-of-band payment confirmation.
   */
  async provisionTenant(
    dto: ProvisionTenantDto,
    superAdminUserId?: string
  ): Promise<ProvisionTenantResponseDto> {
    const normalizedSubdomain = dto.subdomain.trim().toLowerCase();
    const normalizedEmail = dto.owner.email.trim().toLowerCase();

    // 1. Verify subdomain uniqueness (case-insensitive)
    const existingTenant = await this.tenantRepository
      .createQueryBuilder('tenant')
      .where('LOWER(tenant.subdomain) = :subdomain', { subdomain: normalizedSubdomain })
      .getOne();

    if (existingTenant) {
      throw new ConflictException(
        `Subdomain "${normalizedSubdomain}" is already registered. Please choose a different subdomain.`
      );
    }

    // 2. Verify custom domain uniqueness if specified
    if (dto.customDomain) {
      const normalizedCustomDomain = dto.customDomain.trim().toLowerCase();
      const existingCustom = await this.tenantRepository
        .createQueryBuilder('tenant')
        .where('LOWER(tenant.custom_domain) = :customDomain', { customDomain: normalizedCustomDomain })
        .getOne();

      if (existingCustom) {
        throw new ConflictException(
          `Custom domain "${normalizedCustomDomain}" is already in use by another agency.`
        );
      }
    }

    // 3. Verify owner email uniqueness across the system
    const existingUser = await this.userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = :email', { email: normalizedEmail })
      .getOne();

    if (existingUser) {
      throw new ConflictException(
        `A user account with email "${normalizedEmail}" already exists. Owner email must be unique.`
      );
    }

    // 4. Handle Owner password (either provided or securely auto-generated)
    const isGeneratedPassword = !dto.owner.password;
    const plainPassword = dto.owner.password || `Care@${PasswordHasher.generateRandomToken(4)}`;
    const passwordHash = PasswordHasher.hash(plainPassword);

    const confirmedAt = dto.paymentConfirmation.confirmedAt
      ? new Date(dto.paymentConfirmation.confirmedAt)
      : new Date();

    const paymentMethod = dto.paymentConfirmation.paymentMethod || PaymentMethod.GPAY;
    const confirmedVia = dto.paymentConfirmation.confirmedVia || ConfirmationChannel.PHONE_CALL;

    // 5. Execute atomic database transaction
    return await this.dataSource.transaction(async (manager) => {
      // Create Tenant
      const tenantSlug = dto.tenantSlug
        ? dto.tenantSlug.trim().toLowerCase()
        : normalizedSubdomain;

      const tenant = manager.create(Tenant, {
        name: dto.name.trim(),
        subdomain: normalizedSubdomain,
        tenantSlug,
        customDomain: dto.customDomain ? dto.customDomain.trim().toLowerCase() : null,
        status: TenantStatus.ACTIVE,
        phone: dto.phone ? dto.phone.trim() : null,
        email: dto.email ? dto.email.trim().toLowerCase() : null,
        address: dto.address ? dto.address.trim() : null,
        settings: {
          currency: 'INR',
          slaMinutes: 60,
          paymentConfirmation: {
            paymentReference: dto.paymentConfirmation.paymentReference.trim(),
            paymentMethod,
            confirmedVia,
            amount: dto.paymentConfirmation.amount ?? null,
            notes: dto.paymentConfirmation.notes?.trim() || null,
            confirmedAt: confirmedAt.toISOString(),
          },
        },
      });

      const savedTenant = await manager.save(Tenant, tenant);

      // Create primary Owner user
      const ownerUser = manager.create(User, {
        tenantId: savedTenant.id,
        role: UserRole.OWNER,
        name: dto.owner.name.trim(),
        email: normalizedEmail,
        passwordHash,
        phone: dto.owner.phone ? dto.owner.phone.trim() : null,
        isActive: true,
      });

      const savedOwner = await manager.save(User, ownerUser);

      // Generate 48-hour single-use onboarding invite token
      const inviteTokenString = PasswordHasher.generateRandomToken(32);
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

      const inviteToken = manager.create(InviteToken, {
        inviteToken: inviteTokenString,
        tenantId: savedTenant.id,
        role: UserRole.OWNER,
        email: normalizedEmail,
        invitedBy: superAdminUserId || null,
        expiresAt,
      });

      await manager.save(InviteToken, inviteToken);

      // Construct onboarding and WhatsApp delivery message
      const appDomain = process.env.APP_DOMAIN || 'caregiverplatform.com';
      const baseUrl = `https://${savedTenant.subdomain}.${appDomain}`;
      const onboardingUrl = `${baseUrl}/onboarding?token=${inviteTokenString}`;
      const loginUrl = `${baseUrl}/login`;

      const whatsappOnboardingMessage = [
        `*Caregiver Agency Platform — Account Provisioned*`,
        ``,
        `Hello ${savedOwner.name},`,
        `Your agency account for *${savedTenant.name}* has been activated!`,
        ``,
        `Agency Portal: ${loginUrl}`,
        `Login Email: ${savedOwner.email}`,
        isGeneratedPassword ? `Temporary Password: ${plainPassword}` : null,
        `Activation Link (valid 48 hrs): ${onboardingUrl}`,
        ``,
        `Please log in or click the activation link to complete your agency setup.`,
      ]
        .filter(Boolean)
        .join('\n');

      return {
        success: true,
        message: `Tenant "${savedTenant.name}" and Owner account successfully provisioned.`,
        tenant: {
          id: savedTenant.id,
          name: savedTenant.name,
          subdomain: savedTenant.subdomain,
          tenantSlug: savedTenant.tenantSlug || savedTenant.subdomain,
          customDomain: savedTenant.customDomain,
          status: savedTenant.status,
          phone: savedTenant.phone,
          email: savedTenant.email,
          createdAt: savedTenant.createdAt,
        },
        owner: {
          id: savedOwner.id,
          name: savedOwner.name,
          email: savedOwner.email,
          role: savedOwner.role,
          phone: savedOwner.phone,
          isActive: savedOwner.isActive,
        },
        credentials: {
          temporaryPassword: isGeneratedPassword ? plainPassword : undefined,
          inviteToken: inviteTokenString,
          inviteExpiresAt: expiresAt,
          onboardingUrl,
          whatsappOnboardingMessage,
        },
        paymentConfirmation: {
          paymentReference: dto.paymentConfirmation.paymentReference.trim(),
          paymentMethod,
          confirmedVia,
          amount: dto.paymentConfirmation.amount,
          notes: dto.paymentConfirmation.notes?.trim(),
          confirmedAt,
        },
      };
    });
  }

  /**
   * List all tenants for Super Admin oversight.
   */
  async findAllTenants(): Promise<Tenant[]> {
    return this.tenantRepository.find({
      relations: ['users'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get single tenant details with users.
   */
  async getTenantById(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { id },
      relations: ['users', 'inviteTokens'],
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID "${id}" not found.`);
    }

    return tenant;
  }
}
