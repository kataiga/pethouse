import {
  BadRequestException, Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { StorageService } from '@core/storage/storage.service';
import { Household } from '@modules/households/entity/household.entity';
import { CreateTankDto } from '../dto/create-tank.dto';
import { TankResponseDto } from '../dto/tank-response.dto';
import { UpdateTankDto } from '../dto/update-tank.dto';
import { TankSubtype } from '../entity/tank-subtype.entity';
import { Tank } from '../entity/tank.entity';
import { TankRepository } from '../repository/tank.repository';
import { TankPhotosService } from './tank-photos.service';
import { TankSubtypesService } from './tank-subtypes.service';

export const SUBTYPE_MISMATCH = 'The subtype does not exist for this household or does not match the tank type';

@Injectable()
export class TanksService {
  constructor (
    @InjectRepository(Tank)
    private readonly tanks: TankRepository,
    private readonly subtypesService: TankSubtypesService,
    private readonly photosService: TankPhotosService,
    private readonly storage: StorageService,
  ) {}

  /** The public shape, with the cover photo URL resolved. */
  present (tank: Tank): TankResponseDto {
    const coverUrl = tank.coverPhoto ? this.storage.publicUrl(tank.coverPhoto.storageKey) : null;

    return TankResponseDto.fromEntity(tank, coverUrl);
  }

  listForHousehold (household: Household): Promise<Tank[]> {
    return this.tanks.findAllForHousehold(household.id);
  }

  findWithHousehold (id: number): Promise<Tank | null> {
    return this.tanks.findWithHousehold(id);
  }

  async create (household: Household, dto: CreateTankDto): Promise<Tank> {
    const subtype = dto.subtypeId === undefined
      ? null
      : await this.resolveSubtype(household, dto.subtypeId, dto.tankType);

    const tank = this.tanks.create({
      household,
      name: dto.name,
      tankType: dto.tankType,
      subtype,
      volumeLiters: dto.volumeLiters ?? null,
      widthCm: dto.widthCm ?? null,
      heightCm: dto.heightCm ?? null,
      depthCm: dto.depthCm ?? null,
      substrate: dto.substrate ?? null,
      startedAt: dto.startedAt ?? null,
      description: dto.description ?? null,
    });
    await this.tanks.getEntityManager().persistAndFlush(tank);

    return tank;
  }

  async update (tank: Tank, dto: UpdateTankDto): Promise<Tank> {
    if (dto.subtypeId !== undefined) {
      tank.subtype = dto.subtypeId === null
        ? null
        : await this.resolveSubtype(tank.household, dto.subtypeId, tank.tankType);
    }

    if (dto.name !== undefined) {
      tank.name = dto.name;
    }

    for (const key of ['volumeLiters', 'widthCm', 'heightCm', 'depthCm'] as const) {
      if (dto[key] !== undefined) {
        tank[key] = dto[key];
      }
    }

    for (const key of ['substrate', 'startedAt', 'description'] as const) {
      if (dto[key] !== undefined) {
        tank[key] = dto[key];
      }
    }

    if (dto.coverPhotoId !== undefined) {
      // `require` answers 404 for a photo of another tank: the id reveals nothing.
      tank.coverPhoto = dto.coverPhotoId === null ? null : await this.photosService.require(tank, dto.coverPhotoId);
    }

    await this.tanks.getEntityManager().flush();

    return tank;
  }

  async delete (tank: Tank): Promise<void> {
    await this.tanks.getEntityManager().removeAndFlush(tank);
  }

  /** A subtype is valid for a tank when it is visible to the household and of the same type. */
  private async resolveSubtype (
    household: Household,
    subtypeId: number,
    tankType: Tank['tankType'],
  ): Promise<TankSubtype> {
    const subtype = await this.subtypesService.findUsable(subtypeId, household);

    if (!subtype || subtype.tankType !== tankType) {
      throw new BadRequestException(SUBTYPE_MISMATCH);
    }

    return subtype;
  }
}
