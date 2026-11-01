import { BadRequestException } from '@nestjs/common';
import { TankType } from '@common/enums/tank-type.enum';
import { Household } from '@modules/households/entity/household.entity';
import { TankSubtype } from '../entity/tank-subtype.entity';
import { Tank } from '../entity/tank.entity';
import { TankRepository } from '../repository/tank.repository';
import { TankSubtypesService } from './tank-subtypes.service';
import { TanksService } from './tanks.service';

describe('TanksService', () => {
  const em = {
    persistAndFlush: jest.fn(),
    flush: jest.fn(),
    removeAndFlush: jest.fn(),
  };
  const tanks = {
    create: jest.fn((data: Partial<Tank>) => Object.assign(new Tank(), data)),
    getEntityManager: () => em,
  };
  const subtypesService = { findUsable: jest.fn() };
  const household = Object.assign(new Household(), { id: 7 });
  const planted = Object.assign(new TankSubtype(), {
    id: 3,
    tankType: TankType.AQUARIUM,
    slug: 'planted',
  });
  let service: TanksService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TanksService(tanks as unknown as TankRepository, subtypesService as unknown as TankSubtypesService);
  });

  it('creates a tank with a matching subtype and null optionals', async () => {
    subtypesService.findUsable.mockResolvedValue(planted);

    const tank = await service.create(household, {
      name: 'Main',
      tankType: TankType.AQUARIUM,
      subtypeId: 3,
      volumeLiters: 120,
    });

    expect(tank).toMatchObject({
      name: 'Main',
      subtype: planted,
      volumeLiters: 120,
      widthCm: null,
      startedAt: null,
    });
    expect(em.persistAndFlush).toHaveBeenCalledWith(tank);
  });

  it('rejects a subtype of another tank type', async () => {
    subtypesService.findUsable.mockResolvedValue(planted);

    await expect(service.create(household, {
      name: 'Gecko',
      tankType: TankType.TERRARIUM,
      subtypeId: 3,
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a subtype the household cannot use', async () => {
    subtypesService.findUsable.mockResolvedValue(null);

    await expect(service.create(household, {
      name: 'Main',
      tankType: TankType.AQUARIUM,
      subtypeId: 99,
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates only the provided fields and lets null clear a value', async () => {
    const tank = Object.assign(new Tank(), {
      household,
      name: 'Main',
      tankType: TankType.AQUARIUM,
      subtype: planted,
      volumeLiters: 120,
      substrate: 'Sand',
    });

    await service.update(tank, {
      subtypeId: null,
      substrate: null,
      heightCm: 45,
    });

    expect(tank).toMatchObject({
      name: 'Main',
      subtype: null,
      volumeLiters: 120,
      substrate: null,
      heightCm: 45,
    });
    expect(em.flush).toHaveBeenCalledTimes(1);
  });
});
