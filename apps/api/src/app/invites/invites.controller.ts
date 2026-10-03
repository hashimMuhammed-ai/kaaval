import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { InvitesService } from './invites.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@Controller('invites')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  /**
   * Public: Validate an invite token before displaying the activation page.
   */
  @Get('validate')
  async validateInvite(@Query('token') token: string) {
    return this.invitesService.validateInvite(token);
  }

  /**
   * Public: Accept invite token, establish password, and create staff user account.
   */
  @Post('accept')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.invitesService.acceptInvite(dto);
  }

  /**
   * Agency Owner: Create an expiring invite token for Office Staff.
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async createInvite(@Body() dto: CreateInviteDto, @Req() req: any) {
    const user = req.user;
    return this.invitesService.createInvite(dto, user.id, user.tenantId, user.role);
  }

  /**
   * Agency Owner: List all invites for this agency.
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  async getInvites(@Req() req: any) {
    return this.invitesService.getInvitesByTenant(req.user.tenantId);
  }

  /**
   * Agency Owner: Revoke an active invite.
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  async revokeInvite(@Param('id') id: string, @Req() req: any) {
    return this.invitesService.revokeInvite(id, req.user.tenantId);
  }
}
