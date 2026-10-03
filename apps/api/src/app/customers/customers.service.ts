import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CaregiverRequest } from '../requests/entities/request.entity';
import { Caregiver } from '../caregivers/entities/caregiver.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { ConvertRequestToCustomerDto } from './dto/convert-request.dto';
import { CustomerStatus } from '../common/enums/customer-status.enum';
import { RequestStatus } from '../common/enums/request-status.enum';
import { UserRole } from '../common/enums/user-role.enum';

export interface CustomersListResult {
  items: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: {
    total: number;
    active: number;
    pending: number;
    paused: number;
    inactive: number;
    discharged: number;
  };
}

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(CaregiverRequest)
    private readonly requestRepository: Repository<CaregiverRequest>,
    @InjectRepository(Caregiver)
    private readonly caregiverRepository: Repository<Caregiver>
  ) {}

  /**
   * Helper to generate unique Customer Reference ID (e.g. CUST-2026-123456)
   */
  private generateReferenceId(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(100000 + Math.random() * 900000);
    return `CUST-${year}-${random}`;
  }

  /**
   * Create a new Customer record linked optionally to an intake request.
   */
  async create(dto: CreateCustomerDto, tenantId: string): Promise<Customer> {
    if (!tenantId) {
      throw new BadRequestException('tenantId is required to create a customer.');
    }

    const referenceId = dto.referenceId || this.generateReferenceId();

    // If linked to an intake request, verify request exists in tenant
    let linkedRequest: CaregiverRequest | null = null;
    if (dto.requestId) {
      linkedRequest = await this.requestRepository.findOne({
        where: { id: dto.requestId, tenantId },
      });
      if (!linkedRequest) {
        throw new NotFoundException(`Intake request with ID ${dto.requestId} not found.`);
      }
    }

    // Verify assigned caregiver exists in tenant if provided
    if (dto.assignedCaregiverId) {
      const caregiver = await this.caregiverRepository.findOne({
        where: { id: dto.assignedCaregiverId, tenantId },
      });
      if (!caregiver) {
        throw new NotFoundException(
          `Caregiver with ID ${dto.assignedCaregiverId} not found in this agency.`
        );
      }
    }

    const customerEntity = this.customerRepository.create({
      tenantId,
      requestId: dto.requestId || null,
      referenceId,
      patientName: dto.patientName,
      patientAge: dto.patientAge || null,
      patientGender: dto.patientGender || 'unspecified',
      patientCondition: dto.patientCondition || null,
      mobilityStatus: dto.mobilityStatus || 'assisted',
      medicalEquipment: dto.medicalEquipment || 'none',
      primaryContactName: dto.primaryContactName,
      relationship: dto.relationship || 'son_daughter',
      phone: dto.phone,
      alternatePhone: dto.alternatePhone || null,
      email: dto.email || null,
      isWhatsapp: dto.isWhatsapp !== undefined ? dto.isWhatsapp : true,
      address: dto.address || null,
      locality: dto.locality || null,
      district: dto.district,
      pincode: dto.pincode || null,
      serviceType: dto.serviceType,
      duration: dto.duration,
      engagementPeriod: dto.engagementPeriod || 'ongoing',
      genderPreference: dto.genderPreference || 'any',
      startDate: dto.startDate,
      status: dto.status || CustomerStatus.PENDING,
      assignedCaregiverId: dto.assignedCaregiverId || null,
      notes: dto.notes || null,
    });

    const savedCustomer = await this.customerRepository.save(customerEntity);

    // Bidirectional link: Update request.customer_id
    if (linkedRequest) {
      linkedRequest.customerId = savedCustomer.id;
      if (savedCustomer.assignedCaregiverId) {
        linkedRequest.assignedCaregiverId = savedCustomer.assignedCaregiverId;
        linkedRequest.status = RequestStatus.ASSIGNED;
      }
      await this.requestRepository.save(linkedRequest);
    }

    this.logger.log(
      `Created customer: ID=${savedCustomer.id}, Ref=${savedCustomer.referenceId}, Tenant=${tenantId}`
    );

    return this.findOne(savedCustomer.id, tenantId);
  }

  /**
   * Convert an intake request into a CRM Customer with automatic data linkage.
   */
  async createFromRequest(
    requestId: string,
    tenantId: string,
    dto: ConvertRequestToCustomerDto = {}
  ): Promise<Customer> {
    const request = await this.requestRepository.findOne({
      where: { id: requestId, tenantId },
    });

    if (!request) {
      throw new NotFoundException(`Intake request with ID ${requestId} not found.`);
    }

    // Check if customer already exists for this request
    const existing = await this.customerRepository.findOne({
      where: { requestId, tenantId },
    });
    if (existing) {
      return this.findOne(existing.id, tenantId);
    }

    const assignedCaregiverId = dto.assignedCaregiverId || request.assignedCaregiverId || null;

    if (assignedCaregiverId) {
      const caregiver = await this.caregiverRepository.findOne({
        where: { id: assignedCaregiverId, tenantId },
      });
      if (!caregiver) {
        throw new NotFoundException(`Caregiver with ID ${assignedCaregiverId} not found.`);
      }
    }

    const referenceId = this.generateReferenceId();

    const customerEntity = this.customerRepository.create({
      tenantId,
      requestId: request.id,
      referenceId,
      patientName: request.patientName,
      patientAge: request.patientAge || null,
      patientGender: request.patientGender || 'unspecified',
      patientCondition: request.patientCondition || null,
      mobilityStatus: request.mobilityStatus || 'assisted',
      medicalEquipment: request.medicalEquipment || 'none',
      primaryContactName: request.contactName,
      relationship: request.relationship || 'son_daughter',
      phone: request.phone,
      alternatePhone: null,
      email: null,
      isWhatsapp: request.isWhatsapp,
      address: request.address || null,
      locality: request.locality || null,
      district: request.district,
      pincode: request.pincode || null,
      serviceType: request.serviceType,
      duration: request.duration,
      engagementPeriod: request.engagementPeriod || 'ongoing',
      genderPreference: request.genderPreference || 'any',
      startDate: request.startDate,
      status: dto.status || CustomerStatus.ACTIVE,
      assignedCaregiverId,
      notes: dto.notes ? `${request.notes || ''}\n${dto.notes}`.trim() : request.notes || null,
    });

    const savedCustomer = await this.customerRepository.save(customerEntity);

    // Bidirectional link: update the request row
    request.customerId = savedCustomer.id;
    if (assignedCaregiverId) {
      request.assignedCaregiverId = assignedCaregiverId;
      request.status = RequestStatus.ASSIGNED;
    } else {
      request.status = RequestStatus.MATCHED;
    }
    await this.requestRepository.save(request);

    this.logger.log(
      `Converted request ${request.referenceId} -> customer ${savedCustomer.referenceId}`
    );

    return this.findOne(savedCustomer.id, tenantId);
  }

  /**
   * Find all customers with status filtering (Active / Pending), search, pagination, and stats.
   */
  async findAll(
    tenantId: string,
    query: QueryCustomersDto = {},
    userRole?: string,
    userId?: string
  ): Promise<CustomersListResult> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const qb = this.customerRepository
      .createQueryBuilder('cust')
      .where('cust.tenant_id = :tenantId', { tenantId })
      .leftJoinAndSelect('cust.request', 'req')
      .leftJoinAndSelect('cust.assignedCaregiver', 'caregiver');

    // Caregiver role restriction: can ONLY see customers they are assigned to
    if (userRole === UserRole.CAREGIVER && userId) {
      const caregiver = await this.caregiverRepository.findOne({
        where: { userId, tenantId },
      });
      if (!caregiver) {
        return {
          items: [],
          total: 0,
          page,
          limit,
          totalPages: 1,
          stats: { total: 0, active: 0, pending: 0, paused: 0, inactive: 0, discharged: 0 },
        };
      }
      qb.andWhere('cust.assigned_caregiver_id = :cgId', { cgId: caregiver.id });
    }

    if (query.status) {
      qb.andWhere('cust.status = :status', { status: query.status });
    }

    if (query.district) {
      qb.andWhere('cust.district ILIKE :district', { district: `%${query.district}%` });
    }

    if (query.assignedCaregiverId) {
      qb.andWhere('cust.assigned_caregiver_id = :cgId', { cgId: query.assignedCaregiverId });
    }

    if (query.q) {
      qb.andWhere(
        '(cust.patient_name ILIKE :q OR cust.primary_contact_name ILIKE :q OR cust.phone ILIKE :q OR cust.reference_id ILIKE :q)',
        { q: `%${query.q.trim()}%` }
      );
    }

    qb.orderBy('cust.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    // Compute stats for CRM dashboard tabs (Active / Pending / etc.)
    const statsRaw = await this.customerRepository
      .createQueryBuilder('cust')
      .select('cust.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('cust.tenant_id = :tenantId', { tenantId })
      .groupBy('cust.status')
      .getRawMany();

    const stats = {
      total: 0,
      active: 0,
      pending: 0,
      paused: 0,
      inactive: 0,
      discharged: 0,
    };

    for (const row of statsRaw) {
      const cnt = parseInt(row.count, 10) || 0;
      stats.total += cnt;
      if (row.status === CustomerStatus.ACTIVE) stats.active = cnt;
      if (row.status === CustomerStatus.PENDING) stats.pending = cnt;
      if (row.status === CustomerStatus.PAUSED) stats.paused = cnt;
      if (row.status === CustomerStatus.INACTIVE) stats.inactive = cnt;
      if (row.status === CustomerStatus.DISCHARGED) stats.discharged = cnt;
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
   * Find single customer detail with patient info, requirement, assigned caregiver, and status.
   */
  async findOne(
    id: string,
    tenantId: string,
    userRole?: string,
    userId?: string
  ): Promise<Customer> {
    const customer = await this.customerRepository.findOne({
      where: { id, tenantId },
      relations: [
        'request',
        'assignedCaregiver',
        'assignments',
        'assignments.caregiver',
        'assignments.replacedBy',
        'assignments.replacedBy.caregiver',
      ],
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found.`);
    }

    // Role check: caregiver can only view assigned customer
    if (userRole === UserRole.CAREGIVER && userId) {
      const caregiver = await this.caregiverRepository.findOne({
        where: { userId, tenantId },
      });
      if (!caregiver || customer.assignedCaregiverId !== caregiver.id) {
        throw new ForbiddenException(
          'Caregiver is not permitted to view unassigned customer records.'
        );
      }
    }

    return customer;
  }

  /**
   * Update customer record.
   */
  async update(id: string, tenantId: string, dto: UpdateCustomerDto): Promise<Customer> {
    const customer = await this.findOne(id, tenantId);

    if (dto.assignedCaregiverId !== undefined) {
      if (dto.assignedCaregiverId) {
        const caregiver = await this.caregiverRepository.findOne({
          where: { id: dto.assignedCaregiverId, tenantId },
        });
        if (!caregiver) {
          throw new NotFoundException(
            `Caregiver with ID ${dto.assignedCaregiverId} not found in this agency.`
          );
        }
      }
      customer.assignedCaregiverId = dto.assignedCaregiverId || null;
    }

    if (dto.requestId !== undefined) {
      customer.requestId = dto.requestId || null;
    }

    Object.assign(customer, {
      ...(dto.patientName && { patientName: dto.patientName }),
      ...(dto.patientAge !== undefined && { patientAge: dto.patientAge }),
      ...(dto.patientGender && { patientGender: dto.patientGender }),
      ...(dto.patientCondition !== undefined && { patientCondition: dto.patientCondition }),
      ...(dto.mobilityStatus && { mobilityStatus: dto.mobilityStatus }),
      ...(dto.medicalEquipment && { medicalEquipment: dto.medicalEquipment }),
      ...(dto.primaryContactName && { primaryContactName: dto.primaryContactName }),
      ...(dto.relationship && { relationship: dto.relationship }),
      ...(dto.phone && { phone: dto.phone }),
      ...(dto.alternatePhone !== undefined && { alternatePhone: dto.alternatePhone }),
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.isWhatsapp !== undefined && { isWhatsapp: dto.isWhatsapp }),
      ...(dto.address !== undefined && { address: dto.address }),
      ...(dto.locality !== undefined && { locality: dto.locality }),
      ...(dto.district && { district: dto.district }),
      ...(dto.pincode !== undefined && { pincode: dto.pincode }),
      ...(dto.serviceType && { serviceType: dto.serviceType }),
      ...(dto.duration && { duration: dto.duration }),
      ...(dto.engagementPeriod && { engagementPeriod: dto.engagementPeriod }),
      ...(dto.genderPreference && { genderPreference: dto.genderPreference }),
      ...(dto.startDate && { startDate: dto.startDate }),
      ...(dto.status && { status: dto.status }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
    });

    const updatedCustomer = await this.customerRepository.save(customer);

    // Sync assigned caregiver to request if linked
    if (customer.requestId && dto.assignedCaregiverId !== undefined) {
      const request = await this.requestRepository.findOne({
        where: { id: customer.requestId, tenantId },
      });
      if (request) {
        request.assignedCaregiverId = customer.assignedCaregiverId;
        if (customer.assignedCaregiverId) {
          request.status = RequestStatus.ASSIGNED;
        }
        await this.requestRepository.save(request);
      }
    }

    return this.findOne(updatedCustomer.id, tenantId);
  }

  /**
   * Delete customer.
   */
  async remove(id: string, tenantId: string): Promise<void> {
    const customer = await this.findOne(id, tenantId);
    await this.customerRepository.remove(customer);
  }
}
