import type { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { RoutineTemplate } from '@modules/routines/entity/routine-template.entity';
import { ROUTINE_TEMPLATES } from './data/routine-templates.data';

/** Idempotent: keyed by tank type and name key; rule and order refreshed in place. */
export class RoutineTemplateSeeder extends Seeder {
  async run (em: EntityManager): Promise<void> {
    const positions = new Map<string, number>();

    for (const seed of ROUTINE_TEMPLATES) {
      const position = positions.get(seed.tankType) ?? 0;
      positions.set(seed.tankType, position + 1);
      const nameKey = `routine.${seed.key}.name`;
      const existing = await em.findOne(RoutineTemplate, {
        tankType: seed.tankType,
        nameKey,
      });

      if (existing) {
        existing.descriptionKey = `routine.${seed.key}.description`;
        existing.defaultRrule = seed.rrule;
        existing.position = position;
        existing.isSystem = true;
      } else {
        em.persist(em.create(RoutineTemplate, {
          tankType: seed.tankType,
          nameKey,
          descriptionKey: `routine.${seed.key}.description`,
          defaultRrule: seed.rrule,
          position,
          isSystem: true,
        }));
      }
    }

    await em.flush();
  }
}
