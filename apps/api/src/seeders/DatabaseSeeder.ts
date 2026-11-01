import type { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { AnimalSpeciesSeeder } from './AnimalSpeciesSeeder';
import { PlantSpeciesSeeder } from './PlantSpeciesSeeder';
import { TankSubtypeSeeder } from './TankSubtypeSeeder';

/** Entry point of `npm run mikro:seed`: every system list, in dependency order. Re-runnable. */
export class DatabaseSeeder extends Seeder {
  run (em: EntityManager): Promise<void> {
    return this.call(em, [TankSubtypeSeeder, AnimalSpeciesSeeder, PlantSpeciesSeeder]);
  }
}
