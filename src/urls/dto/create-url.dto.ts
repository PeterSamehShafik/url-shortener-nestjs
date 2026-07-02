import { IsFutureIsoDate } from '@/common/decorators/is-future-iso-date.decorator';
import { IsOptionalButNotNull } from '@/common/decorators/is-optional-but-not-null.decorator';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUrlDto {
  @ApiProperty({
    example: 'https://example.com/some/very/long/path/here',
    description:
      'The destination long URL to shorten. Must include http or https protocol.',
    maxLength: 2048,
  })
  @IsNotEmpty({ message: 'originalUrl is required' })
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'originalUrl must be a valid HTTP or HTTPS URL' },
  )
  @MaxLength(2048, { message: 'originalUrl must not exceed 2048 characters' })
  originalUrl!: string;

  @ApiProperty({
    example: 'my-custom-slug',
    description: 'Optional custom alias for the shortened URL link.',
    minLength: 3,
    maxLength: 20,
    pattern: '^[a-zA-Z0-9-]+$',
    required: false,
  })
  @IsOptionalButNotNull()
  @IsString()
  @MinLength(3, { message: 'customSlug must be at least 3 characters' })
  @MaxLength(20, { message: 'customSlug must not exceed 20 characters' })
  @Matches(/^[a-zA-Z0-9-]+$/, {
    message: 'customSlug may only contain letters, numbers, and hyphens',
  })
  customSlug?: string;

  @ApiProperty({
    example: '2026-12-31T23:59:59.000Z',
    description:
      'Optional expiration date-time in UTC ISO 8601 format. Must be a future date.',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsFutureIsoDate()
  expiresAt?: Date;
}
