import { EntityRepository } from '@mikro-orm/mysql';
import { TankType } from '@common/enums/tank-type.enum';
import { Household } from '@modules/households/entity/household.entity';
import { Tank } from '@modules/tanks/entity/tank.entity';
import { User } from '@modules/users/entity/user.entity';
import { ParameterDefinition } from '../entity/parameter-definition.entity';
import { TankParameterOverride } from '../entity/tank-parameter-override.entity';
import { ParameterDefinitionsService } from './parameter-definitions.service';
import { ParameterSettingsService } from './parameter-settings.service';
import { TankParametersService } from './tank-parameters.service';

describe('TankParametersService', () => {
  const ph = Object.assign(new ParameterDefinition(), {
    id: 1,
    slug: 'ph',
    name: 'pH',
    isSystem: true,
  });
  const tds = Object.assign(new ParameterDefinition(), {
    id: 2,
    slug: 'tds',
    name: 'TDS',
    isSystem: true,
  });
  const tank = Object.assign(new Tank(), {
    id: 7,
    tankType: TankType.AQUARIUM,
    household: Object.assign(new Household(), { id: 3 }),
  });
  const user = Object.assign(new User(), { id: 5 });
  const em = {
    persistAndFlush: jest.fn(),
    removeAndFlush: jest.fn(),
  };
  const overrides = {
    find: jest.fn(),
    findOne: jest.fn(),
    nativeDelete: jest.fn(),
    create: jest.fn((data: Partial<TankParameterOverride>) => Object.assign(new TankParameterOverride(), data)),
    getEntityManager: () => em,
  };
  const settingsService = { effectiveFor: jest.fn() };
  const definitionsService = { findUsable: jest.fn() };
  let service: TankParametersService;

  beforeEach(() => {
    jest.clearAllMocks();
    settingsService.effectiveFor.mockResolvedValue([
      {
        definition: ph,
        enabled: true,
        displayOrder: 30,
        minThreshold: 6.5,
        maxThreshold: 7.5,
        customised: true,
      },
      {
        definition: tds,
        enabled: false,
        displayOrder: 900,
        minThreshold: null,
        maxThreshold: null,
        customised: false,
      },
    ]);
    service = new TankParametersService(
      overrides as unknown as EntityRepository<TankParameterOverride>,
      settingsService as unknown as ParameterSettingsService,
      definitionsService as unknown as ParameterDefinitionsService,
    );
  });

  it('applies overrides field by field on top of the account layer', async () => {
    overrides.find.mockResolvedValue([
      Object.assign(new TankParameterOverride(), {
        definition: tds,
        enabled: true,
        minThreshold: null,
        maxThreshold: 250,
      }),
      Object.assign(new TankParameterOverride(), {
        definition: ph,
        enabled: null,
        minThreshold: 6.8,
        maxThreshold: null,
      }),
    ]);

    const resolved = await service.resolveFor(tank, user);

    expect(resolved).toEqual([
      expect.objectContaining({
        definition: ph,
        enabled: true,
        minThreshold: 6.8,
        maxThreshold: 7.5,
        source: 'account',
        overridden: true,
      }),
      expect.objectContaining({
        definition: tds,
        enabled: true,
        minThreshold: null,
        maxThreshold: 250,
        source: 'tank',
        overridden: true,
      }),
    ]);
    expect(settingsService.effectiveFor).toHaveBeenCalledWith(user, TankType.AQUARIUM, [3]);
  });

  it('reports the seeded default when neither layer changed anything', async () => {
    overrides.find.mockResolvedValue([]);

    const resolved = await service.resolveFor(tank, user);

    expect(resolved[1]).toMatchObject({
      enabled: false,
      source: 'default',
      overridden: false,
    });
    expect(await service.enabledFor(tank, user)).toHaveLength(1);
  });

  it('removes the row instead of storing an override that says nothing', async () => {
    definitionsService.findUsable.mockResolvedValue(ph);
    const existing = Object.assign(new TankParameterOverride(), {
      tank,
      definition: ph,
      enabled: false,
    });
    overrides.findOne.mockResolvedValue(existing);

    await service.setOverride(tank, 1, {
      enabled: null,
      minThreshold: null,
    });

    expect(em.removeAndFlush).toHaveBeenCalledWith(existing);
    expect(em.persistAndFlush).not.toHaveBeenCalled();
  });

  it('creates the row on first deviation', async () => {
    definitionsService.findUsable.mockResolvedValue(tds);
    overrides.findOne.mockResolvedValue(null);

    await service.setOverride(tank, 2, { enabled: true });

    expect(em.persistAndFlush).toHaveBeenCalledWith(expect.objectContaining({
      definition: tds,
      enabled: true,
      minThreshold: null,
      maxThreshold: null,
    }));
  });
});
