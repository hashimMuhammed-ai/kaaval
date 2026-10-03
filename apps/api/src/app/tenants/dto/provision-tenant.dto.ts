import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  Matches,
  ValidateNested,
  MinLength,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentMethod {
  GPAY = 'gpay',
  BANK_TRANSFER = 'bank_transfer',
  CASH = 'cash',
  OTHER = 'other',
}

export enum ConfirmationChannel {
  PHONE_CALL = 'phone_call',
  WHATSAPP = 'whatsapp',
  IN_PERSON = 'in_person',
  OTHER = 'other',
}

export class PaymentConfirmationDto {
  @IsString()
  @IsNotEmpty()
  paymentReference: string;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod = PaymentMethod.GPAY;

  @IsEnum(ConfirmationChannel)
  @IsOptional()
  confirmedVia?: ConfirmationChannel = ConfirmationChannel.PHONE_CALL;

  @IsNumber()
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsOptional()
  confirmedAt?: Date = new Date();
}

export class InitialOwnerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  @MinLength(8)
  password?: string;
}

export class ProvisionTenantDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/, {
    message: 'subdomain must be 3-63 characters, lowercase alphanumeric and hyphens, and cannot start or end with a hyphen',
  })
  subdomain: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  customDomain?: string;

  @ValidateNested()
  @Type(() => PaymentConfirmationDto)
  paymentConfirmation: PaymentConfirmationDto;

  @ValidateNested()
  @Type(() => InitialOwnerDto)
  owner: InitialOwnerDto;
}
