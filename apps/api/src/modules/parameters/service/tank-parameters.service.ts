import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { EntityRepository } from '@mikro-orm/mysql';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Tank } from '@modules/tanks/entity/tank.entity';
import { User } from '@modules/users/entity/user.entity';
import { ResolvedParameter } from '../dto/resolved-parameter-response.dto';
import { TankParameterOverrideInputDto } from '../dto/tank-parameter-override-input.dto';
import { Measurement } from '../entity/measurement.entity';
import { ParameterDefinition } from '../entity/parameter-definition.entity';
import { TankParameterOverride } from '../entity/tank-parameter-override.entity';
import { MeasurementRepository } from '../repository/measurement.repository';
import { ParameterDefinitionsService } from './parameter-definitions.service';
import {
  assertThresholds, ParameterSettingsService,
} from './parameter-settings.service';

/**
 * The single place that merges the two layers. Clients only ever see the result.
 * Resolution: seeded default -> the caller's account setting for the tank type -> the tank's
 * override; each override field is applied only when it is not null.
 */
@Injectable()
export class TankParametersService {
  constructor (
    @InjectRepository(TankParameterOverride)
    private readonly overrides: EntityRepository<TankParameterOverride>,
    @InjectRepository(Measurement)
    private readonly measurements: MeasurementRepository,
    private readonly settingsService: ParameterSettingsService,
    private readonly definitionsService: ParameterDefinitionsService,
  ) {}

  async resolveFor (tank: Tank, user: User): Promise<ResolvedParameter[]> {
    const [effective, overrideRows, latest] = await Promise.all([
      this.settingsService.effectiveFor(user, tank.tankType, [tank.household.id]),
      this.overrides.find({ tank }, { populate: ['definition'] }),
      this.measurements.latestPerDefinition(tank.id),
    ]);
    const overrides = new Map(overrideRows.map((row) => [row.definition.id, row]));

    return effective.map((setting) => {
      const override = overrides.get(setting.definition.id);
      const enabledFromTank = override?.enabled ?? null;

      return {
        definition: setting.definition,
        enabled: enabledFromTank ?? setting.enabled,
        displayOrder: setting.displayOrder,
        minThreshold: override?.minThreshold ?? setting.minThreshold,
        maxThreshold: override?.maxThreshold ?? setting.maxThreshold,
        source: enabledFromTank !== null ? 'tank' : setting.customised ? 'account' : 'default',
        overridden: override !== undefined,
        latest: latest.get(setting.definition.id) ?? null,
      };
    });
  }

  /** The resolved set restricted to enabled parameters: what the tank actually tracks. */
  async enabledFor (tank: Tank, user: User): Promise<ResolvedParameter[]> {
    return (await this.resolveFor(tank, user)).filter((parameter) => parameter.enabled);
  }

  /** Upserts the override. All fields null removes the row, which is the same as inheriting. */
  async setOverride (tank: Tank, definitionId: number, dto: TankParameterOverrideInputDto): Promise<void> {
    const definition = await this.requireDefinition(tank, definitionId);
    assertThresholds(dto.minThreshold, dto.maxThreshold);
    const em = this.overrides.getEntityManager();
    const existing = await this.overrides.findOne({
      tank,
      definition,
    });
    const wanted = {
      enabled: dto.enabled ?? null,
      minThreshold: dto.minThreshold ?? null,
      maxThreshold: dto.maxThreshold ?? null,
    };
    const empty = wanted.enabled === null && wanted.minThreshold === null && wanted.maxThreshold === null;

    if (empty) {
      if (existing) {
        await em.removeAndFlush(existing);
      }

      return;
    }

    const row = existing ?? this.overrides.create({
      tank,
      definition,
    });
    Object.assign(row, wanted);
    await em.persistAndFlush(row);
  }

  /** Back to the account setting. Idempotent. */
  async clearOverride (tank: Tank, definitionId: number): Promise<void> {
    const definition = await this.requireDefinition(tank, definitionId);
    await this.overrides.nativeDelete({
      tank,
      definition,
    });
  }

  private async requireDefinition (tank: Tank, definitionId: number): Promise<ParameterDefinition> {
    const definition = await this.definitionsService.findUsable(definitionId, tank.household);

    if (!definition) {
      throw new NotFoundException('Parameter definition not found');
    }

    return definition;
  }

  /** A parameter the tank can see, enabled or not: history stays readable after a parameter is disabled. */
  async requireKnown (tank: Tank, user: User, definitionId: number): Promise<ResolvedParameter> {
    const resolved = (await this.resolveFor(tank, user)).find((parameter) => parameter.definition.id === definitionId);

    if (!resolved) {
      throw new NotFoundException('Parameter definition not found');
    }

    return resolved;
  }

  /** Guard for callers that need a definition the tank can record values for. */
  async requireEnabled (tank: Tank, user: User, definitionId: number): Promise<ResolvedParameter> {
    const resolved = await this.requireKnown(tank, user, definitionId);

    if (!resolved.enabled) {
      throw new BadRequestException('This parameter is not tracked on this tank');
    }

    return resolved;
  }
}
