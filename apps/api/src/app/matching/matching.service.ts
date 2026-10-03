import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Caregiver } from '../caregivers/entities/caregiver.entity';
import { CaregiverRequest } from '../requests/entities/request.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Assignment } from '../assignments/entities/assignment.entity';
import { GeocodingService } from '../common/geocoding/geocoding.service';
import { PostgisSpatialHelper } from '../common/geocoding/spatial-query.helper';
import { CaregiverStatus } from '../common/enums/caregiver-status.enum';
import { MatchCaregiversQueryDto } from './dto/match-caregivers-query.dto';
import {
  CaregiverMatchResultDto,
  MatchEngineResponseDto,
  ScoreBreakdown,
} from './dto/caregiver-match.dto';

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    @InjectRepository(Caregiver)
    private readonly caregiverRepository: Repository<Caregiver>,
    @InjectRepository(CaregiverRequest)
    private readonly requestRepository: Repository<CaregiverRequest>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    private readonly geocodingService: GeocodingService
  ) {}

  /**
   * Executes PostGIS-accelerated Smart Caregiver Matching.
   * Filters by GiST spatial radius, gender preference, skills, experience, and availability.
   */
  async matchCaregivers(
    query: MatchCaregiversQueryDto,
    tenantId: string
  ): Promise<MatchEngineResponseDto> {
    const effectiveQuery = { ...query };

    // 1. Resolve requirement context if requestId or customerId provided
    if (effectiveQuery.requestId) {
      const req = await this.requestRepository.findOne({
        where: { id: effectiveQuery.requestId, tenantId },
      });
      if (!req) {
        throw new NotFoundException(
          `Caregiver request ${effectiveQuery.requestId} not found.`
        );
      }
      effectiveQuery.district = effectiveQuery.district || req.district;
      effectiveQuery.city = effectiveQuery.city || req.locality || undefined;
      effectiveQuery.address = effectiveQuery.address || req.address || undefined;
      effectiveQuery.pincode = effectiveQuery.pincode || req.pincode || undefined;
      if (!effectiveQuery.gender || effectiveQuery.gender === 'any') {
        effectiveQuery.gender = req.genderPreference;
      }
      if (!effectiveQuery.skills || effectiveQuery.skills.length === 0) {
        effectiveQuery.skills = [req.serviceType];
      }
    } else if (effectiveQuery.customerId) {
      const cust = await this.customerRepository.findOne({
        where: { id: effectiveQuery.customerId, tenantId },
      });
      if (!cust) {
        throw new NotFoundException(
          `Customer ${effectiveQuery.customerId} not found.`
        );
      }
      effectiveQuery.district = effectiveQuery.district || cust.district;
      effectiveQuery.city = effectiveQuery.city || cust.locality || undefined;
      effectiveQuery.address = effectiveQuery.address || cust.address || undefined;
      effectiveQuery.pincode = effectiveQuery.pincode || cust.pincode || undefined;
      if (!effectiveQuery.gender || effectiveQuery.gender === 'any') {
        effectiveQuery.gender = cust.genderPreference;
      }
      if (!effectiveQuery.skills || effectiveQuery.skills.length === 0) {
        effectiveQuery.skills = [cust.serviceType];
      }
    } else if (effectiveQuery.assignmentId) {
      const asgn = await this.assignmentRepository.findOne({
        where: { id: effectiveQuery.assignmentId, tenantId },
        relations: ['customer', 'caregiver'],
      });
      if (!asgn) {
        throw new NotFoundException(
          `Assignment ${effectiveQuery.assignmentId} not found.`
        );
      }
      const cust = asgn.customer;
      if (!cust) {
        throw new NotFoundException(
          `Customer for assignment ${effectiveQuery.assignmentId} not found.`
        );
      }
      effectiveQuery.district = effectiveQuery.district || cust.district;
      effectiveQuery.city = effectiveQuery.city || cust.locality || undefined;
      effectiveQuery.address = effectiveQuery.address || cust.address || undefined;
      effectiveQuery.pincode = effectiveQuery.pincode || cust.pincode || undefined;
      if (!effectiveQuery.gender || effectiveQuery.gender === 'any') {
        effectiveQuery.gender = cust.genderPreference;
      }
      if (!effectiveQuery.skills || effectiveQuery.skills.length === 0) {
        effectiveQuery.skills = [cust.serviceType];
      }
      // Exclude current caregiver from candidate replacement results
      if (!effectiveQuery.excludeCaregiverId && asgn.caregiverId) {
        effectiveQuery.excludeCaregiverId = asgn.caregiverId;
      }
    }

    // 2. Resolve target coordinates for PostGIS distance matching
    let targetLat: number | null =
      effectiveQuery.latitude != null ? Number(effectiveQuery.latitude) : null;
    let targetLng: number | null =
      effectiveQuery.longitude != null ? Number(effectiveQuery.longitude) : null;
    let targetSource = 'explicit_coordinates';
    let targetDisplayName: string | undefined;

    if (targetLat == null || targetLng == null) {
      const geocoded = await this.geocodingService.geocode({
        address: effectiveQuery.address,
        city: effectiveQuery.city,
        district: effectiveQuery.district,
        pincode: effectiveQuery.pincode,
        state: 'Kerala',
      });

      if (geocoded) {
        targetLat = geocoded.latitude;
        targetLng = geocoded.longitude;
        targetSource = `geocoded_${geocoded.provider}`;
        targetDisplayName = geocoded.displayName;
      }
    }

    const radiusKm = effectiveQuery.radiusKm || 25;
    const minExp = effectiveQuery.minExperienceYears || 0;
    const reqSkills = effectiveQuery.skills || [];
    const genderFilter = (effectiveQuery.gender || 'any').trim().toLowerCase();

    // 3. Construct TypeORM QueryBuilder with PostGIS GiST index clauses
    const qb = this.caregiverRepository.createQueryBuilder('caregiver');
    qb.where('caregiver.tenantId = :tenantId', { tenantId });

    // Status / Availability filter
    if (!effectiveQuery.includeAllStatuses) {
      const statusToMatch = effectiveQuery.status || CaregiverStatus.AVAILABLE;
      qb.andWhere('caregiver.status = :status', { status: statusToMatch });
    }

    // Exclude specific caregiver (e.g., current caregiver being replaced)
    if (effectiveQuery.excludeCaregiverId) {
      qb.andWhere('caregiver.id != :excludedCaregiverId', {
        excludedCaregiverId: effectiveQuery.excludeCaregiverId,
      });
    }

    // Minimum experience filter
    if (minExp > 0) {
      qb.andWhere('caregiver.experienceYears >= :minExp', { minExp });
    }

    // Gender preference filter
    if (genderFilter !== 'any') {
      qb.andWhere('LOWER(caregiver.gender) = :gender', { gender: genderFilter });
    }

    // Skills filter (caregiver has at least one of the required skills)
    if (reqSkills.length > 0) {
      const skillPlaceholders: Record<string, string> = {};
      const clauses: string[] = [];

      reqSkills.forEach((skill, idx) => {
        const paramKey = `reqSkill_${idx}`;
        skillPlaceholders[paramKey] = `%${skill.trim().toLowerCase()}%`;
        clauses.push(
          `EXISTS (SELECT 1 FROM unnest(caregiver.skills) s WHERE LOWER(s) LIKE :${paramKey})`
        );
      });

      qb.andWhere(`(${clauses.join(' OR ')})`, skillPlaceholders);
    }

    // PostGIS Spatial Filtering & Distance computation via GiST index
    const hasCoordinates = targetLat != null && targetLng != null;

    if (hasCoordinates) {
      // 1. GiST Bounding Box Filter (&& with ST_Expand) for fast R-Tree index pruning
      const degrees = PostgisSpatialHelper.kmToDegrees(radiusKm);
      qb.andWhere(
        `caregiver.location IS NOT NULL AND caregiver.location && ST_Expand(ST_SetSRID(ST_MakePoint(:targetLng, :targetLat), 4326), ${degrees.toFixed(6)})`,
        { targetLng, targetLat }
      );

      // 2. PostGIS ST_DWithin on WGS84 geography for exact spheroidal radius in meters
      const radiusMeters = PostgisSpatialHelper.kmToMeters(radiusKm);
      qb.andWhere(
        `ST_DWithin(caregiver.location::geography, ST_SetSRID(ST_MakePoint(:targetLng, :targetLat), 4326)::geography, :radiusMeters)`,
        { radiusMeters }
      );

      // 3. Compute accurate distance in kilometers
      qb.addSelect(
        `ROUND((ST_Distance(caregiver.location::geography, ST_SetSRID(ST_MakePoint(:targetLng, :targetLat), 4326)::geography) / 1000.0)::numeric, 2)`,
        'distance_km'
      );
    } else if (effectiveQuery.district) {
      // Fallback district filter if no coordinates could be derived
      qb.andWhere('LOWER(caregiver.district) = LOWER(:fallbackDistrict)', {
        fallbackDistrict: effectiveQuery.district.trim(),
      });
    }

    // Proximity / Sorting clause
    if (hasCoordinates && effectiveQuery.sortBy === 'distance') {
      qb.orderBy('distance_km', 'ASC');
    } else if (effectiveQuery.sortBy === 'experience') {
      qb.orderBy('caregiver.experienceYears', 'DESC');
    } else if (effectiveQuery.sortBy === 'dailyRate') {
      qb.orderBy('caregiver.dailyRate', 'ASC');
    } else {
      qb.orderBy('caregiver.createdAt', 'DESC');
    }

    // Execute query and extract raw computed distance
    const rawAndEntities = await qb.getRawAndEntities();
    const entities = rawAndEntities.entities;
    const raw = rawAndEntities.raw;

    // 4. Map results and calculate Smart Match Score
    const matchItems: CaregiverMatchResultDto[] = entities.map((caregiver, idx) => {
      const rawDistance = raw[idx]?.distance_km;
      const distanceKm =
        rawDistance != null
          ? parseFloat(rawDistance)
          : hasCoordinates && caregiver.latitude != null && caregiver.longitude != null
          ? Number(
              this.geocodingService
                .calculateDistanceKm(
                  targetLat!,
                  targetLng!,
                  caregiver.latitude,
                  caregiver.longitude
                )
                .toFixed(2)
            )
          : null;

      // Identify matching skills
      const matchingSkills = (caregiver.skills || []).filter((cgSkill) =>
        reqSkills.some(
          (reqS) =>
            reqS.toLowerCase().includes(cgSkill.toLowerCase()) ||
            cgSkill.toLowerCase().includes(reqS.toLowerCase())
        )
      );

      // Calculate score breakdown
      const scoreBreakdown = this.computeScoreBreakdown(
        distanceKm,
        radiusKm,
        reqSkills,
        matchingSkills,
        caregiver.experienceYears,
        genderFilter,
        caregiver.gender
      );

      const matchScore =
        scoreBreakdown.distanceScore +
        scoreBreakdown.skillsScore +
        scoreBreakdown.experienceScore +
        scoreBreakdown.genderScore;

      return {
        caregiver: {
          id: caregiver.id,
          fullName: caregiver.fullName,
          phone: caregiver.phone,
          email: caregiver.email,
          gender: caregiver.gender,
          district: caregiver.district,
          city: caregiver.city,
          address: caregiver.address,
          pincode: caregiver.pincode,
          skills: caregiver.skills || [],
          experienceYears: caregiver.experienceYears,
          status: caregiver.status,
          dailyRate: caregiver.dailyRate,
          languages: caregiver.languages || [],
          latitude: caregiver.latitude,
          longitude: caregiver.longitude,
          profileSummary: caregiver.profileSummary,
          averageRating: Number(caregiver.averageRating || 0),
          totalRatings: Number(caregiver.totalRatings || 0),
          jobsCompleted: Number(caregiver.jobsCompleted || 0),
        },
        distanceKm,
        matchScore,
        scoreBreakdown,
        matchingSkills,
        isAvailable: caregiver.status === CaregiverStatus.AVAILABLE,
      };
    });

    // If sorting by score, sort in memory descending
    if (effectiveQuery.sortBy === 'score') {
      matchItems.sort((a, b) => b.matchScore - a.matchScore);
    }

    // Apply pagination
    const limit = effectiveQuery.limit || 20;
    const offset = effectiveQuery.offset || 0;
    const paginatedMatches = matchItems.slice(offset, offset + limit);

    return {
      targetLocation: {
        latitude: targetLat,
        longitude: targetLng,
        source: targetSource,
        displayName: targetDisplayName,
      },
      searchCriteria: {
        radiusKm,
        gender: genderFilter,
        minExperienceYears: minExp,
        requiredSkills: reqSkills,
        statusFilter: effectiveQuery.includeAllStatuses
          ? 'all'
          : effectiveQuery.status || 'available',
      },
      totalMatches: matchItems.length,
      matches: paginatedMatches,
    };
  }

  /**
   * Computes a multi-factor score breakdown (0 - 100 points):
   * - Proximity / Distance: up to 40 pts
   * - Skills match: up to 30 pts
   * - Experience: up to 20 pts
   * - Gender match: up to 10 pts
   */
  private computeScoreBreakdown(
    distanceKm: number | null,
    radiusKm: number,
    requiredSkills: string[],
    matchingSkills: string[],
    experienceYears: number,
    targetGender: string,
    caregiverGender: string
  ): ScoreBreakdown {
    // 1. Distance score (max 40 pts)
    let distanceScore = 0;
    if (distanceKm != null) {
      if (distanceKm <= 5) distanceScore = 40;
      else if (distanceKm <= 10) distanceScore = 35;
      else if (distanceKm <= 20) distanceScore = 28;
      else {
        const factor = Math.max(0, 1 - distanceKm / radiusKm);
        distanceScore = Math.round(factor * 25);
      }
    } else {
      distanceScore = 20; // Default baseline if distance is unknown
    }

    // 2. Skills score (max 30 pts)
    let skillsScore = 30;
    if (requiredSkills.length > 0) {
      const ratio = matchingSkills.length / requiredSkills.length;
      skillsScore = Math.min(30, Math.round(ratio * 30));
    }

    // 3. Experience score (max 20 pts: 2 pts per year up to 10 yrs)
    const experienceScore = Math.min(20, Math.round((experienceYears || 0) * 2));

    // 4. Gender score (max 10 pts)
    let genderScore = 10;
    if (targetGender !== 'any') {
      genderScore =
        caregiverGender.toLowerCase() === targetGender.toLowerCase() ? 10 : 0;
    }

    return {
      distanceScore,
      skillsScore,
      experienceScore,
      genderScore,
    };
  }
}
