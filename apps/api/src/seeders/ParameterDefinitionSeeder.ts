import type { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { ParameterDefinition } from '@modules/parameters/entity/parameter-definition.entity';
import { SYSTEM_PARAMETER_DEFINITIONS } from './data/system-parameter-definitions';

/** Idempotent: keyed by slug among system rows; labels and units refreshed in place. */
export class ParameterDefinitionSeeder extends Seeder {
  async run (em: EntityManager): Promise<void> {
    for (const system of SYSTEM_PARAMETER_DEFINITIONS) {
      const existing = await em.findOne(ParameterDefinition, {
        slug: system.slug,
        household: null,
      });

      if (existing) {
        existing.name = system.name;
        existing.unit = system.unit;
        existing.decimals = system.decimals;
        existing.isSystem = true;
      } else {
        em.persist(em.create(ParameterDefinition, {
          slug: system.slug,
          name: system.name,
          unit: system.unit,
          decimals: system.decimals,
          isSystem: true,
          household: null,
        }));
      }
    }

    await em.flush();
  }
}
