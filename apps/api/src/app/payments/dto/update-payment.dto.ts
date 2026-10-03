import { IsOptional, IsEnum, IsNumber, Min, IsString } from 'class-validator';
import { PaymentStatus } from '../../common/enums/payment-status.enum';

export class UpdatePaymentDto {
  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;

  @IsNumber()
  @Min(0)
  @IsOptional()
  deductions?: number;

  @IsString()
  @IsOptional()
  paymentDate?: string;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  transactionReference?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
