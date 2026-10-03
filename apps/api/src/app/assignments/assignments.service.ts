import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assignment } from './entities/assignment.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Caregiver } from '../caregivers/entities/caregiver.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { QueryAssignmentsDto } from './dto/query-assignments.dto';
import { ReplaceAssignmentDto } from './dto/replace-assignment.dto';
import { RequestReplacementDto } from './dto/request-replacement.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { AssignmentStatus } from '../common/enums/assignment-status.enum';
import { CustomerStatus } from '../common/enums/customer-status.enum';
import { CaregiverStatus } from '../common/enums/caregiver-status.enum';
import { UserRole } from '../common/enums/user-role.enum';

export interface AssignmentsListResult {
  items: Assignment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class AssignmentsService {
  private readonly logger = new Logger(AssignmentsService.name);

  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Caregiver)
    private readonly caregiverRepository: Repository<Caregiver>,
    @Optional()
    @InjectRepository(Tenant)
    private readonly tenantRepository?: Repository<Tenant>,
    @Optional()
    private readonly whatsappService?: WhatsAppService,
    @Optional()
    private readonly notificationsService?: NotificationsService
  ) {}

  /**
   * Create an assignment linking a caregiver to a customer within the agency.
   */
  async create(dto: CreateAssignmentDto, tenantId: string): Promise<Assignment> {
    if (!tenantId) {
      throw new BadRequestException('tenantId is required to create an assignment.');
    }

    const customer = await this.customerRepository.findOne({
      where: { id: dto.customerId, tenantId },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${dto.customerId} not found in this agency.`);
    }

    const caregiver = await this.caregiverRepository.findOne({
      where: { id: dto.caregiverId, tenantId },
    });
    if (!caregiver) {
      throw new NotFoundException(`Caregiver with ID ${dto.caregiverId} not found in this agency.`);
    }

    const caregiverDailyRate =
      dto.caregiverDailyRate !== undefined ? dto.caregiverDailyRate : caregiver.dailyRate || 0;

    const assignment = this.assignmentRepository.create({
      tenantId,
      customerId: dto.customerId,
      caregiverId: dto.caregiverId,
      startDate: dto.startDate,
      endDate: dto.endDate || null,
      status: AssignmentStatus.ACTIVE,
      billingRate: dto.billingRate || 0,
      caregiverDailyRate,
      notes: dto.notes || null,
    });

    const saved = await this.assignmentRepository.save(assignment);

    // Sync Customer status and assignedCaregiverId
    customer.assignedCaregiverId = caregiver.id;
    if (customer.status === CustomerStatus.PENDING) {
      customer.status = CustomerStatus.ACTIVE;
    }
    await this.customerRepository.save(customer);

    // Update Caregiver status to ASSIGNED
    caregiver.status = CaregiverStatus.ASSIGNED;
    await this.caregiverRepository.save(caregiver);

    this.logger.log(
      `Created assignment ${saved.id}: Caregiver ${caregiver.fullName} -> Customer ${customer.patientName}`
    );

    return this.findOne(saved.id, tenantId);
  }

  /**
   * List assignments with filtering and role-based isolation.
   */
  async findAll(
    tenantId: string,
    query: QueryAssignmentsDto = {},
    userRole?: string,
    userId?: string
  ): Promise<AssignmentsListResult> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const qb = this.assignmentRepository
      .createQueryBuilder('asgn')
      .where('asgn.tenant_id = :tenantId', { tenantId })
      .leftJoinAndSelect('asgn.customer', 'customer')
      .leftJoinAndSelect('asgn.caregiver', 'caregiver')
      .leftJoinAndSelect('asgn.replacedBy', 'replacedBy')
      .leftJoinAndSelect('replacedBy.caregiver', 'replacementCaregiver')
      .leftJoinAndSelect('asgn.replacedAssignments', 'replacedAssignments')
      .leftJoinAndSelect('replacedAssignments.caregiver', 'previousCaregiver');

    // Caregiver role restriction: can ONLY see assignments assigned to them
    if (userRole === UserRole.CAREGIVER && userId) {
      const caregiver = await this.caregiverRepository.findOne({
        where: { userId, tenantId },
      });
      if (!caregiver) {
        return { items: [], total: 0, page, limit, totalPages: 1 };
      }
      qb.andWhere('asgn.caregiver_id = :cgId', { cgId: caregiver.id });
    }

    if (query.status) {
      qb.andWhere('asgn.status = :status', { status: query.status });
    }

    if (query.absenceReason) {
      qb.andWhere('asgn.absence_reason = :absenceReason', {
        absenceReason: query.absenceReason,
      });
    }

    if (query.caregiverId) {
      qb.andWhere('asgn.caregiver_id = :caregiverId', { caregiverId: query.caregiverId });
    }

    if (query.customerId) {
      qb.andWhere('asgn.customer_id = :customerId', { customerId: query.customerId });
    }

    qb.orderBy('asgn.start_date', 'DESC')
      .addOrderBy('asgn.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get single assignment detail with security checks.
   */
  async findOne(
    id: string,
    tenantId: string,
    userRole?: string,
    userId?: string
  ): Promise<Assignment> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id, tenantId },
      relations: [
        'customer',
        'caregiver',
        'replacedBy',
        'replacedBy.caregiver',
        'replacedAssignments',
        'replacedAssignments.caregiver',
      ],
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment with ID ${id} not found.`);
    }

    // Role check for caregiver
    if (userRole === UserRole.CAREGIVER && userId) {
      const caregiver = await this.caregiverRepository.findOne({
        where: { userId, tenantId },
      });
      if (!caregiver || assignment.caregiverId !== caregiver.id) {
        throw new ForbiddenException(
          'Caregiver is not permitted to view this assignment.'
        );
      }
    }

    return assignment;
  }

  /**
   * Find current active assignment for a caregiver.
   */
  async findActiveForCaregiver(tenantId: string, userId: string): Promise<Assignment | null> {
    const caregiver = await this.caregiverRepository.findOne({
      where: { userId, tenantId },
    });
    if (!caregiver) {
      return null;
    }

    return this.assignmentRepository.findOne({
      where: {
        tenantId,
        caregiverId: caregiver.id,
        status: AssignmentStatus.ACTIVE,
      },
      relations: ['customer', 'caregiver'],
      order: { startDate: 'DESC' },
    });
  }

  /**
   * Update assignment details (e.g. status, dates, rates, replacement info).
   */
  async update(id: string, tenantId: string, dto: UpdateAssignmentDto): Promise<Assignment> {
    const assignment = await this.findOne(id, tenantId);

    if (dto.status !== undefined) {
      const isTransitioningToCompleted =
        dto.status === AssignmentStatus.COMPLETED &&
        assignment.status !== AssignmentStatus.COMPLETED;

      assignment.status = dto.status;
      // If completed or cancelled, check if caregiver has other active assignments
      if (
        dto.status === AssignmentStatus.COMPLETED ||
        dto.status === AssignmentStatus.CANCELLED
      ) {
        const remainingActive = await this.assignmentRepository.count({
          where: {
            tenantId,
            caregiverId: assignment.caregiverId,
            status: AssignmentStatus.ACTIVE,
          },
        });
        if (remainingActive <= 1) {
          await this.caregiverRepository.update(
            { id: assignment.caregiverId, tenantId },
            { status: CaregiverStatus.AVAILABLE }
          );
        }
      }

      // Phase 8 Point 1: Auto-dispatch post-assignment WhatsApp rating request upon completion
      if (isTransitioningToCompleted && !assignment.feedbackRequestedAt && this.whatsappService) {
        try {
          await this.sendFeedbackRequest(assignment.id, tenantId);
        } catch (err: any) {
          this.logger.error(
            `Failed to auto-send feedback request for completed assignment ${assignment.id}: ${err.message}`,
            err.stack
          );
        }
      }

      // Phase 8 Point 3: Update caregiver's jobs completed count when status changes
      try {
        await this.updateCaregiverJobsCount(assignment.caregiverId, tenantId);
      } catch (err: any) {
        this.logger.error(
          `Failed to update caregiver jobs completed count: ${err.message}`,
          err.stack
        );
      }
    }

    if (dto.endDate !== undefined) {
      assignment.endDate = dto.endDate || null;
    }

    if (dto.billingRate !== undefined) {
      assignment.billingRate = dto.billingRate;
    }

    if (dto.caregiverDailyRate !== undefined) {
      assignment.caregiverDailyRate = dto.caregiverDailyRate;
    }

    if (dto.replacedById !== undefined) {
      assignment.replacedById = dto.replacedById || null;
    }

    if (dto.replacementReason !== undefined) {
      assignment.replacementReason = dto.replacementReason || null;
    }

    if (dto.notes !== undefined) {
      assignment.notes = dto.notes || null;
    }

    await this.assignmentRepository.save(assignment);
    return this.findOne(id, tenantId);
  }

  /**
   * Dispatches post-assignment-completion WhatsApp rating request to the customer.
   * Can be triggered automatically upon assignment completion, or manually by staff.
   */
  async sendFeedbackRequest(assignmentId: string, tenantId: string) {
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId, tenantId },
      relations: ['customer', 'caregiver'],
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment with ID ${assignmentId} not found.`);
    }

    if (!assignment.customer) {
      throw new BadRequestException('Assignment does not have an associated customer.');
    }

    if (!assignment.caregiver) {
      throw new BadRequestException('Assignment does not have an associated caregiver.');
    }

    if (!assignment.customer.phone) {
      throw new BadRequestException('Customer does not have a registered contact phone.');
    }

    if (!this.whatsappService) {
      this.logger.warn('WhatsAppService not available for feedback request.');
      return {
        success: false,
        assignmentId,
        recipient: assignment.customer.phone,
        mode: 'mock' as const,
        error: 'WhatsAppService not available',
      };
    }

    let agencyName: string | undefined;
    let subdomain: string | undefined;

    if (this.tenantRepository) {
      try {
        const tenant = await this.tenantRepository.findOne({
          where: { id: tenantId },
        });
        if (tenant) {
          agencyName = tenant.name;
          subdomain = tenant.subdomain;
        }
      } catch (err: any) {
        this.logger.warn(`Could not resolve tenant for feedback request: ${err.message}`);
      }
    }

    const contactName =
      assignment.customer.primaryContactName || assignment.customer.patientName;

    const result = await this.whatsappService.sendPostAssignmentRatingRequest({
      assignmentId: assignment.id,
      customerPhone: assignment.customer.phone,
      contactName,
      patientName: assignment.customer.patientName,
      caregiverName: assignment.caregiver.fullName,
      agencyName,
      tenantId,
      subdomain,
    });

    assignment.feedbackRequestedAt = new Date();
    assignment.feedbackRequestStatus = result.success ? 'sent' : 'failed';
    await this.assignmentRepository.save(assignment);

    this.logger.log(
      `Dispatched post-assignment WhatsApp rating request for assignment ${assignment.id} to ${assignment.customer.phone}: success=${result.success}`
    );

    return result;
  }

  /**
   * Recalculates and updates the caregiver's completed jobs count.
   */
  async updateCaregiverJobsCount(caregiverId: string, tenantId?: string): Promise<number> {
    const where: any = {
      caregiverId,
      status: AssignmentStatus.COMPLETED,
    };
    if (tenantId) {
      where.tenantId = tenantId;
    }
    const count = await this.assignmentRepository.count({ where });
    await this.caregiverRepository.update(
      { id: caregiverId },
      { jobsCompleted: count }
    );
    this.logger.log(
      `Updated jobs_completed count for caregiver ${caregiverId}: ${count}`
    );
    return count;
  }

  /**
   * Replace an existing caregiver assignment with a new replacement caregiver.
   * Models assignments as a chronological history chain with replaced_by reference.
   */
  async replace(
    id: string,
    tenantId: string,
    dto: ReplaceAssignmentDto
  ): Promise<{ previousAssignment: Assignment; newAssignment: Assignment }> {
    if (!tenantId) {
      throw new BadRequestException('tenantId is required to replace an assignment.');
    }

    const currentAssignment = await this.assignmentRepository.findOne({
      where: { id, tenantId },
      relations: ['customer', 'caregiver'],
    });

    if (!currentAssignment) {
      throw new NotFoundException(`Assignment with ID ${id} not found in this agency.`);
    }

    if (currentAssignment.status === AssignmentStatus.REPLACED || currentAssignment.replacedById) {
      throw new BadRequestException('Assignment has already been replaced.');
    }

    if (currentAssignment.caregiverId === dto.replacementCaregiverId) {
      throw new BadRequestException('Replacement caregiver cannot be the same as current caregiver.');
    }

    const replacementCaregiver = await this.caregiverRepository.findOne({
      where: { id: dto.replacementCaregiverId, tenantId },
    });

    if (!replacementCaregiver) {
      throw new NotFoundException(
        `Replacement caregiver with ID ${dto.replacementCaregiverId} not found in this agency.`
      );
    }

    const caregiverDailyRate =
      dto.caregiverDailyRate !== undefined
        ? dto.caregiverDailyRate
        : (replacementCaregiver.dailyRate || currentAssignment.caregiverDailyRate || 0);

    const billingRate =
      dto.billingRate !== undefined ? dto.billingRate : currentAssignment.billingRate;

    // 1. Create the new replacement assignment
    const newAssignment = this.assignmentRepository.create({
      tenantId,
      customerId: currentAssignment.customerId,
      caregiverId: dto.replacementCaregiverId,
      startDate: dto.startDate,
      endDate: null,
      status: AssignmentStatus.ACTIVE,
      billingRate,
      caregiverDailyRate,
      notes:
        dto.notes ||
        `Replacement for ${currentAssignment.caregiver?.fullName || currentAssignment.caregiverId}`,
    });

    const savedNewAssignment = await this.assignmentRepository.save(newAssignment);

    // 2. Mark existing assignment as REPLACED and point replaced_by to new assignment
    currentAssignment.status = AssignmentStatus.REPLACED;
    currentAssignment.replacedById = savedNewAssignment.id;
    if (dto.absenceReason) {
      currentAssignment.absenceReason = dto.absenceReason;
    }
    if (dto.absenceNotes) {
      currentAssignment.absenceNotes = dto.absenceNotes;
    }
    currentAssignment.replacementReason =
      dto.replacementReason ||
      (currentAssignment.absenceNotes
        ? `${currentAssignment.absenceReason}: ${currentAssignment.absenceNotes}`
        : currentAssignment.absenceReason) ||
      'Replaced by agency staff';
    if (
      currentAssignment.replacementSlaStatus === 'pending' ||
      currentAssignment.replacementSlaStatus === 'escalated'
    ) {
      currentAssignment.replacementSlaStatus = 'resolved';
    }
    if (!currentAssignment.endDate || currentAssignment.endDate > dto.startDate) {
      currentAssignment.endDate = dto.startDate;
    }
    await this.assignmentRepository.save(currentAssignment);

    // 3. Update customer's active caregiver pointer and ensure status is ACTIVE
    const customer = await this.customerRepository.findOne({
      where: { id: currentAssignment.customerId, tenantId },
    });
    if (customer) {
      customer.assignedCaregiverId = replacementCaregiver.id;
      if (customer.status === CustomerStatus.PENDING) {
        customer.status = CustomerStatus.ACTIVE;
      }
      await this.customerRepository.save(customer);
    }

    // 4. Update previous caregiver's status if they have no other active assignments
    const remainingActive = await this.assignmentRepository.count({
      where: {
        tenantId,
        caregiverId: currentAssignment.caregiverId,
        status: AssignmentStatus.ACTIVE,
      },
    });
    if (remainingActive === 0) {
      await this.caregiverRepository.update(
        { id: currentAssignment.caregiverId, tenantId },
        { status: CaregiverStatus.AVAILABLE }
      );
    }

    // 5. Update replacement caregiver's status to ASSIGNED
    await this.caregiverRepository.update(
      { id: replacementCaregiver.id, tenantId },
      { status: CaregiverStatus.ASSIGNED }
    );

    this.logger.log(
      `Assignment ${currentAssignment.id} replaced by ${savedNewAssignment.id} (Caregiver ${replacementCaregiver.fullName} replacing ${currentAssignment.caregiver?.fullName || currentAssignment.caregiverId})`
    );

    const [updatedPrev, updatedNew] = await Promise.all([
      this.findOne(currentAssignment.id, tenantId),
      this.findOne(savedNewAssignment.id, tenantId),
    ]);

    return {
      previousAssignment: updatedPrev,
      newAssignment: updatedNew,
    };
  }

  /**
   * Retrieve full assignment history for a customer with replacement links.
   * Gives complete audit trail of caregivers, dates, rates, and reasons.
   */
  async getCustomerAssignmentHistory(
    customerId: string,
    tenantId: string,
    userRole?: string,
    userId?: string
  ): Promise<Assignment[]> {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId, tenantId },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found in this agency.`);
    }

    // Caregiver isolation: caregiver only sees their own assignments for this customer
    if (userRole === UserRole.CAREGIVER && userId) {
      const caregiver = await this.caregiverRepository.findOne({
        where: { userId, tenantId },
      });
      if (!caregiver) {
        return [];
      }
      return this.assignmentRepository.find({
        where: { customerId, tenantId, caregiverId: caregiver.id },
        relations: [
          'caregiver',
          'replacedBy',
          'replacedBy.caregiver',
          'replacedAssignments',
          'replacedAssignments.caregiver',
        ],
        order: { startDate: 'DESC', createdAt: 'DESC' },
      });
    }

    return this.assignmentRepository.find({
      where: { customerId, tenantId },
      relations: [
        'caregiver',
        'replacedBy',
        'replacedBy.caregiver',
        'replacedAssignments',
        'replacedAssignments.caregiver',
      ],
      order: { startDate: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * Request replacement for an active assignment, initiating the SLA timer (Phase 10, Point 3).
   * Captures absence reason (leave / quit / complaint / emergency) and sets SLA window.
   */
  async requestReplacement(
    id: string,
    tenantId: string,
    dto: RequestReplacementDto
  ): Promise<Assignment> {
    if (!tenantId) {
      throw new BadRequestException('tenantId is required to request replacement.');
    }

    const assignment = await this.assignmentRepository.findOne({
      where: { id, tenantId },
      relations: ['customer', 'caregiver'],
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment with ID ${id} not found.`);
    }

    if (assignment.status !== AssignmentStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot request replacement for assignment in status '${assignment.status}'.`
      );
    }

    // Resolve configured SLA window from tenant settings or default to 120 minutes (2 hours)
    let slaMinutes = dto.slaMinutes;
    if (!slaMinutes && this.tenantRepository) {
      const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
      if (tenant?.settings?.replacementSlaMinutes) {
        slaMinutes = tenant.settings.replacementSlaMinutes;
      } else if (tenant?.settings?.slaMinutes) {
        slaMinutes = tenant.settings.slaMinutes;
      }
    }
    slaMinutes = slaMinutes || 120;

    assignment.replacementRequestedAt = new Date();
    assignment.replacementSlaMinutes = slaMinutes;
    assignment.replacementSlaStatus = 'pending';
    assignment.absenceReason = dto.absenceReason || 'leave';
    assignment.absenceNotes = dto.absenceNotes || null;
    assignment.replacementSlaEscalatedAt = null;

    const saved = await this.assignmentRepository.save(assignment);

    this.logger.log(
      `Replacement requested for assignment ${id} (Customer: ${assignment.customer?.patientName}, Caregiver: ${assignment.caregiver?.fullName}). SLA window: ${slaMinutes}m, reason: ${dto.absenceReason}`
    );

    return saved;
  }

  /**
   * Escalate an unresolved assignment SLA to the Agency Owner via WhatsApp and Web Push.
   */
  async escalateAssignmentSla(
    id: string,
    tenantId: string,
    force = false
  ): Promise<{ assignment: Assignment; escalationResult?: any }> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id, tenantId },
      relations: ['customer', 'caregiver'],
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment with ID ${id} not found.`);
    }

    if (assignment.status !== AssignmentStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot escalate replacement for non-active assignment (${assignment.status}).`
      );
    }

    if (!force && assignment.replacementSlaStatus === 'escalated') {
      return { assignment };
    }

    let escalationResult: any;

    if (this.notificationsService && assignment.customer) {
      escalationResult = await this.notificationsService.escalateReplacementSla({
        tenantId,
        assignmentId: assignment.id,
        customerId: assignment.customerId,
        patientName: assignment.customer.patientName,
        district: assignment.customer.district,
        locality: assignment.customer.locality || undefined,
        caregiverName: assignment.caregiver?.fullName,
        absenceReason: assignment.absenceReason || 'Unresolved Caregiver Absence',
        absenceNotes: assignment.absenceNotes || undefined,
        slaMinutes: assignment.replacementSlaMinutes || 120,
      });
    }

    assignment.replacementSlaStatus = 'escalated';
    assignment.replacementSlaEscalatedAt = new Date();

    const saved = await this.assignmentRepository.save(assignment);

    this.logger.warn(
      `Escalated replacement SLA to Owner for assignment ${id} (patient ${assignment.customer?.patientName}). SLA window breached.`
    );

    return { assignment: saved, escalationResult };
  }

  /**
   * Scans and checks active assignments with pending SLA requests.
   * If the configured window has elapsed without replacement, automatically escalates to Agency Owner.
   */
  async checkAndEscalateSlaTimers(tenantId?: string): Promise<{
    checkedCount: number;
    escalatedCount: number;
    escalatedAssignments: string[];
  }> {
    const qb = this.assignmentRepository
      .createQueryBuilder('asgn')
      .where('asgn.status = :status', { status: AssignmentStatus.ACTIVE })
      .andWhere('asgn.replaced_by_id IS NULL')
      .andWhere('asgn.replacement_sla_status = :slaStatus', { slaStatus: 'pending' })
      .andWhere('asgn.replacement_requested_at IS NOT NULL')
      .andWhere('asgn.replacement_sla_escalated_at IS NULL')
      .leftJoinAndSelect('asgn.customer', 'customer')
      .leftJoinAndSelect('asgn.caregiver', 'caregiver');

    if (tenantId) {
      qb.andWhere('asgn.tenant_id = :tenantId', { tenantId });
    }

    const pendingAssignments = await qb.getMany();
    const now = Date.now();
    const escalatedAssignments: string[] = [];

    for (const asgn of pendingAssignments) {
      if (!asgn.replacementRequestedAt) continue;

      const requestedTime = new Date(asgn.replacementRequestedAt).getTime();
      const elapsedMinutes = (now - requestedTime) / (1000 * 60);
      const configuredSla = asgn.replacementSlaMinutes || 120;

      if (elapsedMinutes >= configuredSla) {
        try {
          await this.escalateAssignmentSla(asgn.id, asgn.tenantId, true);
          escalatedAssignments.push(asgn.id);
        } catch (err: any) {
          this.logger.error(
            `Failed to escalate SLA for assignment ${asgn.id}: ${err.message}`
          );
        }
      }
    }

    return {
      checkedCount: pendingAssignments.length,
      escalatedCount: escalatedAssignments.length,
      escalatedAssignments,
    };
  }

  /**
   * List assignments that have an active replacement SLA (pending or escalated).
   */
  async getOverdueReplacementSla(tenantId: string): Promise<Assignment[]> {
    return this.assignmentRepository.find({
      where: [
        { tenantId, status: AssignmentStatus.ACTIVE, replacementSlaStatus: 'pending' },
        { tenantId, status: AssignmentStatus.ACTIVE, replacementSlaStatus: 'escalated' },
      ],
      relations: ['customer', 'caregiver'],
      order: { replacementRequestedAt: 'ASC' },
    });
  }

  /**
   * Aggregates absence reasons for replacements and active absences in the agency (Phase 10, Point 4).
   * Context breakdown: leave, quit, complaint, emergency, rotation, other.
   */
  async getAbsenceStats(tenantId: string): Promise<{
    totalAbsences: number;
    breakdown: Record<string, number>;
  }> {
    const raw = await this.assignmentRepository
      .createQueryBuilder('asgn')
      .select('asgn.absence_reason', 'reason')
      .addSelect('COUNT(*)', 'count')
      .where('asgn.tenant_id = :tenantId', { tenantId })
      .andWhere('asgn.absence_reason IS NOT NULL')
      .groupBy('asgn.absence_reason')
      .getRawMany();

    const breakdown: Record<string, number> = {
      leave: 0,
      quit: 0,
      complaint: 0,
      emergency: 0,
      rotation: 0,
      other: 0,
    };

    let totalAbsences = 0;
    for (const row of raw) {
      const reasonKey = row.reason || 'other';
      const cnt = parseInt(row.count, 10) || 0;
      breakdown[reasonKey] = cnt;
      totalAbsences += cnt;
    }

    return { totalAbsences, breakdown };
  }
}


