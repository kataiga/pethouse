import {
  ConflictException, NotFoundException,
} from '@nestjs/common';
import { TankType } from '@common/enums/tank-type.enum';
import { Household } from '@modules/households/entity/household.entity';
import { TankSubtype } from '../entity/tank-subtype.entity';
import { TankSubtypeRepository } from '../repository/tank-subtype.repository';
import { TankSubtypesService } from './tank-subtypes.service';

describe('TankSubtypesService', () => {
  const em = {
    persistAndFlush: jest.fn(),
    removeAndFlush: jest.fn(),
  };
  const subtypes = {
    create: jest.fn((data: Partial<TankSubtype>) => Object.assign(new TankSubtype(), data)),
    findOne: jest.fn(),
    getEntityManager: () => em,
  };
  const household = Object.assign(new Household(), { id: 7 });
  let service: TankSubtypesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TankSubtypesService(subtypes as unknown as TankSubtypeRepository);
  });

  it('derives the slug from the name and scopes the subtype to the household', async () => {
    subtypes.findOne.mockResolvedValue(null);

    const subtype = await service.createCustom(household, {
      tankType: TankType.AQUARIUM,
      name: '  Eau noire  ',
    });

    expect(subtype).toMatchObject({
      slug: 'eau-noire',
      name: 'Eau noire',
      isSystem: false,
      household,
    });
    expect(em.persistAndFlush).toHaveBeenCalledWith(subtype);
  });

  it('refuses a slug that collides with a system or own subtype of the same type', async () => {
    subtypes.findOne.mockResolvedValue(Object.assign(new TankSubtype(), { name: 'Planted' }));

    await expect(service.createCustom(household, {
      tankType: TankType.AQUARIUM,
      name: 'planted',
    })).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuses a name with nothing to slug', async () => {
    await expect(service.createCustom(household, {
      tankType: TankType.AQUARIUM,
      name: '???',
    })).rejects.toBeInstanceOf(ConflictException);
    expect(subtypes.findOne).not.toHaveBeenCalled();
  });

  it('only deletes a custom subtype of the household', async () => {
    subtypes.findOne.mockResolvedValue(null);

    await expect(service.deleteCustom(household, 1)).rejects.toBeInstanceOf(NotFoundException);
    expect(subtypes.findOne).toHaveBeenCalledWith({
      id: 1,
      household,
      isSystem: false,
    });
  });
});
