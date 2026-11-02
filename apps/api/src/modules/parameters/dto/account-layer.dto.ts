import { ApiProperty } from '@nestjs/swagger';

export interface AccountLayer {
  enabled: boolean;
  minThreshold: number | null;
  maxThreshold: number | null;
}

/** What the caller's account says for this tank type, before the tank's own deviation. */
export class AccountLayerDto {
  @ApiProperty()
  readonly enabled: boolean;

  @ApiProperty({
    nullable: true,
    type: Number,
    example: 6.5,
  })
  readonly minThreshold: number | null;

  @ApiProperty({
    nullable: true,
    type: Number,
    example: 7.5,
  })
  readonly maxThreshold: number | null;

  constructor (layer: AccountLayer) {
    this.enabled = layer.enabled;
    this.minThreshold = layer.minThreshold;
    this.maxThreshold = layer.maxThreshold;
  }
}

