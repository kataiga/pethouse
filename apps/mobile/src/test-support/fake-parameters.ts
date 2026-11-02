import type { Schemas } from '@pethouse/api-client';
import {
  error, type Fields, json, number, text,
} from './fake-http';

type TankType = Schemas['TankResponseDto']['tankType'];

type Bucket = 'hour' | 'day' | 'week';

const TANK_TYPES: readonly TankType[] = ['AQUARIUM', 'TERRARIUM', 'PALUDARIUM'];

const DAY_MS = 86_400_000;

interface FakeDefinition {
  id: number;
  slug: string;
  name: string;
  unit: string;
  decimals: number;
  /** Null for a seeded one. */
  householdId: number | null;
}

interface Layer {
  enabled: boolean;
  displayOrder: number;
  min: number | null;
  max: number | null;
}

interface Override {
  enabled: boolean | null;
  min: number | null;
  max: number | null;
}

export interface FakeMeasurement {
  id: number;
  tankId: number;
  definitionId: number;
  value: number;
  measuredAt: string;
  recordedBy: number;
  note: string | null;
}

/** What the parameter server needs from the rest of the fake API. */
export interface ParameterHost {
  tank (tankId: number): { tankType: TankType;
    householdId: number } | null;
  isMember (householdId: number, userId: number): boolean;
  displayName (userId: number): string;
  nextId (): number;
}

/** A few seeded definitions with per-type defaults, enough to exercise every rule. */
interface SeededDefinition extends Omit<FakeDefinition, 'id' | 'householdId'> {
  defaults: Partial<Record<TankType, Layer>>;
}

const SEEDED: readonly SeededDefinition[] = [
  {
    slug: 'temperature',
    name: 'Temperature',
    unit: '°C',
    decimals: 1,
    defaults: {
      AQUARIUM: {
        enabled: true,
        displayOrder: 10,
        min: 22,
        max: 28,
      },
      TERRARIUM: {
        enabled: true,
        displayOrder: 10,
        min: 24,
        max: 32,
      },
    },
  },
  {
    slug: 'ph',
    name: 'pH',
    unit: '',
    decimals: 1,
    defaults: {
      AQUARIUM: {
        enabled: true,
        displayOrder: 30,
        min: 6.5,
        max: 7.5,
      },
    },
  },
  {
    slug: 'no3',
    name: 'Nitrate',
    unit: 'mg/L',
    decimals: 0,
    defaults: {
      AQUARIUM: {
        enabled: true,
        displayOrder: 40,
        min: null,
        max: 25,
      },
    },
  },
  {
    slug: 'tds',
    name: 'TDS',
    unit: 'ppm',
    decimals: 0,
    defaults: {},
  },
  {
    slug: 'humidity',
    name: 'Humidity',
    unit: '%',
    decimals: 0,
    defaults: {
      TERRARIUM: {
        enabled: true,
        displayOrder: 20,
        min: 40,
        max: 80,
      },
    },
  },
];

function bucketStart (time: number, bucket: Bucket): number {
  const date = new Date(time);

  if (bucket === 'hour') {
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours());
  }

  const day = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

  // Weeks start on Monday, as in the API.
  return bucket === 'day' ? day : day - ((date.getUTCDay() + 6) % 7) * DAY_MS;
}

function isTankType (value: string): value is TankType {
  return TANK_TYPES.some((type) => type === value);
}

/**
 * Parameters, settings, per-tank overrides and readings, resolved like the API: seeded default,
 * then the caller's account setting for the tank type, then the tank's override field by field.
 */
export class FakeParameters {
  readonly definitions: FakeDefinition[] = [];

  readonly measurements: FakeMeasurement[] = [];

  /** `${userId}:${tankType}:${definitionId}` → the account layer. */
  readonly settings = new Map<string, Layer>();

  /** `${tankId}:${definitionId}` → the tank layer. */
  readonly overrides = new Map<string, Override>();

  private readonly defaults = new Map<string, Layer>();

  constructor (private readonly host: ParameterHost) {}

  reset (): void {
    this.definitions.length = 0;
    this.measurements.length = 0;
    this.settings.clear();
    this.overrides.clear();
    this.defaults.clear();
    for (const { defaults, ...definition } of SEEDED) {
      const id = this.host.nextId();
      this.definitions.push({
        ...definition,
        id,
        householdId: null,
      });
      for (const type of TANK_TYPES) {
        const layer = defaults[type];

        if (layer) {
          this.defaults.set(`${type}:${id}`, layer);
        }
      }
    }
  }

