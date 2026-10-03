import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { Caregiver } from './entities/caregiver.entity';
import { CaregiverDocument } from './entities/document.entity';
import { User } from '../users/entities/user.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Feedback } from '../feedback/entities/feedback.entity';
import { Assignment } from '../assignments/entities/assignment.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { CaregiverStatus } from '../common/enums/caregiver-status.enum';
import { AssignmentStatus } from '../common/enums/assignment-status.enum';
import { CreateCaregiverDto } from './dto/create-caregiver.dto';
import { UpdateCaregiverDto } from './dto/update-caregiver.dto';
import { QueryCaregiversDto } from './dto/query-caregivers.dto';
import {
  CaregiverResponseDto,
  CreateCaregiverResponseDto,
  TemporaryCredentialsDto,
} from './dto/caregiver-response.dto';
import {
  ConfigureRateDto,
  CaregiverRateConfigurationResult,
} from './dto/configure-rate.dto';
import {
  UploadDocumentDto,
  CaregiverDocumentResponseDto,
  ExpiryStatus,
} from './dto/upload-document.dto';
import {
  BulkImportResultDto,
  BulkImportSuccessRow,
  BulkImportErrorRow,
} from './dto/bulk-import-caregivers.dto';
import { parseCaregiverCsv, generateCaregiverCsvTemplate } from './utils/csv-parser';
import { PasswordHasher } from '../common/utils/password-hasher';
import { StorageService } from '../common/storage/storage.service';
import { FileDownloadResult, UploadableFile } from '../common/storage/storage.interface';
import { GeocodingService } from '../common/geocoding/geocoding.service';

@Injectable()
export class CaregiversService {
  private readonly logger = new Logger(CaregiversService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(Caregiver)
    private readonly caregiverRepository: Repository<Caregiver>,
    @InjectRepository(CaregiverDocument)
    private readonly documentRepository: Repository<CaregiverDocument>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly storageService: StorageService,
    @Optional()
    private readonly geocodingService?: GeocodingService,
    @Optional()
    @InjectRepository(Feedback)
    private readonly feedbackRepository?: Repository<Feedback>,
    @Optional()
    @InjectRepository(Assignment)
    private readonly assignmentRepository?: Repository<Assignment>
  ) {}

