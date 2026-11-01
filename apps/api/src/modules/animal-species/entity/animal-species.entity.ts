import {
  Collection, Entity, EntityRepositoryType, Enum, OneToMany, Opt, PrimaryKey, Property,
} from '@mikro-orm/core';
import { Language } from '@common/enums/language.enum';
import { AnimalSpeciesRepository } from '../repository/animal-species.repository';
import {
  AnimalGroup, Temperament,
} from './animal-group.enum';
import { AnimalSpeciesName } from './animal-species-name.entity';

/**
 * Catalogue entry for an animal. Deliberately unrelated to PlantSpecies: no shared base, no
 * discriminator, so a plant-only column can never appear here.
 */
@Entity({
  tableName: 'animal_species',
  repository: () => AnimalSpeciesRepository,
})
export class AnimalSpecies {
  [EntityRepositoryType]?: AnimalSpeciesRepository;

  @PrimaryKey()
  id!: number;

  @Property({
    length: 120,
    unique: true,
  })
  scientificName!: string;

  @Enum(() => AnimalGroup)
  animalGroup!: AnimalGroup;

  @Property({
    length: 255,
    nullable: true,
  })
  imageKey?: string | null = null;

  @Property({
    type: 'double',
    nullable: true,
  })
  minTemperatureC?: number | null = null;

  @Property({
    type: 'double',
    nullable: true,
  })
  maxTemperatureC?: number | null = null;

  @Property({
    type: 'double',
    nullable: true,
  })
  minPh?: number | null = null;

  @Property({
    type: 'double',
    nullable: true,
  })
  maxPh?: number | null = null;

  @Property({
    type: 'double',
    nullable: true,
  })
  adultSizeCm?: number | null = null;

  @Property({
    type: 'double',
    nullable: true,
  })
  minTankVolumeL?: number | null = null;

  @Enum({
    items: () => Temperament,
    nullable: true,
  })
  temperament?: Temperament | null = null;

  @Property()
  isSystem!: boolean;

  @OneToMany(() => AnimalSpeciesName, (name) => name.species)
  names = new Collection<AnimalSpeciesName>(this);

  @Property({ onCreate: () => new Date() })
  createdAt: Date & Opt = new Date();

  /** The common name in a language, falling back to English, then to the scientific name. */
  commonName (language: Language): string {
    const names = this.names.isInitialized() ? this.names.getItems() : [];
    const wanted = names.find((name) => name.language === language)
      ?? names.find((name) => name.language === Language.EN);

    return wanted?.commonName ?? this.scientificName;
  }
}
