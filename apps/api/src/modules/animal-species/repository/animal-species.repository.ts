import {
  EntityRepository, QueryOrder,
} from '@mikro-orm/mysql';
import { containsPattern } from '@common/like';
import type { AnimalSpecies } from '../entity/animal-species.entity';
import { AnimalGroup } from '../entity/animal-group.enum';

export interface AnimalSpeciesSearch {
  search?: string;
  animalGroup?: AnimalGroup;
  offset: number;
  limit: number;
}

export class AnimalSpeciesRepository extends EntityRepository<AnimalSpecies> {
  /** Matches the scientific name or any common name, case-insensitively, anywhere in the string. */
  search (query: AnimalSpeciesSearch): Promise<[AnimalSpecies[], number]> {
    const term = query.search?.trim();

    return this.findAndCount({
      ...(query.animalGroup ? { animalGroup: query.animalGroup } : {}),
      ...(term
        ? {
          $or: [
            { scientificName: { $like: containsPattern(term) } },
            { names: { commonName: { $like: containsPattern(term) } } },
          ],
        }
        : {}),
    }, {
      populate: ['names'],
      orderBy: { scientificName: QueryOrder.ASC },
      offset: query.offset,
      limit: query.limit,
    });
  }

  findWithNames (id: number): Promise<AnimalSpecies | null> {
    return this.findOne({ id }, { populate: ['names'] });
  }
}
