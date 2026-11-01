import {
  ApiProperty, ApiPropertyOptional,
} from '@nestjs/swagger';
import { Language } from '@common/enums/language.enum';
import { TankPlant } from '../entity/tank-plant.entity';
import { PlantSpeciesSummaryDto } from './plant-species-summary.dto';

export class TankPlantResponseDto {
  @ApiProperty({ example: 3 })
  readonly id: number;

  @ApiProperty({ type: () => PlantSpeciesSummaryDto })
  readonly species: PlantSpeciesSummaryDto;

  @ApiProperty({ example: 6 })
  readonly quantity: number;

  @ApiProperty({ example: '2026-03-01' })
  readonly addedAt: string;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    example: null,
  })
  readonly removedAt: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
  })
  readonly notes: string | null;

  constructor (entry: TankPlant, language: Language) {
    this.id = entry.id;
    this.species = new PlantSpeciesSummaryDto(entry.species, language);
    this.quantity = entry.quantity;
    this.addedAt = entry.addedAt;
    this.removedAt = entry.removedAt ?? null;
    this.notes = entry.notes ?? null;
  }

  static fromEntity (entry: TankPlant, language: Language): TankPlantResponseDto {
    return new TankPlantResponseDto(entry, language);
  }
}
