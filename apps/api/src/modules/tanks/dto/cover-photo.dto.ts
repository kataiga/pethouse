import { ApiProperty } from '@nestjs/swagger';

/** The cover photo as embedded in a tank. */
export class CoverPhotoDto {
  @ApiProperty({ example: 7 })
  readonly id: number;

  @ApiProperty({ example: 'https://photos.example.com/pethouse-photos/tanks/42/0f8fad5b.jpg' })
  readonly url: string;

  constructor (id: number, url: string) {
    this.id = id;
    this.url = url;
  }
}
