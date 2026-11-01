import { BadRequestException } from '@nestjs/common';
import { EntityRepository } from '@mikro-orm/mysql';
import { TankType } from '@common/enums/tank-type.enum';
import { User } from '@modules/users/entity/user.entity';
import { ParameterDefinition } from '../entity/parameter-definition.entity';
import { UserParameterSetting } from '../entity/user-parameter-setting.entity';
import { ParameterDefinitionsService } from './parameter-definitions.service';
import {
  ParameterSettingsService, seededDefault,
} from './parameter-settings.service';

function definition (id: number, slug: string, isSystem = true): ParameterDefinition {
  return Object.assign(new ParameterDefinition(), {
    id,
    slug,
    name: slug,
    isSystem,
  });
}

describe('seededDefault', () => {
  it('reads the seed for a system definition and a tank type', () => {
    expect(seededDefault(definition(1, 'ph'), TankType.AQUARIUM)).toMatchObject({
      enabled: true,
      displayOrder: 30,
      minThreshold: 6.5,
      maxThreshold: 7.5,
      customised: false,
    });
  });

  it('is disabled for a type the seed does not mention, and for a custom definition', () => {
    expect(seededDefault(definition(1, 'kh'), TankType.TERRARIUM).enabled).toBe(false);
    expect(seededDefault(definition(9, 'redox', false), TankType.AQUARIUM)).toMatchObject({
      enabled: false,
      minThreshold: null,
    });
  });
});

describe('ParameterSettingsService', () => {
  const ph = definition(1, 'ph');
  const kh = definition(2, 'kh');
  const user = Object.assign(new User(), { id: 5 });
  const em = {
    persist: jest.fn(),
    flush: jest.fn(),
  };
  const settings = {
    find: jest.fn(),
    create: jest.fn((data: Partial<UserParameterSetting>) => Object.assign(new UserParameterSetting(), data)),
    getEntityManager: () => em,
  };
  const definitions = { listVisible: jest.fn() };
  let service: ParameterSettingsService;

  beforeEach(() => {
    jest.clearAllMocks();
    definitions.listVisible.mockResolvedValue([ph, kh]);
    settings.find.mockResolvedValue([]);
    service = new ParameterSettingsService(
      settings as unknown as EntityRepository<UserParameterSetting>,
      definitions as unknown as ParameterDefinitionsService,
    );
  });

  it('returns the seeded defaults when the user never changed anything', async () => {
    const effective = await service.effectiveFor(user, TankType.AQUARIUM, [1]);

    expect(effective.map((s) => [s.definition.slug, s.enabled, s.customised])).toEqual([
      ['ph', true, false],
      ['kh', true, false],
    ]);
  });

  it('writes a row only for the definitions listed, starting from their defaults', async () => {
    await service.update(user, TankType.AQUARIUM, [1], [{
      parameterDefinitionId: 2,
      enabled: false,
    }]);

    expect(settings.create).toHaveBeenCalledTimes(1);
    expect(em.persist).toHaveBeenCalledWith(expect.objectContaining({
      definition: kh,
      enabled: false,
      displayOrder: 40,
      minThreshold: 3,
      maxThreshold: 10,
    }));
    expect(em.flush).toHaveBeenCalledTimes(1);
  });

  it('rejects an unknown definition and inverted thresholds', async () => {
    await expect(service.update(user, TankType.AQUARIUM, [1], [{
      parameterDefinitionId: 99,
      enabled: true,
    }])).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.update(user, TankType.AQUARIUM, [1], [{
      parameterDefinitionId: 1,
      enabled: true,
      minThreshold: 8,
      maxThreshold: 6,
    }])).rejects.toBeInstanceOf(BadRequestException);
  });
});
