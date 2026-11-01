import type { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { Language } from '@common/enums/language.enum';
import { AnimalSpeciesName } from '@modules/animal-species/entity/animal-species-name.entity';
import { AnimalSpecies } from '@modules/animal-species/entity/animal-species.entity';
import { ANIMAL_SPECIES_SEED } from './data/animal-species.data';

/** Idempotent: keyed by scientific name, values and names refreshed in place on every run. */
export class AnimalSpeciesSeeder extends Seeder {
  async run (em: EntityManager): Promise<void> {
    for (const seed of ANIMAL_SPECIES_SEED) {
      const species = await em.findOne(AnimalSpecies, { scientificName: seed.scientificName }, { populate: ['names'] })
        ?? em.create(AnimalSpecies, {
          scientificName: seed.scientificName,
          animalGroup: seed.animalGroup,
          isSystem: true,
        });

      species.animalGroup = seed.animalGroup;
      species.minTemperatureC = seed.minTemperatureC;
      species.maxTemperatureC = seed.maxTemperatureC;
      species.minPh = seed.minPh;
      species.maxPh = seed.maxPh;
      species.adultSizeCm = seed.adultSizeCm;
      species.minTankVolumeL = seed.minTankVolumeL;
      species.temperament = seed.temperament;
      species.isSystem = true;
      em.persist(species);

      for (const [language, commonName] of [[Language.FR, seed.names.fr], [Language.EN, seed.names.en]] as const) {
        const existing = species.names.isInitialized()
          ? species.names.getItems().find((name) => name.language === language)
          : undefined;

        if (existing) {
          existing.commonName = commonName;
        } else {
          em.persist(em.create(AnimalSpeciesName, {
            species,
            language,
            commonName,
          }));
        }
      }
    }

    await em.flush();
  }
}
