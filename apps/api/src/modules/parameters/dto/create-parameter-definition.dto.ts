import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt, IsString, Length, Max, MaxLength, Min,
} from 'class-validator';

export const MAX_DECIMALS = 4;

export class CreateParameterDefinitionDto {
  @ApiProperty({
    example: 'Redox potential',
    minLength: 1,
    maxLength: 60,
  })
  @IsString()
  @Length(1, 60)
  name!: string;

  @ApiProperty({
    example: 'mV',
    maxLength: 16,
    description: 'May be empty for a dimensionless value.',
  })
  @IsString()
  @MaxLength(16)
  unit!: string;

  @ApiProperty({
    example: 0,
    minimum: 0,
    maximum: MAX_DECIMALS,
  })
  @IsInt()
  @Min(0)
  @Max(MAX_DECIMALS)
  decimals!: number;
}
