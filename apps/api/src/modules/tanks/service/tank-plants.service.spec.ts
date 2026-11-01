import { BadRequestException } from '@nestjs/common';
import { EntityRepository } from '@mikro-orm/mysql';
import { todayIsoDate } from '@common/dates';
import { PlantSpecies } from '@modules/plant-species/entity/plant-species.entity';
import { PlantSpeciesService } from '@modules/plant-species/service/plant-species.service';
import { TankPlant } from '../entity/tank-plant.entity';
import { Tank } from '../entity/tank.entity';
import { TankPlantsService } from './tank-plants.service';

describe('TankPlantsService', () => {
  const em = {
    persistAndFlush: jest.fn(),
    flush: jest.fn(),
    removeAndFlush: jest.fn(),
  };
  const entries = {
    create: jest.fn((data: Partial<TankPlant>) => Object.assign(new TankPlant(), data)),
    findOne: jest.fn(),
    getEntityManager: () => em,
  };
  const plantSpeciesService = { findById: jest.fn() };
  const tank = Object.assign(new Tank(), { id: 4 });
  let service: TankPlantsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TankPlantsService(
      entries as unknown as EntityRepository<TankPlant>,
      plantSpeciesService as unknown as PlantSpeciesService,
    );
  });

  it('adds a plant species with today as the default date', async () => {
    const species = Object.assign(new PlantSpecies(), { id: 12 });
    plantSpeciesService.findById.mockResolvedValue(species);

    const entry = await service.add(tank, {
      plantSpeciesId: 12,
      quantity: 3,
    });

    expect(entry).toMatchObject({
      tank,
      species,
      quantity: 3,
      addedAt: todayIsoDate(),
      notes: null,
    });
    expect(em.persistAndFlush).toHaveBeenCalledWith(entry);
  });

  it('refuses an unknown plant species with a 400', async () => {
    plantSpeciesService.findById.mockResolvedValue(null);

    await expect(service.add(tank, {
      plantSpeciesId: 999,
      quantity: 1,
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(em.persistAndFlush).not.toHaveBeenCalled();
  });

  it('refuses a removal before the addition', async () => {
    const entry = Object.assign(new TankPlant(), {
      id: 1,
      tank,
      quantity: 3,
      addedAt: '2026-03-01',
    });
    entries.findOne.mockResolvedValue(entry);

    await expect(service.update(tank, 1, { removedAt: '2026-01-01' })).rejects.toBeInstanceOf(BadRequestException);
    expect(em.flush).not.toHaveBeenCalled();
  });

  it('applies only the provided fields', async () => {
    const entry = Object.assign(new TankPlant(), {
      id: 1,
      tank,
      quantity: 3,
      addedAt: '2026-03-01',
      notes: 'keep',
    });
    entries.findOne.mockResolvedValue(entry);

    await service.update(tank, 1, { quantity: 5 });

    expect(entry).toMatchObject({
      quantity: 5,
      addedAt: '2026-03-01',
      removedAt: null,
      notes: 'keep',
    });
    expect(em.flush).toHaveBeenCalledTimes(1);
  });
});
