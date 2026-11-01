import { ApiProperty } from '@nestjs/swagger';
import { Language } from '@common/enums/language.enum';
import { AnimalGroup } from '@modules/animal-species/entity/animal-group.enum';
import { AnimalSpecies } from '@modules/animal-species/entity/animal-species.entity';

/** Enough of the species to render a row without a second request. */
export class AnimalSpeciesSummaryDto {
  @ApiProperty({ example: 12 })
  readonly id: number;

  @ApiProperty({ example: 'Betta splendens' })
  readonly scientificName: string;

  @ApiProperty({ example: 'Combattant' })
  readonly commonName: string;

  @ApiProperty({ enum: AnimalGroup })
  readonly animalGroup: AnimalGroup;

  constructor (species: AnimalSpecies, language: Language) {
    this.id = species.id;
    this.scientificName = species.scientificName;
    this.commonName = species.commonName(language);
    this.animalGroup = species.animalGroup;
  }
}
