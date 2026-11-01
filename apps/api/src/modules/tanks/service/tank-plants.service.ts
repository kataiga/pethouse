import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { EntityRepository } from '@mikro-orm/mysql';
import { InjectRepository } from '@mikro-orm/nestjs';
import { todayIsoDate } from '@common/dates';
import { PlantSpeciesService } from '@modules/plant-species/service/plant-species.service';
import { AddTankPlantDto } from '../dto/add-tank-plant.dto';
import { UpdateTankPlantDto } from '../dto/update-tank-plant.dto';
import { TankPlant } from '../entity/tank-plant.entity';
import { Tank } from '../entity/tank.entity';

@Injectable()
export class TankPlantsService {
  constructor (
    @InjectRepository(TankPlant)
    private readonly entries: EntityRepository<TankPlant>,
    private readonly plantSpeciesService: PlantSpeciesService,
  ) {}

  list (tank: Tank, includeRemoved: boolean): Promise<TankPlant[]> {
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

  async add (tank: Tank, dto: AddTankPlantDto): Promise<TankPlant> {
    const species = await this.plantSpeciesService.findById(dto.plantSpeciesId);

    if (!species) {
      throw new BadRequestException('Unknown plant species');
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

  async update (tank: Tank, id: number, dto: UpdateTankPlantDto): Promise<TankPlant> {
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

  private async require (tank: Tank, id: number): Promise<TankPlant> {
    const entry = await this.entries.findOne({
      id,
      tank,
    }, { populate: ['species.names'] });

    if (!entry) {
      throw new NotFoundException('Tank plant entry not found');
    }

    return entry;
  }
}
