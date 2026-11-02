import type { Schemas } from '@pethouse/api-client';

type Tank = Schemas['TankResponseDto'];

/** Limits enforced by the API; checked here so a mistake shows on the field, not as a 400. */
export const TANK_LIMITS = {
  name: 80,
  substrate: 120,
  description: 2000,
  volumeLiters: 100_000,
  dimensionCm: 2_000,
} as const;

/** What the person typed, field by field. Numbers stay text until the form is submitted. */
export interface TankFormValues {
  name: string;
  subtypeId: number | null;
  volumeLiters: string;
  widthCm: string;
  heightCm: string;
  depthCm: string;
  substrate: string;
  /** Calendar date, `YYYY-MM-DD`. */
  startedAt: string | null;
  description: string;
}

export type TankFieldError = 'required' | 'tooLong' | 'invalid' | 'tooLarge';

export type TankFormErrors = Partial<Record<keyof TankFormValues, TankFieldError>>;

/** Every optional field is null when left empty, so an edit can clear it. */
export interface TankFields {
  name: string;
  subtypeId: number | null;
  volumeLiters: number | null;
  widthCm: number | null;
  heightCm: number | null;
  depthCm: number | null;
  substrate: string | null;
  startedAt: string | null;
  description: string | null;
}

export interface TankFormValid {
  ok: true;
  fields: TankFields;
}

export interface TankFormInvalid {
  ok: false;
  errors: TankFormErrors;
}

export type TankFormResult = TankFormValid | TankFormInvalid;

export const EMPTY_TANK_FORM: TankFormValues = {
  name: '',
  subtypeId: null,
  volumeLiters: '',
  widthCm: '',
  heightCm: '',
  depthCm: '',
  substrate: '',
  startedAt: null,
  description: '',
};

type Parsed = { value: number | null } | { error: TankFieldError };

/** Accepts a decimal comma as well as a point: French keyboards offer the comma. */
export function parseDecimal (text: string, max: number): Parsed {
  const trimmed = text.trim().replace(',', '.');

  if (trimmed === '') {
    return { value: null };
  }

  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return { error: 'invalid' };
  }

  const value = Number(trimmed);

  return value > max ? { error: 'tooLarge' } : { value };
}

/** Litres from inner dimensions in centimetres, to one decimal; null until all three are known. */
export function suggestedVolume (widthCm: string, heightCm: string, depthCm: string): number | null {
  const sides = [widthCm, heightCm, depthCm].map((side) => parseDecimal(side, TANK_LIMITS.dimensionCm));
  const lengths = sides.map((side) => ('value' in side ? side.value : null));

  if (lengths.some((length) => length === null || length === 0)) {
    return null;
  }

  const cubicCm = lengths.reduce<number>((product, length) => product * (length ?? 0), 1);

  return Math.round(cubicCm / 100) / 10;
}

/** A number as the person would type it in their language: `120,5` in French. */
export function formatDecimal (value: number, language: string): string {
  return value.toLocaleString(language, {
    maximumFractionDigits: 2,
    useGrouping: false,
  });
}

function optionalText (text: string): string | null {
  const trimmed = text.trim();

  return trimmed === '' ? null : trimmed;
}

export function validateTankForm (values: TankFormValues): TankFormResult {
  const errors: TankFormErrors = {};
  const name = values.name.trim();

  if (name === '') {
    errors.name = 'required';
  } else if (name.length > TANK_LIMITS.name) {
    errors.name = 'tooLong';
  }

  if (values.substrate.trim().length > TANK_LIMITS.substrate) {
    errors.substrate = 'tooLong';
  }

  if (values.description.trim().length > TANK_LIMITS.description) {
    errors.description = 'tooLong';
  }

  const volumeLiters = parseDecimal(values.volumeLiters, TANK_LIMITS.volumeLiters);
  const widthCm = parseDecimal(values.widthCm, TANK_LIMITS.dimensionCm);
  const heightCm = parseDecimal(values.heightCm, TANK_LIMITS.dimensionCm);
  const depthCm = parseDecimal(values.depthCm, TANK_LIMITS.dimensionCm);
  const numbers: [keyof TankFormValues, Parsed][] = [
    ['volumeLiters', volumeLiters],
    ['widthCm', widthCm],
    ['heightCm', heightCm],
    ['depthCm', depthCm],
  ];

  for (const [field, parsed] of numbers) {
    if ('error' in parsed) {
      errors[field] = parsed.error;
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      errors,
    };
  }

  const valueOf = (parsed: Parsed): number | null => ('value' in parsed ? parsed.value : null);

  return {
    ok: true,
    fields: {
      name,
      subtypeId: values.subtypeId,
      volumeLiters: valueOf(volumeLiters),
      widthCm: valueOf(widthCm),
      heightCm: valueOf(heightCm),
      depthCm: valueOf(depthCm),
      substrate: optionalText(values.substrate),
      startedAt: values.startedAt,
      description: optionalText(values.description),
    },
  };
}

/** A creation sends only what was filled in. */
export function createBody (
  tankType: Schemas['CreateTankDto']['tankType'],
  fields: TankFields,
): Schemas['CreateTankDto'] {
  const body: Schemas['CreateTankDto'] = {
    name: fields.name,
    tankType,
  };

  if (fields.subtypeId !== null) {
    body.subtypeId = fields.subtypeId;
  }
  if (fields.volumeLiters !== null) {
    body.volumeLiters = fields.volumeLiters;
  }
  if (fields.widthCm !== null) {
    body.widthCm = fields.widthCm;
  }
  if (fields.heightCm !== null) {
    body.heightCm = fields.heightCm;
  }
  if (fields.depthCm !== null) {
    body.depthCm = fields.depthCm;
  }
  if (fields.substrate !== null) {
    body.substrate = fields.substrate;
  }
  if (fields.startedAt !== null) {
    body.startedAt = fields.startedAt;
  }
  if (fields.description !== null) {
    body.description = fields.description;
  }

  return body;
}

/** The form pre-filled from an existing tank, for editing. */
export function valuesFromTank (tank: Tank, language: string): TankFormValues {
  const text = (value: number | null): string => (value === null ? '' : formatDecimal(value, language));

  return {
    name: tank.name,
    subtypeId: tank.subtype?.id ?? null,
    volumeLiters: text(tank.volumeLiters),
    widthCm: text(tank.widthCm),
    heightCm: text(tank.heightCm),
    depthCm: text(tank.depthCm),
    substrate: tank.substrate ?? '',
    startedAt: tank.startedAt,
    description: tank.description ?? '',
  };
}
