import { describe, it, expect } from '@jest/globals';

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateUrlDto } from '@/urls/dto/create-url.dto';

describe('CreateUrlDto', () => {
  async function validateDto(data: object) {
    const instance = plainToInstance(CreateUrlDto, data);
    return validate(instance);
  }

  it('should fail when originalUrl is missing', async () => {
    const errors = await validateDto({});
    const fields = errors.map((e) => e.property);
    expect(fields).toContain('originalUrl');
  });

  it('should fail when originalUrl is not a valid URL', async () => {
    const errors = await validateDto({ originalUrl: 'not-a-url' });
    expect(errors).toHaveLength(1);
  });

  it('should fail when originalUrl points to localhost', async () => {
    // Note: @IsUrl() actually PASSES localhost — this is a known quirk
    // The SSRF check happens in the service, not the DTO
    const errors = await validateDto({ originalUrl: 'http://localhost:3000' });
    // This passes DTO validation — service catches it
    expect(errors).toHaveLength(1);
  });

  it('should fail when customSlug contains invalid characters', async () => {
    const errors = await validateDto({
      originalUrl: 'https://github.com',
      customSlug: 'my slug!',
    });
    expect(errors).toHaveLength(1);
  });

  it('should fail when customSlug is too short', async () => {
    const errors = await validateDto({
      originalUrl: 'https://github.com',
      customSlug: 'ab',
    });
    expect(errors).toHaveLength(1);
  });
});
