import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { CaregiverRequest } from './entities/request.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { CreateCaregiverRequestDto } from './dto/create-request.dto';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto';
import { QueryRequestsDto } from './dto/query-requests.dto';
import { RequestStatus } from '../common/enums/request-status.enum';

export interface RequestsListResult {
  items: CaregiverRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: {
    total: number;
    pending: number;
    contacted: number;
    matched: number;
    assigned: number;
    completed: number;
  };
}

@Injectable()
export class RequestsService {
  private readonly logger = new Logger(RequestsService.name);

  constructor(
    @InjectRepository(CaregiverRequest)
    private readonly requestRepository: Repository<CaregiverRequest>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @Optional()
    private readonly whatsappService?: WhatsAppService
  ) {}

  /**
   * Create a new caregiver request row in the database.
   * Dispatches instant WhatsApp SLA alert to agency owner.
   */
  async createRequest(
    dto: CreateCaregiverRequestDto,
    authTenantId?: string
  ): Promise<{ request: CaregiverRequest; whatsappNotification: any }> {
    // 1. Resolve tenant ID
    let resolvedTenantId = authTenantId || dto.tenantId;
    let resolvedAgencyName = dto.agencyName;

    if (!resolvedTenantId && dto.subdomain) {
      const tenant = await this.tenantRepository.findOne({
        where: { subdomain: dto.subdomain.trim().toLowerCase() },
      });
      if (tenant) {
        resolvedTenantId = tenant.id;
        resolvedAgencyName = resolvedAgencyName || tenant.name;
      }
    }

    // Fallback: If no tenant specified, resolve to primary active agency
    if (!resolvedTenantId) {
      const defaultTenant = await this.tenantRepository.findOne({
        order: { createdAt: 'ASC' },
      });
      if (defaultTenant) {
        resolvedTenantId = defaultTenant.id;
        resolvedAgencyName = resolvedAgencyName || defaultTenant.name;
      }
    }

    if (!resolvedTenantId) {
      throw new BadRequestException(
        'Unable to resolve agency tenant for this request. Please specify tenantId or subdomain.'
      );
    }

    // 2. Reference ID Generation
    const referenceId =
      dto.referenceId ||
      `REQ-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    // 3. Create & Save CaregiverRequest row
    const entity = this.requestRepository.create({
      tenantId: resolvedTenantId,
      referenceId,
      serviceType: dto.serviceType,
      duration: dto.duration,
      engagementPeriod: dto.engagementPeriod || 'ongoing',
      genderPreference: dto.genderPreference || 'any',
      startDate: dto.startDate,
      district: dto.district,
      locality: dto.locality || null,
      address: dto.address || null,
      pincode: dto.pincode || null,
      patientName: dto.patientName,
      patientAge: dto.patientAge || null,
      patientGender: dto.patientGender || 'unspecified',
      patientCondition: dto.patientCondition || null,
      mobilityStatus: dto.mobilityStatus || 'assisted',
      medicalEquipment: dto.medicalEquipment || 'none',
      contactName: dto.contactName,
      relationship: dto.relationship || 'son_daughter',
      phone: dto.phone,
      isWhatsapp: dto.isWhatsapp !== undefined ? dto.isWhatsapp : true,
      notes: dto.notes || null,
      status: RequestStatus.PENDING,
      source: dto.source || 'public_form',
    });

    const savedRequest = await this.requestRepository.save(entity);
    this.logger.log(
      `Created requests row: ID=${savedRequest.id}, Ref=${savedRequest.referenceId}, Tenant=${resolvedTenantId}`
    );

    // 4. Trigger Instant WhatsApp Notification to Agency Owner & Customer
    let whatsappNotification: any = null;
    if (this.whatsappService) {
      try {
        whatsappNotification = await this.whatsappService.notifyAgencyOwnerOnEnquiry({
          referenceId: savedRequest.referenceId,
          requestId: savedRequest.id,
          patientName: savedRequest.patientName,
          serviceType: savedRequest.serviceType,
          duration: savedRequest.duration,
          contactName: savedRequest.contactName,
          phone: savedRequest.phone,
          district: savedRequest.district,
          locality: savedRequest.locality || undefined,
          agencyName: resolvedAgencyName || 'CareKerala Healthcare',
          tenantId: resolvedTenantId,
          subdomain: dto.subdomain,
          patientAge: savedRequest.patientAge ? String(savedRequest.patientAge) : undefined,
          patientCondition: savedRequest.patientCondition || undefined,
          notes: savedRequest.notes || undefined,
          source: savedRequest.source || dto.source,
          isAutoCaptured: savedRequest.source === 'whatsapp' || dto.source === 'whatsapp',
          genderPreference: savedRequest.genderPreference,
          startDate: savedRequest.startDate,
        });
      } catch (err: any) {
        this.logger.warn(`WhatsApp dispatch warning for ${savedRequest.referenceId}: ${err.message}`);
        whatsappNotification = {
          success: false,
          error: err.message,
        };
      }
    }

    return {
      request: savedRequest,
      whatsappNotification,
    };
  }

  /**
   * List all caregiver requests for an agency dashboard with status filtering & stats.
   */
  async findAll(tenantId: string, query: QueryRequestsDto = {}): Promise<RequestsListResult> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const qb = this.requestRepository.createQueryBuilder('req')
      .where('req.tenant_id = :tenantId', { tenantId })
      .leftJoinAndSelect('req.assignedCaregiver', 'caregiver')
      .leftJoinAndSelect('req.customer', 'customer');

    if (query.status) {
      qb.andWhere('req.status = :status', { status: query.status });
    }

    if (query.district) {
      qb.andWhere('req.district ILIKE :district', { district: `%${query.district}%` });
    }

    if (query.q) {
      qb.andWhere(
        '(req.patient_name ILIKE :q OR req.contact_name ILIKE :q OR req.phone ILIKE :q OR req.reference_id ILIKE :q)',
        { q: `%${query.q.trim()}%` }
      );
    }

    qb.orderBy('req.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    // Compute status stats for dashboard tabs
    const statsRaw = await this.requestRepository
      .createQueryBuilder('req')
      .select('req.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('req.tenant_id = :tenantId', { tenantId })
      .groupBy('req.status')
      .getRawMany();

    const stats = {
      total: 0,
      pending: 0,
      contacted: 0,
      matched: 0,
      assigned: 0,
      completed: 0,
    };

    for (const row of statsRaw) {
      const cnt = parseInt(row.count, 10) || 0;
      stats.total += cnt;
      if (row.status === RequestStatus.PENDING) stats.pending = cnt;
      if (row.status === RequestStatus.CONTACTED) stats.contacted = cnt;
      if (row.status === RequestStatus.MATCHED) stats.matched = cnt;
      if (row.status === RequestStatus.ASSIGNED) stats.assigned = cnt;
      if (row.status === RequestStatus.COMPLETED) stats.completed = cnt;
    }

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      stats,
    };
  }

  /**
   * Find single request details.
   */
  async findOne(id: string, tenantId: string): Promise<CaregiverRequest> {
    const request = await this.requestRepository.findOne({
      where: { id, tenantId },
      relations: ['assignedCaregiver', 'customer'],
    });

    if (!request) {
      throw new NotFoundException(`Caregiver request with ID ${id} not found.`);
    }

    return request;
  }

  /**
   * Update request status (e.g. pending -> contacted, matched, assigned).
   */
  async updateStatus(
    id: string,
    tenantId: string,
    dto: UpdateRequestStatusDto
  ): Promise<CaregiverRequest> {
    const request = await this.findOne(id, tenantId);

    request.status = dto.status;
    if (dto.assignedCaregiverId !== undefined) {
      request.assignedCaregiverId = dto.assignedCaregiverId || null;
    }
    if (dto.notes) {
      request.notes = request.notes ? `${request.notes}\n[Update]: ${dto.notes}` : dto.notes;
    }

    return this.requestRepository.save(request);
  }
}
