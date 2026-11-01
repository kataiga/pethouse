import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString, IsString, MaxLength, ValidateIf,
} from 'class-validator';

function Nullable (): PropertyDecorator {
  return ValidateIf((_object, value) => value !== null && value !== undefined);
}

export class UpdatePhotoDto {
  @ApiPropertyOptional({
    nullable: true,
    type: String,
    maxLength: 200,
  })
  @Nullable()
  @IsString()
  @MaxLength(200)
  caption?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
  })
  @Nullable()
  @IsDateString()
  takenAt?: string | null;
}
