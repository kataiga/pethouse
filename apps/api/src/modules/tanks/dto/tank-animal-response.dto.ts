import { ApiProperty } from '@nestjs/swagger';
import { Language } from '@common/enums/language.enum';
import { TankAnimal } from '../entity/tank-animal.entity';
import { AnimalSpeciesSummaryDto } from './animal-species-summary.dto';

export class TankAnimalResponseDto {
  @ApiProperty({ example: 3 })
  readonly id: number;

  @ApiProperty({ type: () => AnimalSpeciesSummaryDto })
  readonly species: AnimalSpeciesSummaryDto;

  @ApiProperty({ example: 6 })
  readonly quantity: number;

  @ApiProperty({ example: '2026-03-01' })
  readonly addedAt: string;

  @ApiProperty({
    nullable: true,
    type: String,
    example: null,
  })
  readonly removedAt: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
  })
  readonly notes: string | null;

  constructor (entry: TankAnimal, language: Language) {
    this.id = entry.id;
    this.species = new AnimalSpeciesSummaryDto(entry.species, language);
    this.quantity = entry.quantity;
    this.addedAt = entry.addedAt;
    this.removedAt = entry.removedAt ?? null;
    this.notes = entry.notes ?? null;
  }

  static fromEntity (entry: TankAnimal, language: Language): TankAnimalResponseDto {
    return new TankAnimalResponseDto(entry, language);
  }
}
