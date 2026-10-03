import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { CaregiversService } from './caregivers.service';
import { CreateCaregiverDto } from './dto/create-caregiver.dto';
import { UpdateCaregiverDto } from './dto/update-caregiver.dto';
import { QueryCaregiversDto } from './dto/query-caregivers.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { BulkImportCaregiversDto } from './dto/bulk-import-caregivers.dto';
import { ConfigureRateDto } from './dto/configure-rate.dto';
import { UploadableFile } from '../common/storage/storage.interface';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('caregivers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CaregiversController {
  constructor(private readonly caregiversService: CaregiversService) {}

  /**
   * Combined Caregiver Profile + Portal User Login Creation.
   * Single combined action performed by Office Staff or Agency Owner.
   */
  @Post()
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  @HttpCode(HttpStatus.CREATED)
  async createCaregiver(
    @Body() dto: CreateCaregiverDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.caregiversService.createCaregiver(
      dto,
      user.tenantId!,
      user.userId,
      user.role
    );
  }

  /**
   * List caregivers.
   * Office Staff & Owner see full roster; Caregiver sees strictly their own profile.
   */
  @Get()
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF, UserRole.CAREGIVER)
  async getCaregivers(
    @Query() query: QueryCaregiversDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.caregiversService.getCaregivers(
      user.tenantId!,
      user.role,
      user.userId,
      query
    );
  }

  /**
   * Get operational status breakdown counts for the Status Board UI.
   */
  @Get('status-counts')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF, UserRole.CAREGIVER)
  async getStatusCounts(@CurrentUser() user: JwtPayload) {
    return this.caregiversService.getStatusCounts(
      user.tenantId!,
      user.role,
      user.userId
    );
  }

  /**
   * Download CSV template with sample data for bulk caregiver onboarding.
   */
  @Get('bulk-import/template')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  async downloadBulkImportTemplate(@Res() res: Response) {
    const csvContent = this.caregiversService.getCsvTemplate();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="caregivers_import_template.csv"'
    );
    res.send(csvContent);
  }

  /**
   * Bulk import caregivers from CSV file or payload.
   * Atomically provisions User credentials and Caregiver profiles.
   */
  @Post('bulk-import')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  @UseInterceptors(FileInterceptor('file'))
  async bulkImport(
    @UploadedFile() file: UploadableFile | undefined,
    @Body() dto: BulkImportCaregiversDto,
    @CurrentUser() user: JwtPayload
  ) {
    let csvInput: string | Buffer | undefined;

    if (file && file.buffer) {
      csvInput = file.buffer;
    } else if (dto && dto.csvContent) {
      csvInput = dto.csvContent;
    }

    if (!csvInput) {
      throw new BadRequestException(
        'Please provide a CSV file (form field "file") or csvContent in request body.'
      );
    }

    return this.caregiversService.bulkImportCaregiversFromCsv(
      csvInput,
      user.tenantId!,
      user.userId,
      user.role
    );
  }

  /**
   * Get own caregiver profile for logged-in caregiver (Caregiver Self-Service Portal).
   */
  @Get('me')
  @Roles(UserRole.CAREGIVER, UserRole.OWNER, UserRole.OFFICE_STAFF)
  async getMyProfile(@CurrentUser() user: JwtPayload) {
    return this.caregiversService.getMyCaregiverProfile(
      user.tenantId!,
      user.userId
    );
  }

  /**
   * Get caregiver details by ID.
   */
  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF, UserRole.CAREGIVER)
  async getCaregiverById(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.caregiversService.getCaregiverById(
      id,
      user.tenantId!,
      user.role,
      user.userId
    );
  }

  /**
   * Update caregiver profile.
   */
  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF, UserRole.CAREGIVER)
  async updateCaregiver(
    @Param('id') id: string,
    @Body() dto: UpdateCaregiverDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.caregiversService.updateCaregiver(
      id,
      dto,
      user.tenantId!,
      user.role,
      user.userId
    );
  }

  /**
   * Configure daily rate and rate structure per caregiver.
   * Only accessible by Agency Owner or Office Staff.
   */
  @Patch(':id/rate')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  async configureRate(
    @Param('id') id: string,
    @Body() dto: ConfigureRateDto,
    @CurrentUser() user: JwtPayload
  ) {
    const updated = await this.caregiversService.configureRate(
      id,
      user.tenantId!,
      dto,
      user.role
    );
    return {
      success: true,
      message: `Daily rate configuration updated for ${updated.fullName}.`,
      data: updated,
    };
  }

  /**
   * Get caregiver daily rate configuration and commission split.
   * Accessible by Owner, Office Staff, and the Caregiver themselves (self-view).
   */
  @Get(':id/rate')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF, UserRole.CAREGIVER)
  async getRateConfiguration(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ) {
    const config = await this.caregiversService.getRateConfiguration(
      id,
      user.tenantId!,
      user.role,
      user.userId
    );
    return {
      success: true,
      data: config,
    };
  }

  /**
   * Geocode or re-geocode an existing caregiver address to sync coordinates.
   */
  @Post(':id/geocode')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  async geocodeCaregiver(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.caregiversService.regeocodeCaregiver(
      id,
      user.tenantId!,
      user.role
    );
  }

  /**
   * Fast status update endpoint for Drag & Drop / quick board actions.
   */
  @Patch(':id/status')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: any,
    @CurrentUser() user: JwtPayload
  ) {
    return this.caregiversService.updateCaregiver(
      id,
      { status },
      user.tenantId!,
      user.role,
      user.userId
    );
  }

  /**
   * Regenerate temporary credentials and WhatsApp message.
   */
  @Post(':id/reset-credentials')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  async resetCredentials(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.caregiversService.regenerateCredentials(
      id,
      user.tenantId!,
      user.role
    );
  }

  /**
   * Upload a certification, ID proof, or other document for a caregiver.
   * Multipart/form-data with file field "file".
   */
  @Post(':id/documents')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF, UserRole.CAREGIVER)
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: UploadableFile,
    @Body() dto: UploadDocumentDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.caregiversService.uploadCaregiverDocument(
      id,
      file,
      dto,
      user.tenantId!,
      user.role,
      user.userId
    );
  }

  /**
   * List all documents for a caregiver with expiry statuses.
   */
  @Get(':id/documents')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF, UserRole.CAREGIVER)
  async getDocuments(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.caregiversService.getCaregiverDocuments(
      id,
      user.tenantId!,
      user.role,
      user.userId
    );
  }

  /**
   * Verify an uploaded document (Staff/Owner only).
   */
  @Patch(':id/documents/:documentId/verify')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  async verifyDocument(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.caregiversService.verifyCaregiverDocument(
      id,
      documentId,
      user.tenantId!,
      user.role,
      user.userId
    );
  }

  /**
   * Download / stream document content securely.
   */
  @Get(':id/documents/:documentId/download')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF, UserRole.CAREGIVER)
  async downloadDocument(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response
  ) {
    const fileResult = await this.caregiversService.downloadCaregiverDocument(
      id,
      documentId,
      user.tenantId!,
      user.role,
      user.userId
    );

    res.setHeader('Content-Type', fileResult.mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(fileResult.filename || 'document')}"`
    );
    if (fileResult.fileSize) {
      res.setHeader('Content-Length', fileResult.fileSize);
    }

    fileResult.stream.pipe(res);
  }

  /**
   * Delete an uploaded document.
   */
  @Delete(':id/documents/:documentId')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF, UserRole.CAREGIVER)
  async deleteDocument(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.caregiversService.deleteCaregiverDocument(
      id,
      documentId,
      user.tenantId!,
      user.role,
      user.userId
    );
  }

  /**
   * Recalculate rolling average rating and jobs completed for a caregiver.
   */
  @Post(':id/recalculate-stats')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  async recalculateStats(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.caregiversService.recalculateCaregiverStats(id, user.tenantId);
  }
}


