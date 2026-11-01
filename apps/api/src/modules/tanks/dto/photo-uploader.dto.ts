import { ApiProperty } from '@nestjs/swagger';

export class PhotoUploaderDto {
  @ApiProperty({ example: 42 })
  readonly id: number;

  @ApiProperty({ example: 'Alex' })
  readonly displayName: string;

  constructor (id: number, displayName: string) {
    this.id = id;
    this.displayName = displayName;
  }
}
