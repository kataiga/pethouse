import { ApiProperty } from '@nestjs/swagger';
import type { Tank } from '@modules/tanks/entity/tank.entity';

/** Enough of the tank to say where an occurrence belongs. */
export class TankSummaryDto {
  @ApiProperty({ example: 42 })
  readonly id: number;

  @ApiProperty({ example: 'Living room 120L' })
  readonly name: string;

  constructor (tank: Tank) {
    this.id = tank.id;
    this.name = tank.name;
  }
}
