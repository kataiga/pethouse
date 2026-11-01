import {
  EntityRepository, QueryOrder,
} from '@mikro-orm/mysql';
import { containsPattern } from '@common/like';
import type { PlantSpecies } from '../entity/plant-species.entity';
import { PlantPlacement } from '../entity/plant-traits.enum';

export interface PlantSpeciesSearch {
  search?: string;
  placement?: PlantPlacement;
  offset: number;
  limit: number;
}

export class PlantSpeciesRepository extends EntityRepository<PlantSpecies> {
  /** Matches the scientific name or any common name, case-insensitively, anywhere in the string. */
  search (query: PlantSpeciesSearch): Promise<[PlantSpecies[], number]> {
    const term = query.search?.trim();

    return this.findAndCount({
      ...(query.placement ? { placement: query.placement } : {}),
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

  findWithNames (id: number): Promise<PlantSpecies | null> {
    return this.findOne({ id }, { populate: ['names'] });
  }
}