  /**
   * Combined Caregiver Profile + Login Creation (Single Action).
   *
   * Creates the caregiver's complete profile data (name, phone, skills, experience,
   * documents, location, etc.) AND their self-service portal user account / temporary
   * credentials in a single atomic database transaction.
   */
  async createCaregiver(
    dto: CreateCaregiverDto,
    callerTenantId: string,
    callerUserId: string,
    callerRole: UserRole
  ): Promise<CreateCaregiverResponseDto> {
    // 1. Role enforcement: Only Agency Owner or Office Staff can create caregivers
    if (callerRole === UserRole.CAREGIVER) {
      throw new ForbiddenException(
        'Caregivers do not have permission to create caregiver accounts.'
      );
    }

    if (!callerTenantId) {
      throw new BadRequestException('A tenant context is required to register a caregiver.');
    }

    // 2. Fetch tenant to verify active status and acquire subdomain
    const tenant = await this.tenantRepository.findOne({
      where: { id: callerTenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Agency tenant not found.');
    }

    const cleanPhone = dto.phone.trim();
    const normalizedEmail = dto.email ? dto.email.trim().toLowerCase() : null;

    // 3. Determine unique portal username/email for the caregiver user account
    // If not provided by staff, generate a deterministic agency login identifier
    const digitsOnly = cleanPhone.replace(/[^0-9]/g, '');
    const portalEmail =
      normalizedEmail || `cg_${digitsOnly}@${tenant.subdomain}.caregiver.local`;

    // 4. Verify no conflicting user account exists in this tenant
    const existingUser = await this.userRepository.findOne({
      where: {
        tenantId: callerTenantId,
        email: portalEmail,
      },
    });

    if (existingUser) {
      throw new ConflictException(
        `A user account with email or identifier "${portalEmail}" already exists in this agency.`
      );
    }

    // Verify phone uniqueness within tenant
    const existingPhone = await this.caregiverRepository.findOne({
      where: {
        tenantId: callerTenantId,
        phone: cleanPhone,
      },
    });

    if (existingPhone) {
      throw new ConflictException(
        `A caregiver with phone number "${cleanPhone}" is already registered in this agency.`
      );
    }

    // 5. Generate secure temporary credentials and access code
    const tempPassword =
      dto.temporaryPassword && dto.temporaryPassword.trim().length >= 6
        ? dto.temporaryPassword.trim()
        : `Care@${PasswordHasher.generateRandomToken(4).toUpperCase()}!`;

    const accessCode = `CG-${PasswordHasher.generateRandomToken(4).toUpperCase()}`;
    const passwordHash = PasswordHasher.hash(tempPassword);

    // 6. Execute atomic creation of User account + Caregiver profile + Initial documents
    return await this.dataSource.transaction(async (manager) => {
      // 6a. Create User account with role CAREGIVER
      const newUser = manager.create(User, {
        tenantId: callerTenantId,
        role: UserRole.CAREGIVER,
        name: dto.fullName.trim(),
        email: portalEmail,
        passwordHash,
        phone: cleanPhone,
        isActive: true,
      });

      const savedUser = await manager.save(User, newUser);

      // 6b. Determine latitude & longitude (geocode address if not explicitly provided)
      let resolvedLat = dto.latitude != null ? Number(dto.latitude) : null;
      let resolvedLng = dto.longitude != null ? Number(dto.longitude) : null;

      if ((resolvedLat == null || resolvedLng == null) && this.geocodingService) {
        try {
          const geocoded = await this.geocodingService.geocode({
            address: dto.address,
            city: dto.city,
            district: dto.district,
            pincode: dto.pincode,
            state: dto.state || 'Kerala',
          });
          if (geocoded) {
            resolvedLat = geocoded.latitude;
            resolvedLng = geocoded.longitude;
          }
        } catch (geoErr) {
          // Non-blocking geocoding failure fallback
        }
      }

      // Create Caregiver record linked 1-to-1 to User
      const newCaregiver = manager.create(Caregiver, {
        tenantId: callerTenantId,
        userId: savedUser.id,
        fullName: dto.fullName.trim(),
        phone: cleanPhone,
        email: normalizedEmail,
        gender: dto.gender ? dto.gender.trim().toLowerCase() : 'unspecified',
        dateOfBirth: dto.dateOfBirth || null,
        address: dto.address?.trim() || null,
        city: dto.city?.trim() || null,
        district: dto.district?.trim() || null,
        state: dto.state?.trim() || 'Kerala',
        pincode: dto.pincode?.trim() || null,
        latitude: resolvedLat,
        longitude: resolvedLng,
        skills: dto.skills || [],
        experienceYears: dto.experienceYears != null ? dto.experienceYears : 0,
        status: dto.status || CaregiverStatus.AVAILABLE,
        dailyRate: dto.dailyRate != null ? dto.dailyRate : 0,
        liveInRate: dto.liveInRate != null ? dto.liveInRate : 0,
        hourlyRate: dto.hourlyRate != null ? dto.hourlyRate : 0,
        commissionPercentage: dto.commissionPercentage != null ? dto.commissionPercentage : 15.0,
        rateNotes: dto.rateNotes?.trim() || null,
        emergencyContactName: dto.emergencyContactName?.trim() || null,
        emergencyContactPhone: dto.emergencyContactPhone?.trim() || null,
        languages:
          dto.languages && dto.languages.length > 0
            ? dto.languages
            : ['Malayalam'],
        temporaryAccessCode: accessCode,
        profileSummary: dto.profileSummary?.trim() || null,
        notes: dto.notes?.trim() || null,
      });

      const savedCaregiver = await manager.save(Caregiver, newCaregiver);

      // 6c. If initial documents provided, persist them
      const savedDocs: CaregiverDocument[] = [];
      if (dto.initialDocuments && dto.initialDocuments.length > 0) {
        for (const docDto of dto.initialDocuments) {
          const doc = manager.create(CaregiverDocument, {
            tenantId: callerTenantId,
            caregiverId: savedCaregiver.id,
            documentType: docDto.documentType,
            title: docDto.title,
            fileUrl: docDto.fileUrl,
            expiryDate: docDto.expiryDate || null,
            verified: true, // Marked verified when entered by staff
            verifiedBy: callerUserId,
            verifiedAt: new Date(),
          });
          const savedDoc = await manager.save(CaregiverDocument, doc);
          savedDocs.push(savedDoc);
        }
      }

      // 7. Construct WhatsApp onboarding message & portal URL
      const appDomain = process.env.APP_DOMAIN || 'caregiverplatform.com';
      const portalUrl = `https://${tenant.subdomain}.${appDomain}/login`;

      const whatsappOnboardingMessage = [
        `*Welcome to ${tenant.name} — Caregiver Portal Access*`,
        ``,
        `Hello ${dto.fullName.trim()}!`,
        `Your caregiver profile has been registered with *${tenant.name}*.`,
        ``,
        `You can now access your Caregiver Self-Service Portal to view your daily care assignments, record check-in/out attendance, and view salary statements:`,
        ``,
        `🌐 *Portal Link:* ${portalUrl}`,
        `👤 *Login Email / User ID:* ${portalEmail}`,
        `🔑 *Temporary Password:* ${tempPassword}`,
        `📋 *Access Code:* ${accessCode}`,
        ``,
        `_Please log in and update your password on first sign-in._`,
      ].join('\n');

      const temporaryCredentials: TemporaryCredentialsDto = {
        username: portalEmail,
        email: portalEmail,
        temporaryPassword: tempPassword,
        accessCode,
        portalUrl,
        whatsappOnboardingMessage,
      };

      return {
        success: true,
        message: `Caregiver "${savedCaregiver.fullName}" and self-service portal account created successfully.`,
        caregiver: this.mapToResponseDto(
          savedCaregiver,
          savedDocs,
          temporaryCredentials
        ),
      };
    });
  }

  /**
   * List caregivers in tenant with filtering and search.
   * If caller is CAREGIVER role, strictly restricted to self-profile.
   */
  async getCaregivers(
    callerTenantId: string,
    callerRole: UserRole,
    callerUserId: string,
    query: QueryCaregiversDto
  ): Promise<{ data: CaregiverResponseDto[]; total: number; page: number; limit: number }> {
    const qb = this.caregiverRepository
      .createQueryBuilder('caregiver')
      .leftJoinAndSelect('caregiver.documents', 'documents')
      .where('caregiver.tenant_id = :tenantId', { tenantId: callerTenantId });

    // Strict caregiver self-view isolation
    if (callerRole === UserRole.CAREGIVER) {
      qb.andWhere('caregiver.user_id = :userId', { userId: callerUserId });
    }

    // Status filter
    if (query.status) {
      qb.andWhere('caregiver.status = :status', { status: query.status });
    }

    // District filter
    if (query.district) {
      qb.andWhere('LOWER(caregiver.district) = :district', {
        district: query.district.trim().toLowerCase(),
      });
    }

    // Skill filter
    if (query.skill) {
      qb.andWhere(':skill = ANY(caregiver.skills)', { skill: query.skill });
    }

    // Full-text search on name, phone, or city
    if (query.search) {
      const term = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(caregiver.full_name) LIKE :term OR caregiver.phone LIKE :term OR LOWER(caregiver.city) LIKE :term)',
        { term }
      );
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    qb.orderBy('caregiver.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [caregivers, total] = await qb.getManyAndCount();

    return {
      data: caregivers.map((c) => this.mapToResponseDto(c, c.documents)),
      total,
      page,
      limit,
    };
  }

  /**
   * Aggregate counts of caregivers by operational status for the status board.
   */
  async getStatusCounts(
    callerTenantId: string,
    callerRole: UserRole,
    callerUserId: string
  ): Promise<{
    available: number;
    assigned: number;
    on_leave: number;
    inactive: number;
    total: number;
    occupancyRate: number;
  }> {
    const qb = this.caregiverRepository
      .createQueryBuilder('caregiver')
      .select('caregiver.status', 'status')
      .addSelect('COUNT(caregiver.id)', 'count')
      .where('caregiver.tenant_id = :tenantId', { tenantId: callerTenantId });

    if (callerRole === UserRole.CAREGIVER) {
      qb.andWhere('caregiver.user_id = :userId', { userId: callerUserId });
    }

    qb.groupBy('caregiver.status');

    const raw = await qb.getRawMany();

    const counts = {
      available: 0,
      assigned: 0,
      on_leave: 0,
      inactive: 0,
      total: 0,
      occupancyRate: 0,
    };

    for (const r of raw) {
      const c = parseInt(r.count, 10) || 0;
      if (r.status === CaregiverStatus.AVAILABLE) counts.available = c;
      else if (r.status === CaregiverStatus.ASSIGNED) counts.assigned = c;
      else if (r.status === CaregiverStatus.ON_LEAVE) counts.on_leave = c;
      else if (r.status === CaregiverStatus.INACTIVE) counts.inactive = c;
      counts.total += c;
    }

    const activePool = counts.available + counts.assigned;
    counts.occupancyRate =
      activePool > 0 ? Math.round((counts.assigned / activePool) * 100) : 0;

    return counts;
  }

  /**
   * Fetch caregiver profile for the currently authenticated user (Caregiver self-view portal).
   */
  async getMyCaregiverProfile(
    callerTenantId: string,
    callerUserId: string
  ): Promise<CaregiverResponseDto> {
    const caregiver = await this.caregiverRepository.findOne({
      where: { userId: callerUserId, tenantId: callerTenantId },
      relations: ['documents'],
    });

    if (!caregiver) {
      throw new NotFoundException('Caregiver profile not found for this user account.');
    }

    return this.mapToResponseDto(caregiver, caregiver.documents);
  }

  /**
   * Fetch single caregiver by ID.
   * Enforces tenant boundary and caregiver self-view restriction.
   */
  async getCaregiverById(
    id: string,
    callerTenantId: string,
    callerRole: UserRole,
    callerUserId: string
  ): Promise<CaregiverResponseDto> {
    const caregiver = await this.caregiverRepository.findOne({
      where: { id, tenantId: callerTenantId },
      relations: ['documents'],
    });

    if (!caregiver) {
      throw new NotFoundException(`Caregiver profile with ID "${id}" not found.`);
    }

    // Self-view restriction for caregiver role
    if (callerRole === UserRole.CAREGIVER && caregiver.userId !== callerUserId) {
      throw new ForbiddenException(
        'Caregivers are only authorized to view their own profile.'
      );
    }

    return this.mapToResponseDto(caregiver, caregiver.documents);
  }

  /**
   * Update caregiver profile details.
   */
  async updateCaregiver(
    id: string,
    dto: UpdateCaregiverDto,
    callerTenantId: string,
    callerRole: UserRole,
    callerUserId: string
  ): Promise<CaregiverResponseDto> {
    const caregiver = await this.caregiverRepository.findOne({
      where: { id, tenantId: callerTenantId },
      relations: ['documents', 'user'],
    });

    if (!caregiver) {
      throw new NotFoundException(`Caregiver profile not found.`);
    }

    if (callerRole === UserRole.CAREGIVER && caregiver.userId !== callerUserId) {
      throw new ForbiddenException(
        'Caregivers are only authorized to update their own profile.'
      );
    }

    const addressChanged =
      (dto.address !== undefined && dto.address !== caregiver.address) ||
      (dto.city !== undefined && dto.city !== caregiver.city) ||
      (dto.district !== undefined && dto.district !== caregiver.district) ||
      (dto.pincode !== undefined && dto.pincode !== caregiver.pincode);

    // Update profile fields
    if (dto.fullName) caregiver.fullName = dto.fullName.trim();
    if (dto.phone) caregiver.phone = dto.phone.trim();
    if (dto.email !== undefined) caregiver.email = dto.email ? dto.email.trim().toLowerCase() : null;
    if (dto.gender) caregiver.gender = dto.gender.trim().toLowerCase();
    if (dto.dateOfBirth !== undefined) caregiver.dateOfBirth = dto.dateOfBirth;
    if (dto.address !== undefined) caregiver.address = dto.address;
    if (dto.city !== undefined) caregiver.city = dto.city;
    if (dto.district !== undefined) caregiver.district = dto.district;
    if (dto.state !== undefined) caregiver.state = dto.state;
    if (dto.pincode !== undefined) caregiver.pincode = dto.pincode;
    if (dto.latitude !== undefined) caregiver.latitude = dto.latitude;
    if (dto.longitude !== undefined) caregiver.longitude = dto.longitude;

    // Auto-regeocode if address changed and coordinates were not explicitly specified
    if (
      addressChanged &&
      dto.latitude === undefined &&
      dto.longitude === undefined &&
      this.geocodingService
    ) {
      try {
        const geocoded = await this.geocodingService.geocode({
          address: caregiver.address,
          city: caregiver.city,
          district: caregiver.district,
          pincode: caregiver.pincode,
          state: caregiver.state || 'Kerala',
        });
        if (geocoded) {
          caregiver.latitude = geocoded.latitude;
          caregiver.longitude = geocoded.longitude;
        }
      } catch (geoErr) {
        // Non-blocking geocoding failure fallback
      }
    }

    if (dto.skills !== undefined) caregiver.skills = dto.skills;
    if (dto.experienceYears !== undefined) caregiver.experienceYears = dto.experienceYears;
    if (dto.status !== undefined && callerRole !== UserRole.CAREGIVER) {
      // Caregiver cannot change their own administrative status
      caregiver.status = dto.status;
    }
    if (dto.dailyRate !== undefined && callerRole !== UserRole.CAREGIVER) {
      // Caregiver cannot change their own billing rate
      caregiver.dailyRate = dto.dailyRate;
    }
    if (dto.liveInRate !== undefined && callerRole !== UserRole.CAREGIVER) {
      caregiver.liveInRate = dto.liveInRate;
    }
    if (dto.hourlyRate !== undefined && callerRole !== UserRole.CAREGIVER) {
      caregiver.hourlyRate = dto.hourlyRate;
    }
    if (dto.commissionPercentage !== undefined && callerRole !== UserRole.CAREGIVER) {
      caregiver.commissionPercentage = dto.commissionPercentage;
    }
    if (dto.rateNotes !== undefined && callerRole !== UserRole.CAREGIVER) {
      caregiver.rateNotes = dto.rateNotes;
    }
    if (dto.emergencyContactName !== undefined) caregiver.emergencyContactName = dto.emergencyContactName;
    if (dto.emergencyContactPhone !== undefined) caregiver.emergencyContactPhone = dto.emergencyContactPhone;
    if (dto.languages !== undefined) caregiver.languages = dto.languages;
    if (dto.profileSummary !== undefined) caregiver.profileSummary = dto.profileSummary;
    if (dto.notes !== undefined) caregiver.notes = dto.notes;

    const saved = await this.caregiverRepository.save(caregiver);

    // Sync full name with User account if updated
    if (dto.fullName && caregiver.user) {
      await this.userRepository.update(caregiver.userId, {
        name: dto.fullName.trim(),
      });
    }

    return this.mapToResponseDto(saved, saved.documents);
  }

  /**
   * Configure daily rate and rate structure per caregiver.
   * Only accessible by Agency Owner or Office Staff.
   */
  async configureRate(
    id: string,
    callerTenantId: string,
    dto: ConfigureRateDto,
    callerRole: UserRole
  ): Promise<CaregiverResponseDto> {
    if (callerRole === UserRole.CAREGIVER) {
      throw new ForbiddenException(
        'Caregivers are not permitted to configure billing or wage rates.'
      );
    }

    const caregiver = await this.caregiverRepository.findOne({
      where: { id, tenantId: callerTenantId },
      relations: ['documents'],
    });

    if (!caregiver) {
      throw new NotFoundException(`Caregiver with ID "${id}" not found.`);
    }

    caregiver.dailyRate = dto.dailyRate;
    if (dto.liveInRate !== undefined) caregiver.liveInRate = dto.liveInRate;
    if (dto.hourlyRate !== undefined) caregiver.hourlyRate = dto.hourlyRate;
    if (dto.commissionPercentage !== undefined) {
      caregiver.commissionPercentage = dto.commissionPercentage;
    }
    if (dto.rateNotes !== undefined) caregiver.rateNotes = dto.rateNotes;

    const saved = await this.caregiverRepository.save(caregiver);
    this.logger.log(
      `Configured rates for Caregiver ${caregiver.fullName} (ID=${id}): Daily=₹${dto.dailyRate}, LiveIn=₹${saved.liveInRate}, Commission=${saved.commissionPercentage}%`
    );

    return this.mapToResponseDto(saved, saved.documents);
  }

  /**
   * Get caregiver daily rate configuration and commission split breakdown.
   * Accessible by Owner, Office Staff, and the Caregiver themselves (self-view).
   */
  async getRateConfiguration(
    id: string,
    callerTenantId: string,
    callerRole: UserRole,
    callerUserId: string
  ): Promise<CaregiverRateConfigurationResult> {
    const caregiver = await this.caregiverRepository.findOne({
      where: { id, tenantId: callerTenantId },
    });

    if (!caregiver) {
      throw new NotFoundException(`Caregiver with ID "${id}" not found.`);
    }

    if (callerRole === UserRole.CAREGIVER && caregiver.userId !== callerUserId) {
      throw new ForbiddenException(
        'Caregivers may only view their own rate configuration.'
      );
    }

    const dailyRate = Number(caregiver.dailyRate || 0);
    const liveInRate = Number(caregiver.liveInRate || 0);
    const hourlyRate = Number(caregiver.hourlyRate || 0);
    const commissionPercentage = Number(caregiver.commissionPercentage ?? 15);
    const agencyCommissionDaily = Number((dailyRate * (commissionPercentage / 100)).toFixed(2));
    const takeHomeEstimateDaily = Number((dailyRate - agencyCommissionDaily).toFixed(2));

    return {
      caregiverId: caregiver.id,
      fullName: caregiver.fullName,
      dailyRate,
      liveInRate,
      hourlyRate,
      commissionPercentage,
      rateNotes: caregiver.rateNotes || null,
      takeHomeEstimateDaily,
      agencyCommissionDaily,
    };
  }

  /**
   * Re-geocodes an existing caregiver record using current address/city/district/pincode.
   * Only accessible by Agency Owner or Office Staff.
   */
  async regeocodeCaregiver(
    id: string,
    callerTenantId: string,
    callerRole: UserRole
  ): Promise<CaregiverResponseDto> {
    if (callerRole === UserRole.CAREGIVER) {
      throw new ForbiddenException(
        'Caregivers are not permitted to trigger administrative geocoding.'
      );
    }

    const caregiver = await this.caregiverRepository.findOne({
      where: { id, tenantId: callerTenantId },
      relations: ['user', 'documents'],
    });

    if (!caregiver) {
      throw new NotFoundException('Caregiver not found.');
    }

    if (this.geocodingService) {
      const geocoded = await this.geocodingService.geocode({
        address: caregiver.address,
        city: caregiver.city,
        district: caregiver.district,
        pincode: caregiver.pincode,
        state: caregiver.state || 'Kerala',
      });

      if (geocoded) {
        caregiver.latitude = geocoded.latitude;
        caregiver.longitude = geocoded.longitude;
        const saved = await this.caregiverRepository.save(caregiver);
        return this.mapToResponseDto(saved, saved.documents);
      }
    }

    return this.mapToResponseDto(caregiver, caregiver.documents);
  }

  /**
   * Regenerate temporary credentials and WhatsApp message for caregiver.
   * Accessible by Owner / Office Staff.
   */
  async regenerateCredentials(
    id: string,
    callerTenantId: string,
    callerRole: UserRole
  ): Promise<{ success: boolean; temporaryCredentials: TemporaryCredentialsDto }> {
    if (callerRole === UserRole.CAREGIVER) {
      throw new ForbiddenException('Caregivers cannot regenerate access credentials.');
    }

    const caregiver = await this.caregiverRepository.findOne({
      where: { id, tenantId: callerTenantId },
      relations: ['user', 'tenant'],
    });

    if (!caregiver) {
      throw new NotFoundException('Caregiver not found.');
    }

    const tenant = caregiver.tenant || (await this.tenantRepository.findOne({ where: { id: callerTenantId } }));
    if (!tenant) {
      throw new NotFoundException('Agency tenant not found.');
    }

    const tempPassword = `Care@${PasswordHasher.generateRandomToken(4).toUpperCase()}!`;
    const accessCode = `CG-${PasswordHasher.generateRandomToken(4).toUpperCase()}`;
    const passwordHash = PasswordHasher.hash(tempPassword);

    await this.userRepository.update(caregiver.userId, {
      passwordHash,
      isActive: true,
    });

    caregiver.temporaryAccessCode = accessCode;
    await this.caregiverRepository.save(caregiver);

    const appDomain = process.env.APP_DOMAIN || 'caregiverplatform.com';
    const portalUrl = `https://${tenant.subdomain}.${appDomain}/login`;
    const userEmail = caregiver.user?.email || caregiver.email || caregiver.phone;

    const whatsappOnboardingMessage = [
      `*${tenant.name} — Updated Caregiver Portal Credentials*`,
      ``,
      `Hello ${caregiver.fullName}!`,
      `Your login credentials for the Caregiver Portal have been refreshed:`,
      ``,
      `🌐 *Portal Link:* ${portalUrl}`,
      `👤 *Login Email / User ID:* ${userEmail}`,
      `🔑 *Temporary Password:* ${tempPassword}`,
      `📋 *Access Code:* ${accessCode}`,
      ``,
      `_Please log in and update your password._`,
    ].join('\n');

    return {
      success: true,
      temporaryCredentials: {
        username: userEmail,
        email: userEmail,
        temporaryPassword: tempPassword,
        accessCode,
        portalUrl,
        whatsappOnboardingMessage,
      },
    };
  }

  /**
   * Bulk import caregivers from CSV text or buffer.
   * Atomically provisions User account + Caregiver profile for each valid row.
   * Skips erroneous rows and reports exact row-level reasons while importing valid entries.
   */
  async bulkImportCaregiversFromCsv(
    csvInput: string | Buffer,
    callerTenantId: string,
    callerUserId: string,
    callerRole: UserRole
  ): Promise<BulkImportResultDto> {
    if (callerRole === UserRole.CAREGIVER) {
      throw new ForbiddenException(
        'Caregivers do not have permission to perform bulk imports.'
      );
    }

    if (!callerTenantId) {
      throw new BadRequestException('A tenant context is required for bulk import.');
    }

    const tenant = await this.tenantRepository.findOne({
      where: { id: callerTenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Agency tenant not found.');
    }

    const csvString =
      typeof csvInput === 'string' ? csvInput : csvInput.toString('utf-8');

    const parsedRows = parseCaregiverCsv(csvString);

    if (parsedRows.length === 0) {
      throw new BadRequestException(
        'No valid caregiver records found in the provided CSV. Please check headers and data format.'
      );
    }

    const imported: BulkImportSuccessRow[] = [];
    const errors: BulkImportErrorRow[] = [];

    const seenPhonesInBatch = new Set<string>();
    const seenEmailsInBatch = new Set<string>();

    for (const row of parsedRows) {
      const cleanPhone = (row.phone || '').trim();
      const cleanName = (row.fullName || '').trim();

      if (!cleanName || cleanName.length < 2) {
        errors.push({
          row: row.rowNumber,
          name: cleanName,
          phone: cleanPhone,
          reason: 'Caregiver full name is required (minimum 2 characters).',
        });
        continue;
      }

      if (!cleanPhone || cleanPhone.length < 7) {
        errors.push({
          row: row.rowNumber,
          name: cleanName,
          phone: cleanPhone,
          reason: 'Valid phone number is required (minimum 7 digits).',
        });
        continue;
      }

      const phoneNormalized = cleanPhone.replace(/[^0-9]/g, '');
      if (seenPhonesInBatch.has(phoneNormalized)) {
        errors.push({
          row: row.rowNumber,
          name: cleanName,
          phone: cleanPhone,
          reason: `Duplicate phone number "${cleanPhone}" appears multiple times in this CSV file.`,
        });
        continue;
      }

      if (row.email) {
        const normEmail = row.email.trim().toLowerCase();
        if (seenEmailsInBatch.has(normEmail)) {
          errors.push({
            row: row.rowNumber,
            name: cleanName,
            phone: cleanPhone,
            reason: `Duplicate email "${row.email}" appears multiple times in this CSV file.`,
          });
          continue;
        }
      }

      try {
        const dto: CreateCaregiverDto = {
          fullName: cleanName,
          phone: cleanPhone,
          email: row.email ? row.email.trim() : undefined,
          gender: row.gender ? row.gender.trim() : 'female',
          district: row.district ? row.district.trim() : 'Ernakulam',
          city: row.city ? row.city.trim() : undefined,
          address: row.address ? row.address.trim() : undefined,
          pincode: row.pincode ? row.pincode.trim() : undefined,
          latitude: row.latitude,
          longitude: row.longitude,
          skills: row.skills && row.skills.length > 0 ? row.skills : ['Elderly Care'],
          experienceYears: row.experienceYears != null ? Number(row.experienceYears) : 0,
          dailyRate: row.dailyRate != null ? Number(row.dailyRate) : 0,
          status: (row.status as any) || CaregiverStatus.AVAILABLE,
          languages: row.languages && row.languages.length > 0 ? row.languages : ['Malayalam'],
          emergencyContactName: row.emergencyContactName ? row.emergencyContactName.trim() : undefined,
          emergencyContactPhone: row.emergencyContactPhone ? row.emergencyContactPhone.trim() : undefined,
          notes: row.notes ? row.notes.trim() : undefined,
        };

        const result = await this.createCaregiver(
          dto,
          callerTenantId,
          callerUserId,
          callerRole
        );

        seenPhonesInBatch.add(phoneNormalized);
        if (row.email) {
          seenEmailsInBatch.add(row.email.trim().toLowerCase());
        }

        imported.push({
          id: result.caregiver.id,
          fullName: result.caregiver.fullName,
          phone: result.caregiver.phone,
          district: result.caregiver.district || undefined,
          status: result.caregiver.status,
          temporaryCredentials: {
            username: result.caregiver.temporaryCredentials?.username || '',
            temporaryPassword: result.caregiver.temporaryCredentials?.temporaryPassword || '',
            accessCode: result.caregiver.temporaryCredentials?.accessCode || '',
            portalUrl: result.caregiver.temporaryCredentials?.portalUrl || '',
            whatsappOnboardingMessage: result.caregiver.temporaryCredentials?.whatsappOnboardingMessage || '',
          },
        });
      } catch (err: any) {
        errors.push({
          row: row.rowNumber,
          name: cleanName,
          phone: cleanPhone,
          reason: err.message || 'Validation or database conflict error.',
        });
      }
    }

    return {
      totalRows: parsedRows.length,
      importedCount: imported.length,
      failedCount: errors.length,
      imported,
      errors,
    };
  }

  /**
   * Generates sample CSV template string for agencies to download.
   */
  getCsvTemplate(): string {
    return generateCaregiverCsvTemplate();
  }

  /**
   * Upload a certification or ID document for a caregiver.
   */
  async uploadCaregiverDocument(
    caregiverId: string,
    file: UploadableFile,
    dto: UploadDocumentDto,
    callerTenantId: string,
    callerRole: UserRole,
    callerUserId: string
  ): Promise<CaregiverDocumentResponseDto> {
    if (!file || !file.buffer) {
      throw new BadRequestException('A document file is required.');
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      throw new BadRequestException('File size exceeds the 10MB limit.');
    }

    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Allowed formats: PDF, JPEG, PNG, WEBP.'
      );
    }

    const caregiver = await this.caregiverRepository.findOne({
      where: { id: caregiverId, tenantId: callerTenantId },
    });

    if (!caregiver) {
      throw new NotFoundException('Caregiver not found in this agency.');
    }

    // Caregivers can only upload documents for their own profile
    if (callerRole === UserRole.CAREGIVER && caregiver.userId !== callerUserId) {
      throw new ForbiddenException(
        'Caregivers may only upload documents for their own profile.'
      );
    }

    const stored = await this.storageService.uploadFile(file, {
      tenantId: callerTenantId,
      caregiverId,
      documentType: dto.documentType,
    });

    const document = this.documentRepository.create({
      tenantId: callerTenantId,
      caregiverId,
      documentType: dto.documentType,
      title: dto.title.trim(),
      fileUrl: stored.fileUrl,
      fileKey: stored.fileKey,
      mimeType: stored.mimeType,
      fileSize: stored.fileSize,
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
      verified: false,
    });

    const savedDoc = await this.documentRepository.save(document);

    // Update fileUrl with persisted document ID for clean authenticated streaming route
    const resolvedUrl = this.storageService.resolveFileUrl(
      savedDoc.fileKey!,
      caregiverId,
      savedDoc.id
    );
    savedDoc.fileUrl = resolvedUrl;
    await this.documentRepository.update(savedDoc.id, { fileUrl: resolvedUrl });

    return this.mapDocumentToResponseDto(savedDoc);
  }

  /**
   * List all documents for a caregiver with computed expiry indicators.
   */
  async getCaregiverDocuments(
    caregiverId: string,
    callerTenantId: string,
    callerRole: UserRole,
    callerUserId: string
  ): Promise<CaregiverDocumentResponseDto[]> {
    let caregiver: Caregiver | null = null;
    if (caregiverId === 'me' && callerUserId) {
      caregiver = await this.caregiverRepository.findOne({
        where: { userId: callerUserId, tenantId: callerTenantId },
      });
    } else {
      caregiver = await this.caregiverRepository.findOne({
        where: { id: caregiverId, tenantId: callerTenantId },
      });
    }

    if (!caregiver) {
      throw new NotFoundException('Caregiver not found in this agency.');
    }

    if (callerRole === UserRole.CAREGIVER && caregiver.userId !== callerUserId) {
      throw new ForbiddenException(
        'Caregivers may only view documents for their own profile.'
      );
    }

    const documents = await this.documentRepository.find({
      where: { caregiverId: caregiver.id, tenantId: callerTenantId },
      order: { createdAt: 'DESC' },
    });

    return documents.map((doc) => this.mapDocumentToResponseDto(doc));
  }

  /**
   * Delete a document from object storage and database.
   */
  async deleteCaregiverDocument(
    caregiverId: string,
    documentId: string,
    callerTenantId: string,
    callerRole: UserRole,
    callerUserId: string
  ): Promise<{ success: boolean; message: string }> {
    const caregiver = await this.caregiverRepository.findOne({
      where: { id: caregiverId, tenantId: callerTenantId },
    });

    if (!caregiver) {
      throw new NotFoundException('Caregiver not found in this agency.');
    }

    const document = await this.documentRepository.findOne({
      where: { id: documentId, caregiverId, tenantId: callerTenantId },
    });

    if (!document) {
      throw new NotFoundException('Document not found.');
    }

    if (callerRole === UserRole.CAREGIVER) {
      if (caregiver.userId !== callerUserId) {
        throw new ForbiddenException(
          'Caregivers may only delete their own documents.'
        );
      }
      if (document.verified) {
        throw new ForbiddenException(
          'Caregivers cannot delete verified documents. Please contact agency office staff.'
        );
      }
    }

    if (document.fileKey) {
      await this.storageService.deleteFile(document.fileKey);
    }

    await this.documentRepository.delete(documentId);

    return {
      success: true,
      message: `Document "${document.title}" removed successfully.`,
    };
  }

  /**
   * Verify a caregiver's document (Owner or Office Staff only).
   */
  async verifyCaregiverDocument(
    caregiverId: string,
    documentId: string,
    callerTenantId: string,
    callerRole: UserRole,
    callerUserId: string
  ): Promise<CaregiverDocumentResponseDto> {
    if (callerRole === UserRole.CAREGIVER) {
      throw new ForbiddenException(
        'Caregivers cannot verify documents.'
      );
    }

    const caregiver = await this.caregiverRepository.findOne({
      where: { id: caregiverId, tenantId: callerTenantId },
    });

    if (!caregiver) {
      throw new NotFoundException('Caregiver not found in this agency.');
    }

    const document = await this.documentRepository.findOne({
      where: { id: documentId, caregiverId, tenantId: callerTenantId },
    });

    if (!document) {
      throw new NotFoundException('Document not found.');
    }

    document.verified = true;
    document.verifiedBy = callerUserId;
    document.verifiedAt = new Date();

    const saved = await this.documentRepository.save(document);
    return this.mapDocumentToResponseDto(saved);
  }

  /**
   * Retrieve file stream for authenticated download.
   */
  async downloadCaregiverDocument(
    caregiverId: string,
    documentId: string,
    callerTenantId: string,
    callerRole: UserRole,
    callerUserId: string
  ): Promise<FileDownloadResult> {
    let caregiver: Caregiver | null = null;
    if (caregiverId === 'me' && callerUserId) {
      caregiver = await this.caregiverRepository.findOne({
        where: { userId: callerUserId, tenantId: callerTenantId },
      });
    } else {
      caregiver = await this.caregiverRepository.findOne({
        where: { id: caregiverId, tenantId: callerTenantId },
      });
    }

    if (!caregiver) {
      throw new NotFoundException('Caregiver not found in this agency.');
    }

    if (callerRole === UserRole.CAREGIVER && caregiver.userId !== callerUserId) {
      throw new ForbiddenException(
        'Caregivers may only download documents from their own profile.'
      );
    }

    const document = await this.documentRepository.findOne({
      where: { id: documentId, caregiverId: caregiver.id, tenantId: callerTenantId },
    });

    if (!document || !document.fileKey) {
      throw new NotFoundException('Document file record not found.');
    }

    return this.storageService.getFileStream(document.fileKey);
  }

  /**
   * Computes document expiry status: 'valid', 'expiring_soon' (<= 30 days), 'expired', or 'no_expiry'.
   */
  computeExpiryStatus(expiryDate?: Date | string | null): {
    status: ExpiryStatus;
    daysUntilExpiry: number | null;
  } {
    if (!expiryDate) {
      return { status: 'no_expiry', daysUntilExpiry: null };
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);

    if (isNaN(expiry.getTime())) {
      return { status: 'no_expiry', daysUntilExpiry: null };
    }

    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: 'expired', daysUntilExpiry: diffDays };
    } else if (diffDays <= 30) {
      return { status: 'expiring_soon', daysUntilExpiry: diffDays };
    } else {
      return { status: 'valid', daysUntilExpiry: diffDays };
    }
  }

