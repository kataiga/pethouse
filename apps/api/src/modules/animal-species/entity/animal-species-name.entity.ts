import {
  Entity, Enum, ManyToOne, PrimaryKey, Property, Unique,
} from '@mikro-orm/core';
import { Language } from '@common/enums/language.enum';
import { AnimalSpecies } from './animal-species.entity';

@Entity({ tableName: 'animal_species_names' })
@Unique({ properties: ['species', 'language'] })
export class AnimalSpeciesName {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => AnimalSpecies, {
    deleteRule: 'cascade',
    fieldName: 'animal_species_id',
  })
  species!: AnimalSpecies;

  @Enum(() => Language)
  language!: Language;

  @Property({ length: 120 })
  commonName!: string;
}
