import {
  ApiProperty, ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  IsDateString, IsOptional, IsString, Matches, MaxLength,
} from 'class-validator';

export class RegisterPhotoDto {
  @ApiProperty({ example: 'tanks/42/0f8fad5b-d9cb-469f-a165-70867728950e.jpg' })
  @IsString()
  @MaxLength(255)
  @Matches(/^tanks\/\d+\/[0-9a-f-]{36}\.[a-z0-9]{3,4}$/)
  storageKey!: string;

  @ApiPropertyOptional({
    example: 'After the rescape',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  caption?: string;

  @ApiPropertyOptional({
    example: '2026-01-01T09:00:00.000Z',
    description: 'When the picture was taken, if known.',
  })
  @IsOptional()
  @IsDateString()
  takenAt?: string;
}
