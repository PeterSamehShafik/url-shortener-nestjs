import { IsFutureIsoDate } from '@/common/decorators/is-future-iso-date.decorator';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateUrlDto {
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;

  @IsOptional()
  @IsFutureIsoDate()
  expiresAt?: Date;
}
