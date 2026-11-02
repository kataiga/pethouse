import { ApiProperty } from '@nestjs/swagger';

export class PhotoUploadResponseDto {
  @ApiProperty({ description: 'PUT the raw file here, with the Content-Type and Content-Length declared.' })
  readonly uploadUrl: string;

  @ApiProperty({
    enum: ['PUT'],
    example: 'PUT',
    description: 'HTTP method to use on uploadUrl.',
  })
  readonly method: 'PUT';

  @ApiProperty({
    example: 'tanks/42/0f8fad5b-d9cb-469f-a165-70867728950e.jpg',
    description: 'Pass it to POST /tanks/:tankId/photos once the upload succeeded.',
  })
  readonly storageKey: string;

  @ApiProperty({ example: '2026-01-01T09:05:00.000Z' })
  readonly expiresAt: string;

  constructor (uploadUrl: string, storageKey: string, expiresAt: Date) {
    this.uploadUrl = uploadUrl;
    this.method = 'PUT';
    this.storageKey = storageKey;
    this.expiresAt = expiresAt.toISOString();
  }
}
