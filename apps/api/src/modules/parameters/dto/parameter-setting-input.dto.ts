import {
  ApiProperty, ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  IsBoolean, IsInt, IsNumber, IsOptional, IsPositive, Max, Min, ValidateIf,
} from 'class-validator';

export const MAX_DISPLAY_ORDER = 1000;

function Nullable (): PropertyDecorator {
  return ValidateIf((_object, value) => value !== null && value !== undefined);
}

/** One account-level setting. Null thresholds mean "no threshold". */
export class ParameterSettingInputDto {
  @ApiProperty({ example: 3 })
  @IsInt()
  @IsPositive()
  parameterDefinitionId!: number;

  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;

  @ApiPropertyOptional({
    example: 30,
    minimum: 0,
    maximum: MAX_DISPLAY_ORDER,
    description: 'Position in the list; keeps the seeded order when omitted.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_DISPLAY_ORDER)
  displayOrder?: number;

  @ApiPropertyOptional({
    example: 6.5,
    nullable: true,
    type: Number,
  })
  @Nullable()
  @IsNumber()
  minThreshold?: number | null;

  @ApiPropertyOptional({
    example: 7.5,
    nullable: true,
    type: Number,
  })
  @Nullable()
  @IsNumber()
  maxThreshold?: number | null;
}
