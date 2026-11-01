import {
  Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Page } from '@common/dto/paginated-response.dto';
import { SearchAnimalSpeciesQueryDto } from '../dto/search-animal-species-query.dto';
import { AnimalSpecies } from '../entity/animal-species.entity';
import { AnimalSpeciesRepository } from '../repository/animal-species.repository';

@Injectable()
export class AnimalSpeciesService {
  constructor (
    @InjectRepository(AnimalSpecies)
    private readonly species: AnimalSpeciesRepository,
  ) {}

  async search (query: SearchAnimalSpeciesQueryDto): Promise<Page<AnimalSpecies>> {
    const [data, total] = await this.species.search({
      search: query.search,
      animalGroup: query.animalGroup,
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

  async get (id: number): Promise<AnimalSpecies> {
    const species = await this.species.findWithNames(id);

    if (!species) {
      throw new NotFoundException('Animal species not found');
    }

    return species;
  }

  /** For link tables: the species must exist, nothing else. */
  findById (id: number): Promise<AnimalSpecies | null> {
    return this.species.findWithNames(id);
  }
}
