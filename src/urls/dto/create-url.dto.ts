import { IsFutureIsoDate } from '@/common/decorators/is-future-iso-date.decorator';
import { IsOptionalButNotNull } from '@/common/decorators/is-optional-but-not-null.decorator';
import {
  IsNotEmpty,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUrlDto {
  @IsNotEmpty({ message: 'originalUrl is required' })
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'originalUrl must be a valid HTTP or HTTPS URL' },
  )
  @MaxLength(2048, { message: 'originalUrl must not exceed 2048 characters' })
  originalUrl!: string;

  @IsOptionalButNotNull()
  @IsString()
  @MinLength(3, { message: 'customSlug must be at least 3 characters' })
  @MaxLength(20, { message: 'customSlug must not exceed 20 characters' })
  @Matches(/^[a-zA-Z0-9-]+$/, {
    message: 'customSlug may only contain letters, numbers, and hyphens',
  })
  customSlug?: string;

  @IsOptionalButNotNull()
  @IsFutureIsoDate()
  expiresAt?: Date;
}
