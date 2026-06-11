import { IsBoolean, IsDateString, IsOptional } from 'class-validator';

export class UpdateUrlDto {
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'expiresAt must be a valid ISO 8601 date string' },
  )
  expiresAt?: string;
}
