import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean, IsOptional,
} from 'class-validator';

export class ListTankInhabitantsQueryDto {
  @ApiPropertyOptional({
    default: false,
    description: 'Also return entries with a removal date.',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeRemoved: boolean = false;
}
