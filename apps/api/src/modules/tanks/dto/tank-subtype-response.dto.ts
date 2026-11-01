import { ApiProperty } from '@nestjs/swagger';
import { TankType } from '@common/enums/tank-type.enum';
import { TankSubtype } from '../entity/tank-subtype.entity';

export class TankSubtypeResponseDto {
  @ApiProperty({ example: 3 })
  readonly id: number;

  @ApiProperty({ enum: TankType })
  readonly tankType: TankType;

  @ApiProperty({
    example: 'planted',
    description: 'Stable key. System subtypes are translated by the app from it.',
  })
  readonly slug: string;

  @ApiProperty({ example: 'Planted' })
  readonly name: string;

  @ApiProperty({ description: 'True for the seeded list, false for a household\'s own subtype.' })
  readonly isSystem: boolean;

  constructor (subtype: TankSubtype) {
    this.id = subtype.id;
    this.tankType = subtype.tankType;
    this.slug = subtype.slug;
    this.name = subtype.name;
    this.isSystem = subtype.isSystem;
  }

  static fromEntity (subtype: TankSubtype): TankSubtypeResponseDto {
    return new TankSubtypeResponseDto(subtype);
  }
}
