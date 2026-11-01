import {
  Entity, ManyToOne, Opt, PrimaryKey, Property,
} from '@mikro-orm/core';
import { PlantSpecies } from '@modules/plant-species/entity/plant-species.entity';
import { Tank } from './tank.entity';

/**
 * A plant species growing in a tank, with a plant count. Separate from TankAnimal on purpose: no
 * polymorphic link. `removedAt` keeps the history (V1 has no per-individual tracking).
 */
@Entity({ tableName: 'tank_plants' })
export class TankPlant {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => Tank, { deleteRule: 'cascade' })
  tank!: Tank;

  @ManyToOne(() => PlantSpecies, { fieldName: 'plant_species_id' })
  species!: PlantSpecies;

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
