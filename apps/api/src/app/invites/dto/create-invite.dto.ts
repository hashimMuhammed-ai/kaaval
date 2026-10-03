import {
  IsEmail,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { UserRole } from '../../common/enums/user-role.enum';

export class CreateInviteDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole = UserRole.OFFICE_STAFF;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsInt()
  @Min(1)
  @Max(168) // Max 7 days
  @IsOptional()
  expiryHours?: number = 48; // Default 48 hours per brief
}
