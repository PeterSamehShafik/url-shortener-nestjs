import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { IsBoolean } from 'class-validator';
import { describe, it, expect } from '@jest/globals';
import { IsOptionalButNotNull } from './is-optional-but-not-null.decorator';
class TestDto {
  @IsOptionalButNotNull()
  @IsBoolean({ message: 'value must be a boolean' })
  value?: boolean;
}

async function validateDto(value: unknown) {
  const instance = plainToInstance(TestDto, { value });
  return validate(instance);
}

describe('IsOptionalButNotNull', () => {
  it('should pass when field is undefined (not provided)', async () => {
    const errors = await validateDto(undefined);
    expect(errors).toHaveLength(0);
  });

  it('should fail when field is explicitly null', async () => {
    const errors = await validateDto(null);
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('isBoolean');
  });

  it('should pass when field is a valid value matching the validator', async () => {
    const errors = await validateDto(true);
    expect(errors).toHaveLength(0);
  });

  it('should fail when field is present but invalid', async () => {
    const errors = await validateDto('not-a-boolean');
    expect(errors).toHaveLength(1);
  });
});
