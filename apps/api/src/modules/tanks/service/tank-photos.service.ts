import { randomUUID } from 'crypto';
import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { EntityRepository } from '@mikro-orm/mysql';
import { InjectRepository } from '@mikro-orm/nestjs';
import { StorageService } from '@core/storage/storage.service';
import { User } from '@modules/users/entity/user.entity';
import { RegisterPhotoDto } from '../dto/register-photo.dto';
import {
  PhotoContentType, RequestPhotoUploadDto,
} from '../dto/request-photo-upload.dto';
import { UpdatePhotoDto } from '../dto/update-photo.dto';
import { TankPhoto } from '../entity/tank-photo.entity';
import { Tank } from '../entity/tank.entity';

const EXTENSIONS: Record<PhotoContentType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

export interface PreparedUpload {
  uploadUrl: string;
  storageKey: string;
  expiresAt: Date;
}

export function photoKeyPrefix (tank: Tank): string {
  return `tanks/${tank.id}/`;
}

/**
 * Two-step upload: the API hands out a pre-signed URL for a key under the tank's prefix, the
 * client PUTs the bytes there, then registers the key. The register step checks the object is
 * really in the bucket, so a row never points at nothing.
 */
@Injectable()
export class TankPhotosService {
  constructor (
    @InjectRepository(TankPhoto)
    private readonly photos: EntityRepository<TankPhoto>,
    private readonly storage: StorageService,
  ) {}

  async prepareUpload (tank: Tank, dto: RequestPhotoUploadDto): Promise<PreparedUpload> {
    const storageKey = `${photoKeyPrefix(tank)}${randomUUID()}.${EXTENSIONS[dto.contentType]}`;
    const target = await this.storage.createUploadUrl(storageKey, dto.contentType, dto.sizeBytes);

    return {
      uploadUrl: target.url,
      storageKey,
      expiresAt: target.expiresAt,
    };
  }

  async register (tank: Tank, uploadedBy: User, dto: RegisterPhotoDto): Promise<TankPhoto> {
    if (!dto.storageKey.startsWith(photoKeyPrefix(tank))) {
      throw new BadRequestException('The storage key does not belong to this tank');
    }

    if (await this.photos.findOne({ storageKey: dto.storageKey })) {
      throw new ConflictException('This upload is already registered');
    }

    const stored = await this.storage.headObject(dto.storageKey);

    if (!stored) {
      throw new NotFoundException('No upload found for this storage key');
    }

    const photo = this.photos.create({
      tank,
      storageKey: dto.storageKey,
      contentType: stored.contentType,
      sizeBytes: stored.sizeBytes,
      caption: dto.caption ?? null,
      takenAt: dto.takenAt ? new Date(dto.takenAt) : null,
      uploadedBy,
    });
    await this.photos.getEntityManager().persistAndFlush(photo);

    return photo;
  }

  list (tank: Tank): Promise<TankPhoto[]> {
    return this.photos.find({ tank }, {
      populate: ['uploadedBy'],
      orderBy: {
        createdAt: 'desc',
        id: 'desc',
      },
    });
  }

  async update (tank: Tank, id: number, dto: UpdatePhotoDto): Promise<TankPhoto> {
    const photo = await this.require(tank, id);

    if (dto.caption !== undefined) {
      photo.caption = dto.caption;
    }

    if (dto.takenAt !== undefined) {
      photo.takenAt = dto.takenAt === null ? null : new Date(dto.takenAt);
    }

    await this.photos.getEntityManager().flush();

    return photo;
  }

  /** Removes the row and the object; the cover reference, if any, is cleared by the foreign key. */
  async delete (tank: Tank, id: number): Promise<void> {
    const photo = await this.require(tank, id);

    await this.photos.getEntityManager().removeAndFlush(photo);
    await this.storage.deleteObject(photo.storageKey);
  }

  async require (tank: Tank, id: number): Promise<TankPhoto> {
    const photo = await this.photos.findOne({
      id,
      tank,
    }, { populate: ['uploadedBy'] });

    if (!photo) {
      throw new NotFoundException('Photo not found');
    }

    return photo;
  }

  urlOf (photo: TankPhoto): string {
    return this.storage.publicUrl(photo.storageKey);
  }
}