  definition (slug: string): FakeDefinition {
    const found = this.definitions.find((candidate) => candidate.slug === slug);

    if (!found) {
      throw new Error(`No parameter ${slug}`);
    }

    return found;
  }

  addMeasurement (tankId: number, slug: string, value: number, measuredAt: Date, recordedBy: number): FakeMeasurement {
    const measurement: FakeMeasurement = {
      id: this.host.nextId(),
      tankId,
      definitionId: this.definition(slug).id,
      value,
      measuredAt: measuredAt.toISOString(),
      recordedBy,
      note: null,
    };
    this.measurements.push(measurement);

    return measurement;
  }

  route (method: string, path: string, query: URLSearchParams, fields: Fields, userId: number): Response | null {
    if (method === 'GET' && path === '/api/parameter-definitions') {
      return json(200, this.visibleTo(userId).map((definition) => this.definitionView(definition)));
    }

    const settings = /^\/api\/users\/me\/parameter-settings\/([A-Z]+)$/.exec(path);

    if (settings) {
      const tankType = settings[1] ?? '';

      if (!isTankType(tankType)) {
        return error(400, 'Unknown tank type');
      }

      return method === 'PUT'
        ? this.saveSettings(userId, tankType, fields)
        : json(200, this.settingsView(userId, tankType));
    }

    const tankPath = /^\/api\/tanks\/(\d+)\/(parameters|measurements)(?:\/(history|\d+))?$/.exec(path);

    if (!tankPath) {
      return null;
    }

    const tankId = Number(tankPath[1]);
    const tank = this.host.tank(tankId);

    if (!tank || !this.host.isMember(tank.householdId, userId)) {
      return error(404, 'Tank not found');
    }

    const context = {
      tankId,
      ...tank,
      userId,
    };

    return tankPath[2] === 'parameters'
      ? this.routeTankParameters(method, context, tankPath[3] === undefined ? null : Number(tankPath[3]), fields)
      : this.routeMeasurements(method, context, tankPath[3] ?? null, query, fields);
  }

  /** `/parameter-definitions` under a household the caller belongs to. */
  routeHousehold (method: string, householdId: number, rest: string, fields: Fields): Response | null {
    if (rest === '/parameter-definitions' && method === 'POST') {
      const name = text(fields.name)?.trim() ?? '';
      const taken = this.definitions.some((definition) => (definition.householdId === null
        || definition.householdId === householdId) && definition.name.toLowerCase() === name.toLowerCase());

      if (name === '') {
        return error(400, 'Invalid parameter');
      }
      if (taken) {
        return error(409, 'A parameter with this name already exists');
      }

      const definition: FakeDefinition = {
        id: this.host.nextId(),
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        unit: text(fields.unit) ?? '',
        decimals: number(fields.decimals) ?? 0,
        householdId,
      };
      this.definitions.push(definition);

      return json(201, this.definitionView(definition));
    }

    const removal = /^\/parameter-definitions\/(\d+)$/.exec(rest);

    if (removal && method === 'DELETE') {
      const definition = this.definitions.find((candidate) => candidate.id === Number(removal[1])
        && candidate.householdId === householdId);

      if (!definition) {
        return error(404, 'Parameter not found');
      }
      this.definitions.splice(this.definitions.indexOf(definition), 1);
      for (let index = this.measurements.length - 1; index >= 0; index -= 1) {
        if (this.measurements[index]?.definitionId === definition.id) {
          this.measurements.splice(index, 1);
        }
      }

      return json(204);
    }

    return null;
  }

  private visibleTo (userId: number): FakeDefinition[] {
    return this.definitions.filter((definition) => definition.householdId === null
      || this.host.isMember(definition.householdId, userId));
  }

  private accountLayer (
    userId: number,
    tankType: TankType,
    definition: FakeDefinition,
  ): Layer & { customised: boolean } {
    const stored = this.settings.get(`${userId}:${tankType}:${definition.id}`);
    const fallback = this.defaults.get(`${tankType}:${definition.id}`) ?? {
      enabled: false,
      displayOrder: 900 + definition.id,
      min: null,
      max: null,
    };

    return {
      ...(stored ?? fallback),
      customised: stored !== undefined,
    };
  }

