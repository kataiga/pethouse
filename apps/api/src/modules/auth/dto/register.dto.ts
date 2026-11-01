import {
  ApiProperty, ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  IsEmail, IsEnum, IsOptional, IsString, Length, MaxLength, MinLength,
} from 'class-validator';
import { Language } from '@common/enums/language.enum';

export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_MAX_LENGTH = 128;

export class RegisterDto {
  @ApiProperty({ example: 'alex@example.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({
    example: 'correct horse battery staple',
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
  })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;

  @ApiProperty({
    example: 'Alex',
    minLength: 1,
    maxLength: 80,
  })
  @IsString()
  @Length(1, 80)
  displayName!: string;

  @ApiPropertyOptional({
    enum: Language,
    default: Language.FR,
  })
  @IsOptional()
  @IsEnum(Language)
  preferredLanguage?: Language;
}
