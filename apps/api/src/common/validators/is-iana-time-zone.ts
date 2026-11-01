import {
  registerDecorator, ValidationOptions,
} from 'class-validator';

/**
 * Accepts any zone identifier the Node runtime can format dates in: canonical names and the
 * aliases devices still report (`America/Montreal`, `Asia/Calcutta`). `Intl.supportedValuesOf`
 * would reject the aliases, which is why it is not used here.
 */
export function isIanaTimeZone (value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 64) {
    return false;
  }

  try {
    new Intl.DateTimeFormat('en', { timeZone: value });

    return true;
  } catch {
    return false;
  }
}

export function IsIanaTimeZone (options?: ValidationOptions): PropertyDecorator {
  return (target: object, propertyName: string | symbol): void => {
    registerDecorator({
      name: 'isIanaTimeZone',
      target: target.constructor,
      propertyName: String(propertyName),
      options: {
        message: '$property must be an IANA time zone identifier such as Europe/Paris',
        ...options,
      },
      validator: { validate: isIanaTimeZone },
    });
  };
}
