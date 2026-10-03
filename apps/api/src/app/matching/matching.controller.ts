import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MatchingService } from './matching.service';
import { MatchCaregiversQueryDto } from './dto/match-caregivers-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('matching')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  /**
   * Smart Caregiver Matching query via GET (query parameters).
   * Filters by GiST spatial radius, gender, experience, skills, and availability.
   */
  @Get()
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  async matchCaregiversGet(
    @Query() query: MatchCaregiversQueryDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.matchingService.matchCaregivers(query, user.tenantId!);
  }

  /**
   * Smart Caregiver Matching query via POST (payload body).
   */
  @Post()
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  @HttpCode(HttpStatus.OK)
  async matchCaregiversPost(
    @Body() query: MatchCaregiversQueryDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.matchingService.matchCaregivers(query, user.tenantId!);
  }

  /**
   * Smart Caregiver Matching scoped to a specific customer intake request.
   */
  @Get('request/:requestId')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  async matchForRequest(
    @Param('requestId') requestId: string,
    @Query() query: MatchCaregiversQueryDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.matchingService.matchCaregivers(
      { ...query, requestId },
      user.tenantId!
    );
  }

  /**
   * Smart Caregiver Matching scoped to an existing customer record.
   */
  @Get('customer/:customerId')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  async matchForCustomer(
    @Param('customerId') customerId: string,
    @Query() query: MatchCaregiversQueryDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.matchingService.matchCaregivers(
      { ...query, customerId },
      user.tenantId!
    );
  }

  /**
   * Smart Caregiver Matching scoped to find replacement for an existing assignment.
   * Scopes matching engine to the same customer requirement and excludes the current caregiver.
   */
  @Get('assignment/:assignmentId')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  async matchForAssignment(
    @Param('assignmentId') assignmentId: string,
    @Query() query: MatchCaregiversQueryDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.matchingService.matchCaregivers(
      { ...query, assignmentId },
      user.tenantId!
    );
  }
}
