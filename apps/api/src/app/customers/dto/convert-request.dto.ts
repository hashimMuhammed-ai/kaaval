import { IsOptional, IsEnum, IsUUID, IsString } from 'class-validator';
import { CustomerStatus } from '../../common/enums/customer-status.enum';

export class ConvertRequestToCustomerDto {
  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus = CustomerStatus.ACTIVE;

  @IsOptional()
  @IsUUID()
  assignedCaregiverId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