  private settingsView (userId: number, tankType: TankType): Schemas['ParameterSettingResponseDto'][] {
    return this.visibleTo(userId)
      .map((definition) => ({
        definition,
        layer: this.accountLayer(userId, tankType, definition),
      }))
      .sort((a, b) => a.layer.displayOrder - b.layer.displayOrder)
      .map(({ definition, layer }) => ({
        definition: this.definitionView(definition),
        enabled: layer.enabled,
        displayOrder: layer.displayOrder,
        minThreshold: layer.min,
        maxThreshold: layer.max,
        customised: layer.customised,
      }));
  }

  private saveSettings (userId: number, tankType: TankType, fields: Fields): Response {
    const rows = Array.isArray(fields.settings) ? fields.settings : [];

    for (const row of rows) {
      const input: Fields = typeof row === 'object' && row !== null ? Object.fromEntries(Object.entries(row)) : {};
      const definitionId = number(input.parameterDefinitionId);
      const definition = this.visibleTo(userId).find((candidate) => candidate.id === definitionId);

      if (!definition) {
        return error(400, 'Unknown parameter definition');
      }

      const current = this.accountLayer(userId, tankType, definition);
      const min = 'minThreshold' in input ? number(input.minThreshold) : current.min;
      const max = 'maxThreshold' in input ? number(input.maxThreshold) : current.max;

      if (min !== null && max !== null && min > max) {
        return error(400, 'minThreshold cannot be greater than maxThreshold');
      }
      this.settings.set(`${userId}:${tankType}:${definition.id}`, {
        enabled: input.enabled === true,
        displayOrder: number(input.displayOrder) ?? current.displayOrder,
        min,
        max,
      });
    }

    return json(200, this.settingsView(userId, tankType));
  }

