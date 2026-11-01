import {
  BadRequestException, Injectable,
} from '@nestjs/common';
import { EntityRepository } from '@mikro-orm/mysql';
import { InjectRepository } from '@mikro-orm/nestjs';
import { TankType } from '@common/enums/tank-type.enum';
import { User } from '@modules/users/entity/user.entity';
import { SYSTEM_PARAMETER_DEFINITIONS } from '../../../seeders/data/system-parameter-definitions';
import { ParameterSettingInputDto } from '../dto/parameter-setting-input.dto';
import { EffectiveSetting } from '../dto/parameter-setting-response.dto';
import { ParameterDefinition } from '../entity/parameter-definition.entity';
import { UserParameterSetting } from '../entity/user-parameter-setting.entity';
import { ParameterDefinitionsService } from './parameter-definitions.service';

/** Position given to a definition that neither the seed nor the user ordered: after everything else. */
const UNORDERED = 900;

export function assertThresholds (min: number | null | undefined, max: number | null | undefined): void {
  if (min !== null && min !== undefined && max !== null && max !== undefined && min > max) {
    throw new BadRequestException('minThreshold cannot be greater than maxThreshold');
  }
}

/** The seeded default of a system definition for a tank type; disabled when the seed says nothing. */
export function seededDefault (
  definition: ParameterDefinition,
  tankType: TankType,
): Omit<EffectiveSetting, 'definition'> {
  const seed = definition.isSystem
    ? SYSTEM_PARAMETER_DEFINITIONS.find((system) => system.slug === definition.slug)?.defaults[tankType]
    : undefined;

  return {
    enabled: seed?.enabled ?? false,
    displayOrder: seed?.displayOrder ?? UNORDERED,
    minThreshold: seed?.minThreshold ?? null,
    maxThreshold: seed?.maxThreshold ?? null,
    customised: false,
  };
}

/**
 * Account-level defaults, per tank type. Nothing is written until the user changes something, so
 * the seeded defaults keep applying and can evolve with the seed.
 */
@Injectable()
export class ParameterSettingsService {
  constructor (
    @InjectRepository(UserParameterSetting)
    private readonly settings: EntityRepository<UserParameterSetting>,
    private readonly definitionsService: ParameterDefinitionsService,
  ) {}

  /** The stored rows of a user for a tank type, keyed by definition id. */
  async storedFor (user: User, tankType: TankType): Promise<Map<number, UserParameterSetting>> {
    const rows = await this.settings.find({
      user,
      tankType,
    }, { populate: ['definition'] });

    return new Map(rows.map((row) => [row.definition.id, row]));
  }

  /** Defaults merged with the user's rows, for every definition visible to them. */
  async effectiveFor (user: User, tankType: TankType, householdIds: number[]): Promise<EffectiveSetting[]> {
    const [definitions, stored] = await Promise.all([
      this.definitionsService.listVisible(householdIds),
      this.storedFor(user, tankType),
    ]);

    return definitions
      .map((definition) => this.effective(definition, tankType, stored.get(definition.id)))
      .sort((a, b) => a.displayOrder - b.displayOrder || a.definition.name.localeCompare(b.definition.name));
  }

  effective (definition: ParameterDefinition, tankType: TankType, row?: UserParameterSetting): EffectiveSetting {
    if (!row) {
      return {
        definition,
        ...seededDefault(definition, tankType),
      };
    }

    return {
      definition,
      enabled: row.enabled,
      displayOrder: row.displayOrder,
      minThreshold: row.minThreshold ?? null,
      maxThreshold: row.maxThreshold ?? null,
      customised: true,
    };
  }

  /** Upserts the listed settings. A definition the user cannot see is a 400. */
  async update (
    user: User,
    tankType: TankType,
    householdIds: number[],
    inputs: ParameterSettingInputDto[],
  ): Promise<EffectiveSetting[]> {
    const visible = new Map((await this.definitionsService.listVisible(householdIds)).map((d) => [d.id, d]));
    const stored = await this.storedFor(user, tankType);

    for (const input of inputs) {
      const definition = visible.get(input.parameterDefinitionId);

      if (!definition) {
        throw new BadRequestException(`Unknown parameter definition ${input.parameterDefinitionId}`);
      }

      assertThresholds(input.minThreshold, input.maxThreshold);
      const current = stored.get(definition.id);
      const base = current ? this.effective(definition, tankType, current) : this.effective(definition, tankType);
      const row = current ?? this.settings.create({
        user,
        tankType,
        definition,
        enabled: base.enabled,
        displayOrder: base.displayOrder,
      });

      row.enabled = input.enabled;
      row.displayOrder = input.displayOrder ?? base.displayOrder;
      row.minThreshold = input.minThreshold === undefined ? base.minThreshold : input.minThreshold;
      row.maxThreshold = input.maxThreshold === undefined ? base.maxThreshold : input.maxThreshold;
      assertThresholds(row.minThreshold, row.maxThreshold);
      this.settings.getEntityManager().persist(row);
      stored.set(definition.id, row);
    }

    await this.settings.getEntityManager().flush();

    return this.effectiveFor(user, tankType, householdIds);
  }
}
