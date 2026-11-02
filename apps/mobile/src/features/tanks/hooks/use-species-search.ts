import {
  keepPreviousData, useQuery, UseQueryResult,
} from '@tanstack/react-query';
import type { Schemas } from '@pethouse/api-client';
import { api } from '@/lib/api/client';

export type AnimalGroup = Schemas['AnimalSpeciesResponseDto']['animalGroup'];

export const ANIMAL_GROUPS: readonly AnimalGroup[] = ['FISH', 'INVERTEBRATE', 'REPTILE', 'AMPHIBIAN', 'ARTHROPOD'];

/** What a search result row needs, whichever catalogue it comes from. */
export interface SpeciesHit {
  id: number;
  commonName: string;
  scientificName: string;
}

export interface SpeciesPage {
  hits: SpeciesHit[];
  total: number;
}

export const SPECIES_PAGE_SIZE = 30;

export interface SpeciesQuery {
  kind: 'animals' | 'plants';
  search: string;
  /** Animals only. */
  animalGroup: AnimalGroup | null;
}

function toPage (page: { data: SpeciesHit[];
  total: number }): SpeciesPage {
  return {
    hits: page.data.map(({ id, commonName, scientificName }) => ({
      id,
      commonName,
      scientificName,
    })),
    total: page.total,
  };
}

/** One page of the animal or plant catalogue; the previous results stay up while typing. */
export function useSpeciesSearch ({ kind, search, animalGroup }: SpeciesQuery): UseQueryResult<SpeciesPage> {
  const term = search.trim();

  return useQuery({
    queryKey: [kind === 'animals' ? 'animal-species' : 'plant-species', {
      term,
      animalGroup,
    }],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const common = {
        limit: SPECIES_PAGE_SIZE,
        ...(term === '' ? {} : { search: term }),
      };
      const { data } = kind === 'animals'
        ? await api.GET('/api/animal-species', {
          params: {
            query: {
              ...common,
              ...(animalGroup === null ? {} : { animalGroup }),
            },
          },
        })
        : await api.GET('/api/plant-species', { params: { query: common } });

      if (!data) {
        throw new Error('The catalogue could not be searched');
      }

      return toPage(data);
    },
  });
}
