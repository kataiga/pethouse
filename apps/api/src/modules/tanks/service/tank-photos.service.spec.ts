import {
  BadRequestException, ConflictException, NotFoundException,
} from '@nestjs/common';
import { EntityRepository } from '@mikro-orm/mysql';
import { StorageService } from '@core/storage/storage.service';
import { User } from '@modules/users/entity/user.entity';
import { TankPhoto } from '../entity/tank-photo.entity';
import { Tank } from '../entity/tank.entity';
import { TankPhotosService } from './tank-photos.service';

describe('TankPhotosService', () => {
  const em = {
    persistAndFlush: jest.fn(),
    flush: jest.fn(),
    removeAndFlush: jest.fn(),
  };
  const photos = {
    create: jest.fn((data: Partial<TankPhoto>) => Object.assign(new TankPhoto(), data)),
    findOne: jest.fn(),
    getEntityManager: () => em,
  };
  const storage = {
    createUploadUrl: jest.fn(),
    headObject: jest.fn(),
    deleteObject: jest.fn(),
    publicUrl: jest.fn((key: string) => `https://cdn/bucket/${key}`),
  };
  const tank = Object.assign(new Tank(), { id: 42 });
  const user = Object.assign(new User(), { id: 1 });
  const key = 'tanks/42/0f8fad5b-d9cb-469f-a165-70867728950e.jpg';
  let service: TankPhotosService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TankPhotosService(
      photos as unknown as EntityRepository<TankPhoto>,
      storage as unknown as StorageService,
    );
  });

  it('prepares an upload under the tank prefix with the extension of the content type', async () => {
    storage.createUploadUrl.mockResolvedValue({
      url: 'https://minio/signed',
      expiresAt: new Date(),
    });

    const prepared = await service.prepareUpload(tank, {
      contentType: 'image/webp',
      sizeBytes: 1000,
    });

    expect(prepared.storageKey).toMatch(/^tanks\/42\/[0-9a-f-]{36}\.webp$/);
    expect(storage.createUploadUrl).toHaveBeenCalledWith(prepared.storageKey, 'image/webp', 1000);
  });

  it('refuses to register a key of another tank', async () => {
    await expect(service.register(tank, user, { storageKey: 'tanks/7/0f8fad5b-d9cb-469f-a165-70867728950e.jpg' }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(storage.headObject).not.toHaveBeenCalled();
  });

  it('refuses a key already registered and a key with nothing uploaded', async () => {
    photos.findOne.mockResolvedValueOnce(new TankPhoto());
    await expect(service.register(tank, user, { storageKey: key })).rejects.toBeInstanceOf(ConflictException);

    photos.findOne.mockResolvedValueOnce(null);
    storage.headObject.mockResolvedValueOnce(null);
    await expect(service.register(tank, user, { storageKey: key })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('registers what the bucket reports, not what the client claims', async () => {
    photos.findOne.mockResolvedValue(null);
    storage.headObject.mockResolvedValue({
      contentType: 'image/jpeg',
      sizeBytes: 123456,
    });

    const photo = await service.register(tank, user, {
      storageKey: key,
      caption: 'Rescape',
      takenAt: '2026-01-01T09:00:00.000Z',
    });

    expect(photo).toMatchObject({
      tank,
      uploadedBy: user,
      storageKey: key,
      contentType: 'image/jpeg',
      sizeBytes: 123456,
      caption: 'Rescape',
    });
    expect(photo.takenAt?.toISOString()).toBe('2026-01-01T09:00:00.000Z');
    expect(em.persistAndFlush).toHaveBeenCalledWith(photo);
  });

  it('deletes the row then the object', async () => {
    const photo = Object.assign(new TankPhoto(), {
      id: 3,
      tank,
      storageKey: key,
    });
    photos.findOne.mockResolvedValue(photo);

    await service.delete(tank, 3);

    expect(em.removeAndFlush).toHaveBeenCalledWith(photo);
    expect(storage.deleteObject).toHaveBeenCalledWith(key);
  });
});
