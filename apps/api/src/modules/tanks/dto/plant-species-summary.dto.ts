import {
  ApiProperty, ApiPropertyOptional,
} from '@nestjs/swagger';
import { Language } from '@common/enums/language.enum';
import { PlantPlacement } from '@modules/plant-species/entity/plant-traits.enum';
import { PlantSpecies } from '@modules/plant-species/entity/plant-species.entity';

/** Enough of the species to render a row without a second request. */
export class PlantSpeciesSummaryDto {
  @ApiProperty({ example: 12 })
  readonly id: number;

  @ApiProperty({ example: 'Anubias barteri var. nana' })
  readonly scientificName: string;

  @ApiProperty({ example: 'Anubias nain' })
  readonly commonName: string;

  @ApiPropertyOptional({
    nullable: true,
    enum: PlantPlacement,
  })
  readonly placement: PlantPlacement | null;

  constructor (species: PlantSpecies, language: Language) {
    this.id = species.id;
    this.scientificName = species.scientificName;
    this.commonName = species.commonName(language);
    this.placement = species.placement ?? null;
  }
}
