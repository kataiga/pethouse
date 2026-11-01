import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum, IsOptional, IsString, Length,
} from 'class-validator';
import { Language } from '@common/enums/language.enum';

export class UpdateMeDto {
  @ApiPropertyOptional({
    example: 'Alex',
    minLength: 1,
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  displayName?: string;

  @ApiPropertyOptional({ enum: Language })
  @IsOptional()
  @IsEnum(Language)
  preferredLanguage?: Language;
}
