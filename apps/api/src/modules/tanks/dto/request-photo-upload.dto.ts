import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn, IsInt, Max, Min,
} from 'class-validator';

export const PHOTO_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'] as const;

export type PhotoContentType = typeof PHOTO_CONTENT_TYPES[number];

export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

export class RequestPhotoUploadDto {
  @ApiProperty({
    enum: PHOTO_CONTENT_TYPES,
    example: 'image/jpeg',
  })
  @IsIn(PHOTO_CONTENT_TYPES)
  contentType!: PhotoContentType;

  @ApiProperty({
    example: 2_480_112,
    minimum: 1,
    maximum: MAX_PHOTO_BYTES,
    description: 'Exact size of the file; the upload URL is bound to it.',
  })
  @IsInt()
  @Min(1)
  @Max(MAX_PHOTO_BYTES)
  sizeBytes!: number;
}
