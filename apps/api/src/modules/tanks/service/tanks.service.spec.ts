import {
  BadRequestException, NotFoundException,
} from '@nestjs/common';
import { TankType } from '@common/enums/tank-type.enum';
import { StorageService } from '@core/storage/storage.service';
import { Household } from '@modules/households/entity/household.entity';
import { TankSubtype } from '../entity/tank-subtype.entity';
import { Tank } from '../entity/tank.entity';
import { TankPhoto } from '../entity/tank-photo.entity';
import { TankRepository } from '../repository/tank.repository';
import { TankPhotosService } from './tank-photos.service';
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
  const photosService = { require: jest.fn() };
  const storage = { publicUrl: jest.fn((key: string) => `https://cdn/bucket/${key}`) };
  const household = Object.assign(new Household(), { id: 7 });
  const planted = Object.assign(new TankSubtype(), {
    id: 3,
    tankType: TankType.AQUARIUM,
    slug: 'planted',
  });
  let service: TanksService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TanksService(
      tanks as unknown as TankRepository,
      subtypesService as unknown as TankSubtypesService,
      photosService as unknown as TankPhotosService,
      storage as unknown as StorageService,
    );
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

  it('sets a cover from the tank\'s own photos and presents its public URL', async () => {
    const photo = Object.assign(new TankPhoto(), {
      id: 9,
      storageKey: 'tanks/1/abc.jpg',
    });
    const tank = Object.assign(new Tank(), {
      id: 1,
      household,
      name: 'Main',
      tankType: TankType.AQUARIUM,
    });
    photosService.require.mockResolvedValueOnce(photo);

    await service.update(tank, { coverPhotoId: 9 });
    expect(tank.coverPhoto).toBe(photo);
    expect(service.present(tank).coverPhoto).toEqual({
      id: 9,
      url: 'https://cdn/bucket/tanks/1/abc.jpg',
    });

    photosService.require.mockRejectedValueOnce(new NotFoundException());
    await expect(service.update(tank, { coverPhotoId: 10 })).rejects.toBeInstanceOf(NotFoundException);

    await service.update(tank, { coverPhotoId: null });
    expect(tank.coverPhoto).toBeNull();
    expect(service.present(tank).coverPhoto).toBeNull();
  });
});
