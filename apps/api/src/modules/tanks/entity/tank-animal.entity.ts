import {
  Entity, ManyToOne, Opt, PrimaryKey, Property,
} from '@mikro-orm/core';
import { AnimalSpecies } from '@modules/animal-species/entity/animal-species.entity';
import { Tank } from './tank.entity';

/**
 * A species living in a tank, with a head count. Separate from TankPlant on purpose: no
 * polymorphic link. `removedAt` keeps the history (V1 has no per-individual tracking).
 */
@Entity({ tableName: 'tank_animals' })
export class TankAnimal {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => Tank, { deleteRule: 'cascade' })
  tank!: Tank;

  @ManyToOne(() => AnimalSpecies, { fieldName: 'animal_species_id' })
  species!: AnimalSpecies;

  @Property({ unsigned: true })
  quantity!: number;

  /** Calendar date (`YYYY-MM-DD`). */
  @Property({ type: 'date' })
  addedAt!: string;

  @Property({
    type: 'date',
    nullable: true,
  })
  removedAt?: string | null = null;

  @Property({
    length: 500,
    nullable: true,
  })
  notes?: string | null = null;

  @Property({ onCreate: () => new Date() })
  createdAt: Date & Opt = new Date();
}
