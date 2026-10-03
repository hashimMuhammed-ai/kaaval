import {
  IsOptional,
  IsNumber,
  IsString,
  IsArray,
  IsEnum,
  IsBoolean,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { CaregiverStatus } from '../../common/enums/caregiver-status.enum';

export class MatchCaregiversQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  radiusKm?: number = 25;

  @IsOptional()
  @IsString()
  gender?: string = 'any';

  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  })
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(50)
  minExperienceYears?: number = 0;

  @IsOptional()
  @IsEnum(CaregiverStatus)
  status?: CaregiverStatus = CaregiverStatus.AVAILABLE;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeAllStatuses?: boolean = false;

  @IsOptional()
  @IsUUID()
  requestId?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  assignmentId?: string;

  @IsOptional()
  @IsUUID()
  excludeCaregiverId?: string;

  @IsOptional()
  @IsString()
  sortBy?: 'distance' | 'experience' | 'dailyRate' | 'score' = 'distance';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0;
}
