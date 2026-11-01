import { ApiProperty } from '@nestjs/swagger';
import { Routine } from '../entity/routine.entity';

export class RoutineSummaryDto {
  @ApiProperty({ example: 7 })
  readonly id: number;

  @ApiProperty({ example: 'Water change' })
  readonly name: string;

  constructor (routine: Routine) {
    this.id = routine.id;
    this.name = routine.name;
  }
}
