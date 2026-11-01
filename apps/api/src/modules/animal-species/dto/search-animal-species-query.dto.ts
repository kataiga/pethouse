import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum, IsOptional, IsString, MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { AnimalGroup } from '../entity/animal-group.enum';

export class SearchAnimalSpeciesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'betta',
    description: 'Matches the scientific name or a common name in any language.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ enum: AnimalGroup })
  @IsOptional()
  @IsEnum(AnimalGroup)
  animalGroup?: AnimalGroup;
}
