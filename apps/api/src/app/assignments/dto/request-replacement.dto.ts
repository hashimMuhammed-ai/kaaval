import { IsOptional, IsString, IsNotEmpty, IsInt, Min } from 'class-validator';

export class RequestReplacementDto {
  @IsString()
  @IsNotEmpty()
  absenceReason: string;

  @IsOptional()
  @IsString()
  absenceNotes?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  slaMinutes?: number;
}
