import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { RequestStatus } from '../../common/enums/request-status.enum';

export class UpdateRequestStatusDto {
  @IsEnum(RequestStatus)
  status: RequestStatus;

  @IsOptional()
  @IsUUID()
  assignedCaregiverId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
