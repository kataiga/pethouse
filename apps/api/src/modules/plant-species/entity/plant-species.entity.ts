import {
  Collection, Entity, EntityRepositoryType, Enum, OneToMany, Opt, PrimaryKey, Property,
} from '@mikro-orm/core';
import { Language } from '@common/enums/language.enum';
import { PlantSpeciesRepository } from '../repository/plant-species.repository';
import { PlantSpeciesName } from './plant-species-name.entity';
import {
  GrowthRate, LightRequirement, PlantPlacement,
} from './plant-traits.enum';

/**
 * Catalogue entry for a plant. Deliberately unrelated to AnimalSpecies: no shared base, no
 * discriminator, so an animal-only column can never appear here.
 */
@Entity({
  tableName: 'plant_species',
  repository: () => PlantSpeciesRepository,
})
export class PlantSpecies {
  [EntityRepositoryType]?: PlantSpeciesRepository;

  @PrimaryKey()
  id!: number;

  @Property({
    length: 120,
    unique: true,
  })
  scientificName!: string;

  @Property({
    length: 255,
    nullable: true,
  })
  imageKey?: string | null = null;

  @Enum({
    items: () => LightRequirement,
    nullable: true,
  })
  lightRequirement?: LightRequirement | null = null;

  @Enum({
    items: () => GrowthRate,
    nullable: true,
  })
  growthRate?: GrowthRate | null = null;

  @Property({ nullable: true })
  co2Required?: boolean | null = null;

  @Enum({
    items: () => PlantPlacement,
    nullable: true,
  })
  placement?: PlantPlacement | null = null;

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

  @Property()
  isSystem!: boolean;

  @OneToMany(() => PlantSpeciesName, (name) => name.species)
  names = new Collection<PlantSpeciesName>(this);

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
