import {
  BadRequestException, NotFoundException,
} from '@nestjs/common';
import { EntityRepository } from '@mikro-orm/mysql';
import { AnimalSpecies } from '@modules/animal-species/entity/animal-species.entity';
import { AnimalSpeciesService } from '@modules/animal-species/service/animal-species.service';
import { TankAnimal } from '../entity/tank-animal.entity';
import { Tank } from '../entity/tank.entity';
import { todayIsoDate } from '@common/dates';
import { TankAnimalsService } from './tank-animals.service';

describe('TankAnimalsService', () => {
  const em = {
    persistAndFlush: jest.fn(),
    flush: jest.fn(),
    removeAndFlush: jest.fn(),
  };
  const entries = {
    create: jest.fn((data: Partial<TankAnimal>) => Object.assign(new TankAnimal(), data)),
    findOne: jest.fn(),
    getEntityManager: () => em,
  };
  const animalSpeciesService = { findById: jest.fn() };
  const tank = Object.assign(new Tank(), { id: 4 });
  let service: TankAnimalsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TankAnimalsService(
      entries as unknown as EntityRepository<TankAnimal>,
      animalSpeciesService as unknown as AnimalSpeciesService,
    );
  });

  it('adds a species with today as the default date', async () => {
    const species = Object.assign(new AnimalSpecies(), { id: 12 });
    animalSpeciesService.findById.mockResolvedValue(species);

    const entry = await service.add(tank, {
      animalSpeciesId: 12,
      quantity: 6,
    });

    expect(entry).toMatchObject({
      tank,
      species,
      quantity: 6,
      addedAt: todayIsoDate(),
      notes: null,
    });
    expect(em.persistAndFlush).toHaveBeenCalledWith(entry);
  });

  it('refuses an unknown species with a 400', async () => {
    animalSpeciesService.findById.mockResolvedValue(null);

    await expect(service.add(tank, {
      animalSpeciesId: 999,
      quantity: 1,
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('marks an entry removed and refuses a removal before the addition', async () => {
    const entry = Object.assign(new TankAnimal(), {
      id: 1,
      tank,
      quantity: 6,
      addedAt: '2026-03-01',
    });
    entries.findOne.mockResolvedValue(entry);

    await service.update(tank, 1, { removedAt: '2026-06-30' });
    expect(entry.removedAt).toBe('2026-06-30');

    await expect(service.update(tank, 1, { removedAt: '2026-01-01' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('answers 404 for an entry of another tank', async () => {
    entries.findOne.mockResolvedValue(null);

    await expect(service.update(tank, 77, { quantity: 2 })).rejects.toBeInstanceOf(NotFoundException);
    expect(entries.findOne).toHaveBeenCalledWith({
      id: 77,
      tank,
    }, expect.anything());
  });
});
