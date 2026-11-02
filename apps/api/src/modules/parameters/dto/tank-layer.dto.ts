import { ApiProperty } from '@nestjs/swagger';

export interface TankLayer {
  enabled: boolean | null;
  minThreshold: number | null;
  maxThreshold: number | null;
}

/** The tank's deviation as stored; a null field inherits from the account. */
export class TankLayerDto {
  @ApiProperty({
    nullable: true,
    type: Boolean,
  })
  readonly enabled: boolean | null;

  @ApiProperty({
    nullable: true,
    type: Number,
    example: 7,
  })
  readonly minThreshold: number | null;

  @ApiProperty({
    nullable: true,
    type: Number,
    example: null,
  })
  readonly maxThreshold: number | null;

  constructor (layer: TankLayer) {
    this.enabled = layer.enabled;
    this.minThreshold = layer.minThreshold;
    this.maxThreshold = layer.maxThreshold;
  }
}
