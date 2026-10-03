import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from './entities/feedback.entity';
import { Assignment } from '../assignments/entities/assignment.entity';
import { Caregiver } from '../caregivers/entities/caregiver.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { CreateFeedbackDto, SubmitPublicFeedbackDto } from './dto/create-feedback.dto';
import { QueryFeedbackDto } from './dto/query-feedback.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { AssignmentStatus } from '../common/enums/assignment-status.enum';

export interface FeedbackListResult {
  items: Feedback[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(Caregiver)
    private readonly caregiverRepository: Repository<Caregiver>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>
  ) {}

  /**
   * Record or update feedback (rating + optional comment) linked to an assignment.
   */
  async create(dto: CreateFeedbackDto, tenantId?: string): Promise<Feedback> {
    const assignment = await this.assignmentRepository.findOne({
      where: tenantId ? { id: dto.assignmentId, tenantId } : { id: dto.assignmentId },
      relations: ['customer', 'caregiver'],
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment with ID ${dto.assignmentId} not found.`);
    }

    const effectiveTenantId = assignment.tenantId;

    // Check if feedback already exists for this assignment
    let feedback = await this.feedbackRepository.findOne({
      where: { assignmentId: assignment.id },
      relations: ['caregiver', 'customer'],
    });

    if (feedback) {
      feedback.rating = dto.rating;
      feedback.comment = dto.comment !== undefined ? dto.comment : feedback.comment;
      feedback.source = dto.source || feedback.source;
      if (dto.whatsappMessageId) {
        feedback.whatsappMessageId = dto.whatsappMessageId;
      }
      feedback = await this.feedbackRepository.save(feedback);
      this.logger.log(
        `Updated existing feedback ${feedback.id} for assignment ${assignment.id}: rating=${feedback.rating}`
      );
    } else {
      feedback = this.feedbackRepository.create({
        tenantId: effectiveTenantId,
        assignmentId: assignment.id,
        caregiverId: assignment.caregiverId,
        customerId: assignment.customerId,
        rating: dto.rating,
        comment: dto.comment || null,
        source: dto.source || 'manual',
        whatsappMessageId: dto.whatsappMessageId || null,
      });
      feedback = await this.feedbackRepository.save(feedback);
      this.logger.log(
        `Stored new feedback ${feedback.id} for assignment ${assignment.id}: rating=${feedback.rating}`
      );
    }

    // Update assignment status flag
    await this.assignmentRepository.update(
      { id: assignment.id },
      { feedbackRequestStatus: 'received' }
    );

    // Recalculate caregiver's rolling average rating & total reviews
    try {
      await this.updateCaregiverRatingStats(feedback.caregiverId, effectiveTenantId);
    } catch (err: any) {
      this.logger.error(`Failed to update caregiver rating stats: ${err.message}`, err.stack);
    }

    const reloaded = await this.feedbackRepository.findOne({
      where: { id: feedback.id, tenantId: effectiveTenantId },
      relations: ['caregiver', 'customer', 'assignment'],
    });

    return reloaded || feedback;
  }

  /**
   * Recalculates and updates the caregiver's rolling average rating and total ratings count.
   */
  async updateCaregiverRatingStats(
    caregiverId: string,
    tenantId?: string
  ): Promise<{ averageRating: number; totalRatings: number }> {
    const qb = this.feedbackRepository
      .createQueryBuilder('fb')
      .select('COUNT(fb.id)', 'count')
      .addSelect('AVG(fb.rating)', 'avg')
      .where('fb.caregiver_id = :caregiverId', { caregiverId });

    if (tenantId) {
      qb.andWhere('fb.tenant_id = :tenantId', { tenantId });
    }

    const raw = await qb.getRawOne();
    const count = raw?.count ? parseInt(raw.count, 10) : 0;
    const avg = raw?.avg ? parseFloat(raw.avg) : 0;
    const averageRating = count > 0 ? Math.round(avg * 100) / 100 : 0;

    await this.caregiverRepository.update(
      { id: caregiverId },
      {
        averageRating,
        totalRatings: count,
      }
    );

    this.logger.log(
      `Updated rolling average rating for caregiver ${caregiverId}: avgRating=${averageRating}, totalRatings=${count}`
    );

    return { averageRating, totalRatings: count };
  }

  /**
   * Get non-sensitive summary details for public rating page
   */
  async getPublicAssignmentDetails(assignmentId: string): Promise<any> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId },
      relations: ['caregiver', 'tenant'],
    });

    if (!assignment) {
      throw new NotFoundException('Care assignment not found or expired link.');
    }

    const existingFeedback = await this.feedbackRepository.findOne({
      where: { assignmentId },
    });

    return {
      assignmentId: assignment.id,
      caregiverName: assignment.caregiver?.fullName || 'Caregiver',
      agencyName: assignment.tenant?.name || 'CareKerala Healthcare',
      startDate: assignment.startDate,
      endDate: assignment.endDate,
      alreadySubmitted: Boolean(existingFeedback),
      existingRating: existingFeedback?.rating || null,
      existingComment: existingFeedback?.comment || null,
    };
  }

  /**
   * Submit feedback from the public WhatsApp rating link
   */
  async submitPublic(assignmentId: string, dto: SubmitPublicFeedbackDto): Promise<Feedback> {
    return this.create({
      assignmentId,
      rating: dto.rating,
      comment: dto.comment,
      source: 'web_link',
    });
  }

  /**
   * Find feedback by assignment ID
   */
  async findByAssignment(assignmentId: string, tenantId?: string): Promise<Feedback | null> {
    const where: any = { assignmentId };
    if (tenantId) {
      where.tenantId = tenantId;
    }
    return this.feedbackRepository.findOne({
      where,
      relations: ['caregiver', 'customer', 'assignment'],
    });
  }

  /**
   * List feedback with filtering and role isolation
   */
  async findAll(
    tenantId: string,
    query: QueryFeedbackDto = {},
    userRole?: string,
    userId?: string
  ): Promise<FeedbackListResult> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const qb = this.feedbackRepository
      .createQueryBuilder('fb')
      .where('fb.tenant_id = :tenantId', { tenantId })
      .leftJoinAndSelect('fb.caregiver', 'caregiver')
      .leftJoinAndSelect('fb.customer', 'customer')
      .leftJoinAndSelect('fb.assignment', 'assignment');

    // Caregiver isolation: can only see their own feedback
    if (userRole === UserRole.CAREGIVER && userId) {
      const cg = await this.caregiverRepository.findOne({
        where: { userId, tenantId },
      });
      if (!cg) {
        return { items: [], total: 0, page, limit, totalPages: 1 };
      }
      qb.andWhere('fb.caregiver_id = :cgId', { cgId: cg.id });
    }

    if (query.caregiverId) {
      qb.andWhere('fb.caregiver_id = :caregiverId', { caregiverId: query.caregiverId });
    }

    if (query.customerId) {
      qb.andWhere('fb.customer_id = :customerId', { customerId: query.customerId });
    }

    if (query.assignmentId) {
      qb.andWhere('fb.assignment_id = :assignmentId', { assignmentId: query.assignmentId });
    }

    if (query.rating) {
      qb.andWhere('fb.rating = :rating', { rating: query.rating });
    }

    qb.orderBy('fb.created_at', 'DESC')
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
   * Get single feedback detail
   */
  async findOne(
    id: string,
    tenantId: string,
    userRole?: string,
    userId?: string
  ): Promise<Feedback> {
    const feedback = await this.feedbackRepository.findOne({
      where: { id, tenantId },
      relations: ['caregiver', 'customer', 'assignment'],
    });

    if (!feedback) {
      throw new NotFoundException(`Feedback record with ID ${id} not found.`);
    }

    if (userRole === UserRole.CAREGIVER && userId) {
      const cg = await this.caregiverRepository.findOne({
        where: { userId, tenantId },
      });
      if (!cg || feedback.caregiverId !== cg.id) {
        throw new ForbiddenException('Caregivers may only view feedback for their own assignments.');
      }
    }

    return feedback;
  }

  /**
   * Automatically parse incoming WhatsApp reply from a customer and record rating
   */
  async recordInboundWhatsAppRating(
    senderPhone: string,
    textBody: string,
    messageId?: string
  ): Promise<{
    matched: boolean;
    feedback?: Feedback;
    thankYouMessage?: string;
  }> {
    if (!senderPhone || !textBody) {
      return { matched: false };
    }

    const cleanPhone = senderPhone.replace(/[^0-9]/g, '');
    const phoneSuffix = cleanPhone.slice(-10); // match 10-digit Indian mobile

    // Extract rating (1 to 5)
    // Matches: "5", "5/5", "5 stars", "Rating 4", "5 - Very good care", "Loved it, 5"
    let parsedRating: number | null = null;
    let extractedComment: string | null = null;

    const ratingRegex = /\b([1-5])\b(?:\s*(?:stars?|\/5|\*|out of 5))?/i;
    const match = textBody.match(ratingRegex);

    if (match) {
      parsedRating = parseInt(match[1], 10);
      // Clean comment: remove the rating portion
      const remainder = textBody.replace(match[0], '').replace(/^[\s\-:,.]+/, '').trim();
      extractedComment = remainder.length > 0 ? remainder : null;
    }

    if (!parsedRating) {
      return { matched: false };
    }

    // Find customer by phone
    const customers = await this.customerRepository
      .createQueryBuilder('c')
      .where("REPLACE(REPLACE(REPLACE(c.phone, ' ', ''), '-', ''), '+', '') LIKE :suffix", {
        suffix: `%${phoneSuffix}%`,
      })
      .getMany();

    if (!customers || customers.length === 0) {
      this.logger.log(`No registered customer found for phone suffix ${phoneSuffix}`);
      return { matched: false };
    }

    const customerIds = customers.map((c) => c.id);

    // Find target assignment: priority to completed or feedback_requested
    const assignment = await this.assignmentRepository
      .createQueryBuilder('asgn')
      .where('asgn.customer_id IN (:...customerIds)', { customerIds })
      .leftJoinAndSelect('asgn.caregiver', 'caregiver')
      .leftJoinAndSelect('asgn.customer', 'customer')
      .leftJoinAndSelect('asgn.tenant', 'tenant')
      .orderBy('asgn.feedback_requested_at', 'DESC', 'NULLS LAST')
      .addOrderBy('asgn.end_date', 'DESC', 'NULLS LAST')
      .addOrderBy('asgn.created_at', 'DESC')
      .getOne();

    if (!assignment) {
      this.logger.log(`No active or completed assignment found for customer IDs ${customerIds.join(', ')}`);
      return { matched: false };
    }

    const savedFeedback = await this.create({
      assignmentId: assignment.id,
      rating: parsedRating,
      comment: extractedComment || undefined,
      source: 'whatsapp',
      whatsappMessageId: messageId,
    });

    const agencyName = assignment.tenant?.name || 'CareKerala Agency';
    const caregiverName = assignment.caregiver?.fullName || 'your assigned caregiver';

    const thankYouMessage = `Thank you for your rating (${parsedRating}/5 stars) for caregiver ${caregiverName}. Your feedback directly ensures compassionate healthcare for families across Kerala. — ${agencyName}`;

    return {
      matched: true,
      feedback: savedFeedback,
      thankYouMessage,
    };
  }
}
