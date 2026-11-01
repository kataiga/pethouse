import type { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { Language } from '@common/enums/language.enum';
import { PlantSpeciesName } from '@modules/plant-species/entity/plant-species-name.entity';
import { PlantSpecies } from '@modules/plant-species/entity/plant-species.entity';
import { PLANT_SPECIES_SEED } from './data/plant-species.data';

/** Idempotent: keyed by scientific name, values and names refreshed in place on every run. */
export class PlantSpeciesSeeder extends Seeder {
  async run (em: EntityManager): Promise<void> {
    for (const seed of PLANT_SPECIES_SEED) {
      const species = await em.findOne(PlantSpecies, { scientificName: seed.scientificName }, { populate: ['names'] })
        ?? em.create(PlantSpecies, {
          scientificName: seed.scientificName,
          isSystem: true,
        });

      species.minTemperatureC = seed.minTemperatureC;
      species.maxTemperatureC = seed.maxTemperatureC;
      species.minPh = seed.minPh;
      species.maxPh = seed.maxPh;
      species.lightRequirement = seed.lightRequirement;
      species.growthRate = seed.growthRate;
      species.co2Required = seed.co2Required;
      species.placement = seed.placement;
      species.isSystem = true;
      em.persist(species);

      for (const [language, commonName] of [[Language.FR, seed.names.fr], [Language.EN, seed.names.en]] as const) {
        const existing = species.names.isInitialized()
          ? species.names.getItems().find((name) => name.language === language)
          : undefined;

        if (existing) {
          existing.commonName = commonName;
        } else {
          em.persist(em.create(PlantSpeciesName, {
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
