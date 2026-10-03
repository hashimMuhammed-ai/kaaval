import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Tenant } from './entities/tenant.entity';
import { TenantStatus } from '../common/enums/tenant-status.enum';
import { SubdomainExtractor } from '../common/utils/subdomain-extractor';

export interface ResolvedTenantInfo {
  id: string;
  name: string;
  subdomain: string;
  customDomain?: string | null;
  status: TenantStatus;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  settings?: Record<string, any>;
  createdAt: Date;
}

@Injectable()
export class TenantResolverService {
  // In-memory cache for fast subdomain lookups (TTL 60 seconds)
  private readonly cache = new Map<
    string,
    { tenant: Tenant | null; expiresAt: number }
  >();
  private readonly CACHE_TTL_MS = 60 * 1000;

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @Optional()
    private readonly configService?: ConfigService
  ) {}

  /**
   * Resolves a tenant from an incoming HTTP request using host, headers, or query parameters.
   */
  async resolveFromRequest(req: any): Promise<Tenant | null> {
    if (!req) {
      return null;
    }

    // 1. Direct header override (useful for API gateway, reverse proxy, or tests)
    const headerSubdomain = req.headers?.['x-tenant-subdomain'];
    if (headerSubdomain && typeof headerSubdomain === 'string') {
      const cleanSub = headerSubdomain.trim().toLowerCase();
      if (SubdomainExtractor.isValidSubdomain(cleanSub)) {
        return this.resolveBySubdomain(cleanSub);
      }
    }

    // 2. Query parameter fallback (e.g., ?subdomain=carekerala)
    if (req.query?.subdomain && typeof req.query.subdomain === 'string') {
      const cleanSub = req.query.subdomain.trim().toLowerCase();
      if (SubdomainExtractor.isValidSubdomain(cleanSub)) {
        return this.resolveBySubdomain(cleanSub);
      }
    }

    // 3. Extract hostname from x-forwarded-host or host header
    const rawHost =
      (req.headers?.['x-forwarded-host'] as string) ||
      (req.headers?.['host'] as string) ||
      '';

    if (!rawHost) {
      return null;
    }

    const appDomain =
      this.configService?.get<string>('APP_DOMAIN') ||
      process.env.APP_DOMAIN ||
      'caregiverplatform.com';

    // 4. Try extracting subdomain
    const extractedSubdomain = SubdomainExtractor.extract(rawHost, appDomain);
    if (extractedSubdomain) {
      const tenant = await this.resolveBySubdomain(extractedSubdomain);
      if (tenant) {
        return tenant;
      }
    }

    // 5. Try resolving as custom domain (e.g., "carekerala-homecare.com")
    let cleanedHost = rawHost.trim().toLowerCase();
    if (cleanedHost.includes(':')) {
      cleanedHost = cleanedHost.split(':')[0];
    }

    return this.resolveByCustomDomain(cleanedHost);
  }

  /**
   * Resolves a tenant by its registered unique subdomain.
   */
  async resolveBySubdomain(subdomain: string): Promise<Tenant | null> {
    if (!subdomain) {
      return null;
    }

    const normalized = subdomain.trim().toLowerCase();
    const cacheKey = `sub:${normalized}`;

    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.tenant;
    }

    const tenant = await this.tenantRepository
      .createQueryBuilder('tenant')
      .where('LOWER(tenant.subdomain) = :subdomain', { subdomain: normalized })
      .getOne();

    this.cache.set(cacheKey, {
      tenant: tenant || null,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    return tenant || null;
  }

  /**
   * Resolves a tenant by its registered custom domain.
   */
  async resolveByCustomDomain(customDomain: string): Promise<Tenant | null> {
    if (!customDomain) {
      return null;
    }

    const normalized = customDomain.trim().toLowerCase();
    const cacheKey = `custom:${normalized}`;

    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.tenant;
    }

    const tenant = await this.tenantRepository
      .createQueryBuilder('tenant')
      .where('LOWER(tenant.custom_domain) = :customDomain', {
        customDomain: normalized,
      })
      .getOne();

    this.cache.set(cacheKey, {
      tenant: tenant || null,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    return tenant || null;
  }

  /**
   * Resolves tenant and validates that it is active. Throws NotFoundException or ForbiddenException.
   */
  async resolveAndValidate(subdomainOrHost: string): Promise<Tenant> {
    let tenant = await this.resolveBySubdomain(subdomainOrHost);

    if (!tenant) {
      tenant = await this.resolveByCustomDomain(subdomainOrHost);
    }

    if (!tenant) {
      throw new NotFoundException(
        `Agency tenant "${subdomainOrHost}" was not found.`
      );
    }

    if (tenant.status === TenantStatus.SUSPENDED) {
      throw new ForbiddenException(
        `Agency account "${tenant.name}" is currently suspended. Please contact platform support.`
      );
    }

    return tenant;
  }

  /**
   * Transforms entity to public-facing tenant representation.
   */
  toPublicTenantInfo(tenant: Tenant): ResolvedTenantInfo {
    return {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      customDomain: tenant.customDomain,
      status: tenant.status,
      phone: tenant.phone,
      email: tenant.email,
      address: tenant.address,
      settings: tenant.settings,
      createdAt: tenant.createdAt,
    };
  }

  /**
   * Clears the in-memory resolution cache (useful after provisioning or updating a tenant).
   */
  clearCache(): void {
    this.cache.clear();
  }
}