  /**
   * Recalculate rolling average rating and jobs completed for a caregiver.
   */
  async recalculateCaregiverStats(
    caregiverId: string,
    tenantId?: string
  ): Promise<{ averageRating: number; totalRatings: number; jobsCompleted: number }> {
    const caregiver = await this.caregiverRepository.findOne({
      where: tenantId ? { id: caregiverId, tenantId } : { id: caregiverId },
    });

    if (!caregiver) {
      throw new NotFoundException(`Caregiver with ID ${caregiverId} not found.`);
    }

    let averageRating = 0;
    let totalRatings = 0;
    let jobsCompleted = 0;

    // 1. Compute rolling average rating from feedback
    if (this.feedbackRepository) {
      const feedbackQb = this.feedbackRepository
        .createQueryBuilder('fb')
        .select('COUNT(fb.id)', 'count')
        .addSelect('AVG(fb.rating)', 'avg')
        .where('fb.caregiver_id = :caregiverId', { caregiverId });

      if (tenantId) {
        feedbackQb.andWhere('fb.tenant_id = :tenantId', { tenantId });
      }

      const feedbackStats = await feedbackQb.getRawOne();
      totalRatings = feedbackStats?.count ? parseInt(feedbackStats.count, 10) : 0;
      const rawAvg = feedbackStats?.avg ? parseFloat(feedbackStats.avg) : 0;
      averageRating = totalRatings > 0 ? Math.round(rawAvg * 100) / 100 : 0;
    }

    // 2. Compute completed assignments count
    if (this.assignmentRepository) {
      const assignmentQb = this.assignmentRepository
        .createQueryBuilder('a')
        .where('a.caregiver_id = :caregiverId', { caregiverId })
        .andWhere('a.status = :status', { status: AssignmentStatus.COMPLETED });

      if (tenantId) {
        assignmentQb.andWhere('a.tenant_id = :tenantId', { tenantId });
      }

      jobsCompleted = await assignmentQb.getCount();
    }

    await this.caregiverRepository.update(
      { id: caregiverId },
      {
        averageRating,
        totalRatings,
        jobsCompleted,
      }
    );

    this.logger.log(
      `Recalculated stats for caregiver ${caregiverId}: avgRating=${averageRating}, totalRatings=${totalRatings}, jobsCompleted=${jobsCompleted}`
    );

    return {
      averageRating,
      totalRatings,
      jobsCompleted,
    };
  }

