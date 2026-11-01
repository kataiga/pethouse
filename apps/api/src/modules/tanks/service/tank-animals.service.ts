import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { EntityRepository } from '@mikro-orm/mysql';
import { InjectRepository } from '@mikro-orm/nestjs';
import { todayIsoDate } from '@common/dates';
import { AnimalSpeciesService } from '@modules/animal-species/service/animal-species.service';
import { AddTankAnimalDto } from '../dto/add-tank-animal.dto';
import { UpdateTankAnimalDto } from '../dto/update-tank-animal.dto';
import { TankAnimal } from '../entity/tank-animal.entity';
import { Tank } from '../entity/tank.entity';

@Injectable()
export class TankAnimalsService {
  constructor (
    @InjectRepository(TankAnimal)
    private readonly entries: EntityRepository<TankAnimal>,
    private readonly animalSpeciesService: AnimalSpeciesService,
  ) {}

  list (tank: Tank, includeRemoved: boolean): Promise<TankAnimal[]> {
    return this.entries.find({
      tank,
      ...(includeRemoved ? {} : { removedAt: null }),
    }, {
      populate: ['species.names'],
      orderBy: {
        addedAt: 'asc',
        id: 'asc',
      },
    });
  }

  async add (tank: Tank, dto: AddTankAnimalDto): Promise<TankAnimal> {
    const species = await this.animalSpeciesService.findById(dto.animalSpeciesId);

    if (!species) {
      throw new BadRequestException('Unknown animal species');
    }

    const entry = this.entries.create({
      tank,
      species,
      quantity: dto.quantity,
      addedAt: dto.addedAt ?? todayIsoDate(),
      notes: dto.notes ?? null,
    });
    await this.entries.getEntityManager().persistAndFlush(entry);

    return entry;
  }

  async update (tank: Tank, id: number, dto: UpdateTankAnimalDto): Promise<TankAnimal> {
    const entry = await this.require(tank, id);

    if (dto.quantity !== undefined) {
      entry.quantity = dto.quantity;
    }

    if (dto.addedAt !== undefined) {
      entry.addedAt = dto.addedAt;
    }

    if (dto.removedAt !== undefined) {
      entry.removedAt = dto.removedAt;
    }

    if (dto.notes !== undefined) {
      entry.notes = dto.notes;
    }

    if (entry.removedAt !== null && entry.removedAt !== undefined && entry.removedAt < entry.addedAt) {
      throw new BadRequestException('removedAt cannot be before addedAt');
    }

    await this.entries.getEntityManager().flush();

    return entry;
  }

  async remove (tank: Tank, id: number): Promise<void> {
    await this.entries.getEntityManager().removeAndFlush(await this.require(tank, id));
  }

  private async require (tank: Tank, id: number): Promise<TankAnimal> {
    const entry = await this.entries.findOne({
      id,
      tank,
    }, { populate: ['species.names'] });

    if (!entry) {
      throw new NotFoundException('Tank animal entry not found');
    }

    return entry;
  }
}
