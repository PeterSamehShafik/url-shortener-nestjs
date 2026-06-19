import { ValidateIf } from 'class-validator';

export function IsOptionalButNotNull() {
  return ValidateIf((_, value) => value !== undefined);
}
