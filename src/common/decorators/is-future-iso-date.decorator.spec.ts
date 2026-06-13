import { describe, it, expect } from '@jest/globals';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { IsOptional } from 'class-validator';
import { IsFutureIsoDate } from '@/common/decorators/is-future-iso-date.decorator';

class TestDto {
  @IsOptional()
  @IsFutureIsoDate()
  expiresAt?: Date;
}

function futureDateIso(daysFromNow = 30): string {
  const date = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  return date.toISOString();
}

async function validateDto(value: unknown) {
  const instance = plainToInstance(TestDto, { expiresAt: value });
  return validate(instance);
}

describe('IsFutureIsoDate', () => {
  it('should pass for a valid future full ISO string', async () => {
    const errors = await validateDto(futureDateIso());
    expect(errors).toHaveLength(0);
  });

  it('should pass for a valid future date-only ISO string', async () => {
    const errors = await validateDto('2099-12-31');
    expect(errors).toHaveLength(0);
  });

  it('should pass when field is undefined (optional)', async () => {
    const errors = await validateDto(undefined);
    expect(errors).toHaveLength(0);
  });

  it('should fail for a past date', async () => {
    const errors = await validateDto('2020-01-01T00:00:00.000Z');
    expect(errors).toHaveLength(1);
  });

  it('should fail for non-padded date format', async () => {
    const errors = await validateDto('2028-5-5');
    expect(errors).toHaveLength(1);
  });

  it('should fail for datetime without Z suffix', async () => {
    const errors = await validateDto('2028-05-05T00:00:00');
    expect(errors).toHaveLength(1);
  });

  it('should fail for a plain string', async () => {
    const errors = await validateDto('not-a-date');
    expect(errors).toHaveLength(1);
  });

  it('should fail for a number timestamp', async () => {
    const errors = await validateDto(1893456000000);
    expect(errors).toHaveLength(1);
  });
  it('should fail for a invalid calendar ', async () => {
    const errors = await validateDto('2027-02-30T00:00:00.000Z');
    expect(errors).toHaveLength(1);
  });
});
