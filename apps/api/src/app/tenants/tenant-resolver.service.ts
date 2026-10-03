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
  tenantSlug: string;
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

    // 1. Path-based tenant resolution (e.g., /t/:tenantSlug or /api/t/:tenantSlug)
    const rawPath = req.originalUrl || req.url || req.path || '';
    const pathMatch = typeof rawPath === 'string' ? rawPath.match(/^\/(?:api\/)?t\/([a-zA-Z0-9_-]+)/i) : null;
    if (pathMatch && pathMatch[1]) {
      const slug = pathMatch[1].trim().toLowerCase();
      if (SubdomainExtractor.isValidSubdomain(slug)) {
        const tenant = await this.resolveBySlug(slug);
        if (tenant) {
          return tenant;
        }
      }
    }

    // 2. Direct header override (x-tenant-slug or x-tenant-subdomain)
    const headerSlug = req.headers?.['x-tenant-slug'] || req.headers?.['x-tenant-subdomain'];
    if (headerSlug && typeof headerSlug === 'string') {
      const cleanSlug = headerSlug.trim().toLowerCase();
      if (SubdomainExtractor.isValidSubdomain(cleanSlug)) {
        const tenant = await this.resolveBySlug(cleanSlug);
        if (tenant) {
          return tenant;
        }
      }
    }

    // 3. Query parameter fallback (tenantSlug, tenant_slug, or subdomain)
    const querySlug = req.query?.tenantSlug || req.query?.tenant_slug || req.query?.subdomain;
    if (querySlug && typeof querySlug === 'string') {
      const cleanSlug = querySlug.trim().toLowerCase();
      if (SubdomainExtractor.isValidSubdomain(cleanSlug)) {
        const tenant = await this.resolveBySlug(cleanSlug);
        if (tenant) {
          return tenant;
        }
      }
    }

    // 4. Extract hostname from x-forwarded-host or host header (subdomain-based resolution)
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

    // 5. Try extracting subdomain from hostname
    const extractedSubdomain = SubdomainExtractor.extract(rawHost, appDomain);
    if (extractedSubdomain) {
      const tenant = await this.resolveBySubdomain(extractedSubdomain);
      if (tenant) {
        return tenant;
      }
    }

    // 6. Try resolving as custom domain (e.g., "carekerala-homecare.com")
    let cleanedHost = rawHost.trim().toLowerCase();
    if (cleanedHost.includes(':')) {
      cleanedHost = cleanedHost.split(':')[0];
    }

    return this.resolveByCustomDomain(cleanedHost);
  }

  /**
   * Resolves a tenant by its unique URL slug (path-based routing /t/:tenantSlug).
   * Checks both tenant_slug and subdomain columns for maximum compatibility.
   */
  async resolveBySlug(slug: string): Promise<Tenant | null> {
    if (!slug) {
      return null;
    }

    const normalized = slug.trim().toLowerCase();
    const cacheKey = `slug:${normalized}`;

    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.tenant;
    }

    const tenant = await this.tenantRepository
      .createQueryBuilder('tenant')
      .where('LOWER(tenant.tenant_slug) = :slug OR LOWER(tenant.subdomain) = :slug', {
        slug: normalized,
      })
      .getOne();

    this.cache.set(cacheKey, {
      tenant: tenant || null,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    return tenant || null;
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
      tenantSlug: tenant.tenantSlug || tenant.subdomain,
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
