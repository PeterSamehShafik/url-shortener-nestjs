import { IsFutureIsoDate } from '@/common/decorators/is-future-iso-date.decorator';
import { IsOptionalButNotNull } from '@/common/decorators/is-optional-but-not-null.decorator';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateUrlDto {
  @ApiProperty({
    example: true,
    description:
      'Toggle status to temporarily activate or deactivate the redirection route link.',
    required: false,
  })
  @IsOptionalButNotNull()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;

  @ApiProperty({
    example: '2026-12-31T23:59:59.000Z',
    description:
      'Update or clear the expiration timestamp. Pass an ISO date string to update or null to remove the expiration constraint entirely.',
    type: String,
    required: false,
    nullable: true,
  })
  //allows null as remove expiry date
  @IsOptional()
  @IsFutureIsoDate()
  expiresAt?: Date | null;
}
