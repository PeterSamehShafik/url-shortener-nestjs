import { IsFutureIsoDate } from '@/common/decorators/is-future-iso-date.decorator';
import { IsOptionalButNotNull } from '@/common/decorators/Is-optional-but-not-null';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateUrlDto {
  @IsOptionalButNotNull()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;

  //allows null as remove expiry date
  @IsOptional()
  @IsFutureIsoDate()
  expiresAt?: Date | null;
}
