import { IsOptional, IsString, IsEnum, IsUUID, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentStatus } from '../../common/enums/payment-status.enum';

export class QueryPaymentsDto {
  @IsString()
  @IsOptional()
  month?: string; // 'YYYY-MM'

  @IsUUID()
  @IsOptional()
  caregiverId?: string;

  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 20;
}
