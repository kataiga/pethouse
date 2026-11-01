import {
  ApiProperty, ApiPropertyOptional,
} from '@nestjs/swagger';
import { Language } from '@common/enums/language.enum';
import { PlantSpecies } from '../entity/plant-species.entity';
import {
  GrowthRate, LightRequirement, PlantPlacement,
} from '../entity/plant-traits.enum';
import { LocalizedNamesDto } from './localized-names.dto';

export class PlantSpeciesResponseDto {
  @ApiProperty({ example: 12 })
  readonly id: number;

  @ApiProperty({ example: 'Anubias barteri var. nana' })
  readonly scientificName: string;

  @ApiProperty({
    example: 'Anubias nain',
    description: 'Common name in the caller\'s language, English as fallback, scientific name as last resort.',
  })
  readonly commonName: string;

  @ApiProperty({ type: () => LocalizedNamesDto })
  readonly commonNames: LocalizedNamesDto;

  @ApiPropertyOptional({
    nullable: true,
    enum: LightRequirement,
  })
  readonly lightRequirement: LightRequirement | null;

  @ApiPropertyOptional({
    nullable: true,
    enum: GrowthRate,
  })
  readonly growthRate: GrowthRate | null;

  @ApiPropertyOptional({
    nullable: true,
    type: Boolean,
    example: false,
  })
  readonly co2Required: boolean | null;

  @ApiPropertyOptional({
    nullable: true,
    enum: PlantPlacement,
  })
  readonly placement: PlantPlacement | null;

  @ApiPropertyOptional({
    nullable: true,
    type: Number,
    example: 22,
  })
  readonly minTemperatureC: number | null;

  @ApiPropertyOptional({
    nullable: true,
    type: Number,
    example: 28,
  })
  readonly maxTemperatureC: number | null;

  @ApiPropertyOptional({
    nullable: true,
    type: Number,
    example: 6,
  })
  readonly minPh: number | null;

  @ApiPropertyOptional({
    nullable: true,
    type: Number,
    example: 7.5,
  })
  readonly maxPh: number | null;

  @ApiProperty()
  readonly isSystem: boolean;

  constructor (species: PlantSpecies, language: Language) {
    this.id = species.id;
    this.scientificName = species.scientificName;
    this.commonName = species.commonName(language);
    this.commonNames = new LocalizedNamesDto(species.names.getItems());
    this.lightRequirement = species.lightRequirement ?? null;
    this.growthRate = species.growthRate ?? null;
    this.co2Required = species.co2Required ?? null;
    this.placement = species.placement ?? null;
    this.minTemperatureC = species.minTemperatureC ?? null;
    this.maxTemperatureC = species.maxTemperatureC ?? null;
    this.minPh = species.minPh ?? null;
    this.maxPh = species.maxPh ?? null;
    this.isSystem = species.isSystem;
  }

  static fromEntity (species: PlantSpecies, language: Language): PlantSpeciesResponseDto {
    return new PlantSpeciesResponseDto(species, language);
  }
}
