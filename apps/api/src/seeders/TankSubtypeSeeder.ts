import type { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { TankSubtype } from '@modules/tanks/entity/tank-subtype.entity';
import { SYSTEM_TANK_SUBTYPES } from './system-tank-subtypes';

/** Idempotent: re-running updates names in place and never duplicates a (type, slug) pair. */
export class TankSubtypeSeeder extends Seeder {
  async run (em: EntityManager): Promise<void> {
    for (const system of SYSTEM_TANK_SUBTYPES) {
      const existing = await em.findOne(TankSubtype, {
        tankType: system.tankType,
        slug: system.slug,
        household: null,
      });

      if (existing) {
        existing.name = system.name;
        existing.isSystem = true;
      } else {
        em.persist(em.create(TankSubtype, {
          tankType: system.tankType,
          slug: system.slug,
          name: system.name,
          isSystem: true,
          household: null,
        }));
      }
    }

    await em.flush();
  }
}
