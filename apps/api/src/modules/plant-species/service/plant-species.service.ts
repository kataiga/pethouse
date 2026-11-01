import {
  Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Page } from '@common/dto/paginated-response.dto';
import { SearchPlantSpeciesQueryDto } from '../dto/search-plant-species-query.dto';
import { PlantSpecies } from '../entity/plant-species.entity';
import { PlantSpeciesRepository } from '../repository/plant-species.repository';

@Injectable()
export class PlantSpeciesService {
  constructor (
    @InjectRepository(PlantSpecies)
    private readonly species: PlantSpeciesRepository,
  ) {}

  async search (query: SearchPlantSpeciesQueryDto): Promise<Page<PlantSpecies>> {
    const [data, total] = await this.species.search({
      search: query.search,
      placement: query.placement,
      offset: query.offset,
      limit: query.limit,
    });

    return {
      data,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async get (id: number): Promise<PlantSpecies> {
    const species = await this.species.findWithNames(id);

    if (!species) {
      throw new NotFoundException('Plant species not found');
    }

    return species;
  }

  /** For link tables: the species must exist, nothing else. */
  findById (id: number): Promise<PlantSpecies | null> {
    return this.species.findWithNames(id);
  }
}
