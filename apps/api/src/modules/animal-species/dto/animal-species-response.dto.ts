import { ApiProperty } from '@nestjs/swagger';
import { Language } from '@common/enums/language.enum';
import {
  AnimalGroup, Temperament,
} from '../entity/animal-group.enum';
import { AnimalSpecies } from '../entity/animal-species.entity';
import { LocalizedNamesDto } from './localized-names.dto';

export class AnimalSpeciesResponseDto {
  @ApiProperty({ example: 12 })
  readonly id: number;

  @ApiProperty({ example: 'Betta splendens' })
  readonly scientificName: string;

  @ApiProperty({
    example: 'Combattant',
    description: 'Common name in the caller\'s language, English as fallback, scientific name as last resort.',
  })
  readonly commonName: string;

  @ApiProperty({ type: () => LocalizedNamesDto })
  readonly commonNames: LocalizedNamesDto;

  @ApiProperty({ enum: AnimalGroup })
  readonly animalGroup: AnimalGroup;

  @ApiProperty({
    nullable: true,
    type: Number,
    example: 24,
  })
  readonly minTemperatureC: number | null;

  @ApiProperty({
    nullable: true,
    type: Number,
    example: 30,
  })
  readonly maxTemperatureC: number | null;

  @ApiProperty({
    nullable: true,
    type: Number,
    example: 6,
  })
  readonly minPh: number | null;

  @ApiProperty({
    nullable: true,
    type: Number,
    example: 7.5,
  })
  readonly maxPh: number | null;

  @ApiProperty({
    nullable: true,
    type: Number,
    example: 7,
  })
  readonly adultSizeCm: number | null;

  @ApiProperty({
    nullable: true,
    type: Number,
    example: 20,
  })
  readonly minTankVolumeL: number | null;

  @ApiProperty({
    nullable: true,
    enum: Temperament,
  })
  readonly temperament: Temperament | null;

  @ApiProperty()
  readonly isSystem: boolean;

  constructor (species: AnimalSpecies, language: Language) {
    this.id = species.id;
    this.scientificName = species.scientificName;
    this.commonName = species.commonName(language);
    this.commonNames = new LocalizedNamesDto(species.names.getItems());
    this.animalGroup = species.animalGroup;
    this.minTemperatureC = species.minTemperatureC ?? null;
    this.maxTemperatureC = species.maxTemperatureC ?? null;
    this.minPh = species.minPh ?? null;
    this.maxPh = species.maxPh ?? null;
    this.adultSizeCm = species.adultSizeCm ?? null;
    this.minTankVolumeL = species.minTankVolumeL ?? null;
    this.temperament = species.temperament ?? null;
    this.isSystem = species.isSystem;
  }

  static fromEntity (species: AnimalSpecies, language: Language): AnimalSpeciesResponseDto {
    return new AnimalSpeciesResponseDto(species, language);
  }
}
