import {
  Entity, Enum, ManyToOne, PrimaryKey, Property, Unique,
} from '@mikro-orm/core';
import { Language } from '@common/enums/language.enum';
import { PlantSpecies } from './plant-species.entity';

@Entity({ tableName: 'plant_species_names' })
@Unique({ properties: ['species', 'language'] })
export class PlantSpeciesName {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => PlantSpecies, {
    deleteRule: 'cascade',
    fieldName: 'plant_species_id',
  })
  species!: PlantSpecies;

  @Enum(() => Language)
  language!: Language;

  @Property({ length: 120 })
  commonName!: string;
}