  private resolved (context: { tankId: number;
    tankType: TankType;
    userId: number }): Schemas['ResolvedParameterResponseDto'][] {
    return this.visibleTo(context.userId)
      .map((definition) => {
        const account = this.accountLayer(context.userId, context.tankType, definition);
        const override = this.overrides.get(`${context.tankId}:${definition.id}`) ?? null;
        const latest = this.measurements
          .filter((measurement) => measurement.tankId === context.tankId && measurement.definitionId === definition.id)
          .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))[0];

        return {
          definition: this.definitionView(definition),
          enabled: override?.enabled ?? account.enabled,
          displayOrder: account.displayOrder,
          minThreshold: override?.min ?? account.min,
          maxThreshold: override?.max ?? account.max,
          source: override?.enabled !== null && override?.enabled !== undefined
            ? 'tank' as const
            : account.customised ? 'account' as const : 'default' as const,
          overridden: override !== null,
          account: {
            enabled: account.enabled,
            minThreshold: account.min,
            maxThreshold: account.max,
          },
          override: override === null ? null : {
            enabled: override.enabled,
            minThreshold: override.min,
            maxThreshold: override.max,
          },
          latest: latest ? {
            value: latest.value,
            measuredAt: latest.measuredAt,
          } : null,
        };
      })
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  private routeTankParameters (
    method: string,
    context: { tankId: number;
      tankType: TankType;
      userId: number },
    definitionId: number | null,
    fields: Fields,
  ): Response {
    if (definitionId === null) {
      return json(200, this.resolved(context));
    }

    if (!this.visibleTo(context.userId).some((definition) => definition.id === definitionId)) {
      return error(404, 'Parameter not found');
    }

    const key = `${context.tankId}:${definitionId}`;

    if (method === 'DELETE') {
      this.overrides.delete(key);

      return json(204);
    }

    const wanted: Override = {
      enabled: typeof fields.enabled === 'boolean' ? fields.enabled : null,
      min: number(fields.minThreshold),
      max: number(fields.maxThreshold),
    };

    if (wanted.enabled === null && wanted.min === null && wanted.max === null) {
      this.overrides.delete(key);
    } else {
      this.overrides.set(key, wanted);
    }

    return json(200, this.resolved(context));
  }

  private routeMeasurements (
    method: string,
    context: { tankId: number;
      tankType: TankType;
      userId: number },
    rest: string | null,
    query: URLSearchParams,
    fields: Fields,
  ): Response {
    if (rest === 'history') {
      return this.history(context, query);
    }

    if (rest === null && method === 'POST') {
      const definitionId = number(fields.parameterDefinitionId);
      const parameter = this.resolved(context).find((candidate) => candidate.definition.id === definitionId);
      const value = number(fields.value);

      if (!parameter || !parameter.enabled || value === null) {
        return error(400, 'This tank does not track this parameter');
      }

      const measurement: FakeMeasurement = {
        id: this.host.nextId(),
        tankId: context.tankId,
        definitionId: parameter.definition.id,
        value,
        measuredAt: text(fields.measuredAt) ?? new Date().toISOString(),
        recordedBy: context.userId,
        note: text(fields.note),
      };
      this.measurements.push(measurement);

      return json(201, this.measurementView(measurement));
    }

    if (rest === null) {
      const definitionId = query.get('parameterDefinitionId');
      const page = Number(query.get('page') ?? 1);
      const limit = Number(query.get('limit') ?? 20);
      const matches = this.measurements
        .filter((measurement) => measurement.tankId === context.tankId)
        .filter((measurement) => definitionId === null || measurement.definitionId === Number(definitionId))
        .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt) || b.id - a.id);

      return json(200, {
        data: matches.slice((page - 1) * limit, page * limit).map((measurement) => this.measurementView(measurement)),
        total: matches.length,
        page,
        limit,
      });
    }

    const measurement = this.measurements.find((candidate) => candidate.id === Number(rest)
      && candidate.tankId === context.tankId);

    if (!measurement) {
      return error(404, 'Measurement not found');
    }

    if (method === 'DELETE') {
      this.measurements.splice(this.measurements.indexOf(measurement), 1);

      return json(204);
    }

    measurement.value = number(fields.value) ?? measurement.value;
    if ('note' in fields) {
      measurement.note = text(fields.note);
    }

    return json(200, this.measurementView(measurement));
  }

  private history (context: { tankId: number;
    tankType: TankType;
    userId: number }, query: URLSearchParams): Response {
    const definitionId = Number(query.get('parameterDefinitionId'));
    const parameter = this.resolved(context).find((candidate) => candidate.definition.id === definitionId);

    if (!parameter) {
      return error(404, 'Parameter not found');
    }

    const to = Date.parse(query.get('to') ?? new Date().toISOString());
    const from = Date.parse(query.get('from') ?? new Date(to - 30 * DAY_MS).toISOString());
    const bucketParam = query.get('bucket');
    const bucket: Bucket = bucketParam === 'hour' || bucketParam === 'week' ? bucketParam : 'day';
    const groups = new Map<number, FakeMeasurement[]>();

    for (const measurement of this.measurements) {
      const time = Date.parse(measurement.measuredAt);

      const inRange = time >= from && time <= to;

      if (measurement.tankId === context.tankId && measurement.definitionId === definitionId && inRange) {
        const start = bucketStart(time, bucket);
        groups.set(start, [...(groups.get(start) ?? []), measurement]);
      }
    }

    return json(200, {
      definition: parameter.definition,
      bucket,
      from: new Date(from).toISOString(),
      to: new Date(to).toISOString(),
      minThreshold: parameter.minThreshold,
      maxThreshold: parameter.maxThreshold,
      points: [...groups.entries()].sort(([a], [b]) => a - b).map(([start, readings]) => {
        const values = readings.map((reading) => reading.value);
        const last = [...readings].sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))[0];

        return {
          bucketStart: new Date(start).toISOString(),
          count: readings.length,
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((sum, value) => sum + value, 0) / values.length,
          last: last?.value ?? 0,
        };
      }),
    });
  }

  private definitionView (definition: FakeDefinition): Schemas['ParameterDefinitionResponseDto'] {
    return {
      id: definition.id,
      slug: definition.slug,
      name: definition.name,
      unit: definition.unit,
      decimals: definition.decimals,
      isSystem: definition.householdId === null,
    };
  }

  private measurementView (measurement: FakeMeasurement): Schemas['MeasurementResponseDto'] {
    const definition = this.definitions.find((candidate) => candidate.id === measurement.definitionId);

    return {
      id: measurement.id,
      definition: definition ? this.definitionView(definition) : {
        id: measurement.definitionId,
        slug: '',
        name: '',
        unit: '',
        decimals: 0,
        isSystem: true,
      },
      value: measurement.value,
      measuredAt: measurement.measuredAt,
      recordedBy: {
        id: measurement.recordedBy,
        displayName: this.host.displayName(measurement.recordedBy),
      },
      note: measurement.note,
    };
  }
}