  private mapDocumentToResponseDto(
    doc: CaregiverDocument
  ): CaregiverDocumentResponseDto {
    const { status, daysUntilExpiry } = this.computeExpiryStatus(doc.expiryDate);
    return {
      id: doc.id,
      tenantId: doc.tenantId,
      caregiverId: doc.caregiverId,
      documentType: doc.documentType,
      title: doc.title,
      fileUrl: doc.fileUrl,
      fileKey: doc.fileKey,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      expiryDate: doc.expiryDate,
      expiryStatus: status,
      daysUntilExpiry,
      verified: doc.verified,
      verifiedBy: doc.verifiedBy,
      verifiedAt: doc.verifiedAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  private mapToResponseDto(
    caregiver: Caregiver,
    documents: CaregiverDocument[] = [],
    temporaryCredentials?: TemporaryCredentialsDto
  ): CaregiverResponseDto {
    return {
      id: caregiver.id,
      tenantId: caregiver.tenantId,
      userId: caregiver.userId,
      fullName: caregiver.fullName,
      phone: caregiver.phone,
      email: caregiver.email,
      gender: caregiver.gender,
      dateOfBirth: caregiver.dateOfBirth,
      address: caregiver.address,
      city: caregiver.city,
      district: caregiver.district,
      state: caregiver.state,
      pincode: caregiver.pincode,
      latitude: caregiver.latitude,
      longitude: caregiver.longitude,
      skills: caregiver.skills || [],
      experienceYears: Number(caregiver.experienceYears || 0),
      status: caregiver.status,
      dailyRate: Number(caregiver.dailyRate || 0),
      liveInRate: Number(caregiver.liveInRate || 0),
      hourlyRate: Number(caregiver.hourlyRate || 0),
      commissionPercentage: Number(caregiver.commissionPercentage ?? 15),
      rateNotes: caregiver.rateNotes,
      emergencyContactName: caregiver.emergencyContactName,
      emergencyContactPhone: caregiver.emergencyContactPhone,
      languages: caregiver.languages || [],
      profileSummary: caregiver.profileSummary,
      averageRating: Number(caregiver.averageRating || 0),
      totalRatings: Number(caregiver.totalRatings || 0),
      jobsCompleted: Number(caregiver.jobsCompleted || 0),
      notes: caregiver.notes,
      temporaryCredentials,
      documents: (documents || []).map((d) => {
        const { status, daysUntilExpiry } = this.computeExpiryStatus(d.expiryDate);
        return {
          id: d.id,
          documentType: d.documentType,
          title: d.title,
          fileUrl: d.fileUrl,
          fileKey: d.fileKey,
          mimeType: d.mimeType,
          fileSize: d.fileSize,
          expiryDate: d.expiryDate,
          expiryStatus: status,
          daysUntilExpiry,
          verified: d.verified,
          verifiedAt: d.verifiedAt,
        };
      }),
      createdAt: caregiver.createdAt,
      updatedAt: caregiver.updatedAt,
    };
  }
}
