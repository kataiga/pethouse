import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum, IsOptional, IsString, MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { PlantPlacement } from '../entity/plant-traits.enum';

export class SearchPlantSpeciesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'anubias',
    description: 'Matches the scientific name or a common name in any language.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ enum: PlantPlacement })
  @IsOptional()
  @IsEnum(PlantPlacement)
  placement?: PlantPlacement;
}
