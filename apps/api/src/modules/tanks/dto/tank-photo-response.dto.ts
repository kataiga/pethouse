import { ApiProperty } from '@nestjs/swagger';
import { TankPhoto } from '../entity/tank-photo.entity';
import { PhotoUploaderDto } from './photo-uploader.dto';

export class TankPhotoResponseDto {
  @ApiProperty({ example: 7 })
  readonly id: number;

  @ApiProperty({
    example: 'https://photos.example.com/pethouse-photos/tanks/42/0f8fad5b.jpg',
    description: 'Publicly readable.',
  })
  readonly url: string;

  @ApiProperty({ example: 'image/jpeg' })
  readonly contentType: string;

  @ApiProperty({ example: 2_480_112 })
  readonly sizeBytes: number;

  @ApiProperty({
    nullable: true,
    type: String,
  })
  readonly caption: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
  })
  readonly takenAt: string | null;

  @ApiProperty({ type: () => PhotoUploaderDto })
  readonly uploadedBy: PhotoUploaderDto;

  @ApiProperty({ example: '2026-01-01T09:00:00.000Z' })
  readonly createdAt: string;

  constructor (photo: TankPhoto, url: string) {
    this.id = photo.id;
    this.url = url;
    this.contentType = photo.contentType;
    this.sizeBytes = photo.sizeBytes;
    this.caption = photo.caption ?? null;
    this.takenAt = photo.takenAt?.toISOString() ?? null;
    this.uploadedBy = new PhotoUploaderDto(photo.uploadedBy.id, photo.uploadedBy.displayName);
    this.createdAt = photo.createdAt.toISOString();
  }
}
