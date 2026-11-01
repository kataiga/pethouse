import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean, IsNumber, ValidateIf,
} from 'class-validator';

function Nullable (): PropertyDecorator {
  return ValidateIf((_object, value) => value !== null && value !== undefined);
}

/** What one tank overrides for one parameter. Null (or absent) means "inherit the account setting". */
export class TankParameterOverrideInputDto {
  @ApiPropertyOptional({
    nullable: true,
    type: Boolean,
  })
  @Nullable()
  @IsBoolean()
  enabled?: boolean | null;

  @ApiPropertyOptional({
    nullable: true,
    type: Number,
  })
  @Nullable()
  @IsNumber()
  minThreshold?: number | null;

  @ApiPropertyOptional({
    nullable: true,
    type: Number,
  })
  @Nullable()
  @IsNumber()
  maxThreshold?: number | null;
}
