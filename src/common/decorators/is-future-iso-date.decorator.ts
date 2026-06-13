import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  isISO8601,
} from 'class-validator';
import { Transform } from 'class-transformer';

const STRICT_UTC_ISO_8601_REGEX =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z)?$/;

export function IsFutureIsoDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    Transform(({ value }: { value: unknown }) => {
      if (typeof value === 'string' && STRICT_UTC_ISO_8601_REGEX.test(value)) {
        if (!isISO8601(value, { strict: true })) return value;
        const date = new Date(value);
        return isNaN(date.getTime()) ? value : date;
      }
      return value;
    })(object, propertyName);

    registerDecorator({
      name: 'isFutureIsoDate',
      target: object.constructor,
      propertyName,
      options: {
        ...validationOptions,
      },
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const targetObject = args.object as Record<string, unknown>;
          const errorKey = `__errorType_${propertyName}`;

          if (!(value instanceof Date) || isNaN(value.getTime())) {
            targetObject[errorKey] = 'INVALID_FORMAT';
            return false;
          }

          if (value <= new Date()) {
            targetObject[errorKey] = 'PAST_DATE';
            return false;
          }

          return true;
        },
        defaultMessage(args: ValidationArguments): string {
          const targetObject = args.object as Record<string, unknown>;
          const errorType = targetObject[`__errorType_${args.property}`];

          if (errorType === 'INVALID_FORMAT') {
            return `${args.property} must be a valid date in ISO 8601 format (e.g., YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)`;
          }

          if (errorType === 'PAST_DATE') {
            return `${args.property} must be a future date.`;
          }

          // Fallback generic message
          return `${args.property} must be a valid future ISO 8601 date.`;
        },
      },
    });
  };
}
