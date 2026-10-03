import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto, SubmitPublicFeedbackDto } from './dto/create-feedback.dto';
import { QueryFeedbackDto } from './dto/query-feedback.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  /**
   * Public: Retrieve non-sensitive caregiver & agency details for the feedback form.
   */
  @Get('public/:assignmentId')
  async getPublicDetails(@Param('assignmentId') assignmentId: string) {
    const details = await this.feedbackService.getPublicAssignmentDetails(assignmentId);
    return {
      success: true,
      data: details,
    };
  }

  /**
   * Public: Submit 1-5 star rating and optional comment from the WhatsApp feedback link.
   */
  @Post('public/:assignmentId')
  @HttpCode(HttpStatus.CREATED)
  async submitPublicFeedback(
    @Param('assignmentId') assignmentId: string,
    @Body() dto: SubmitPublicFeedbackDto
  ) {
    const feedback = await this.feedbackService.submitPublic(assignmentId, dto);
    return {
      success: true,
      message: 'Thank you for your rating and feedback!',
      data: feedback,
    };
  }

  /**
   * Protected: Agency staff manual feedback entry
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateFeedbackDto,
    @CurrentUser() user: JwtPayload
  ) {
    const feedback = await this.feedbackService.create(dto, user.tenantId!);
    return {
      success: true,
      message: 'Caregiver feedback recorded successfully.',
      data: feedback,
    };
  }

  /**
   * Protected: List feedback entries
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF, UserRole.CAREGIVER)
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryFeedbackDto
  ) {
    const result = await this.feedbackService.findAll(
      user.tenantId!,
      query,
      user.role,
      user.userId
    );
    return {
      success: true,
      data: result.items,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };
  }

  /**
   * Protected: Get feedback for a specific assignment
   */
  @Get('assignment/:assignmentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF, UserRole.CAREGIVER)
  async findByAssignment(
    @Param('assignmentId') assignmentId: string,
    @CurrentUser() user: JwtPayload
  ) {
    const feedback = await this.feedbackService.findByAssignment(assignmentId, user.tenantId!);
    return {
      success: true,
      data: feedback,
    };
  }

  /**
   * Protected: Get feedback detail by ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF, UserRole.CAREGIVER)
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ) {
    const feedback = await this.feedbackService.findOne(
      id,
      user.tenantId!,
      user.role,
      user.userId
    );
    return {
      success: true,
      data: feedback,
    };
  }
}
