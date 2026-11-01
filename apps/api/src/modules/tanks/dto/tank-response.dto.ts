import {
  ApiProperty, ApiPropertyOptional,
} from '@nestjs/swagger';
import { TankType } from '@common/enums/tank-type.enum';
import { Tank } from '../entity/tank.entity';
import { TankSubtypeResponseDto } from './tank-subtype-response.dto';

export class TankResponseDto {
  @ApiProperty({ example: 42 })
  readonly id: number;

  @ApiProperty({ example: 1 })
  readonly householdId: number;

  @ApiProperty({ example: 'Living room 120L' })
  readonly name: string;

  @ApiProperty({ enum: TankType })
  readonly tankType: TankType;

  @ApiPropertyOptional({
    type: () => TankSubtypeResponseDto,
    nullable: true,
  })
  readonly subtype: TankSubtypeResponseDto | null;

  @ApiPropertyOptional({
    example: 120,
    nullable: true,
    type: Number,
  })
  readonly volumeLiters: number | null;

  @ApiPropertyOptional({
    example: 100,
    nullable: true,
    type: Number,
  })
  readonly widthCm: number | null;

  @ApiPropertyOptional({
    example: 40,
    nullable: true,
    type: Number,
  })
  readonly heightCm: number | null;

  @ApiPropertyOptional({
    example: 30,
    nullable: true,
    type: Number,
  })
  readonly depthCm: number | null;

  @ApiPropertyOptional({
    example: 'Aquasoil',
    nullable: true,
    type: String,
  })
  readonly substrate: string | null;

  @ApiPropertyOptional({
    example: '2026-01-15',
    nullable: true,
    type: String,
    description: 'Calendar date, no time.',
  })
  readonly startedAt: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
  })
  readonly description: string | null;

  @ApiProperty({ example: '2026-01-01T09:00:00.000Z' })
  readonly createdAt: string;

  @ApiProperty({ example: '2026-01-01T09:00:00.000Z' })
  readonly updatedAt: string;

  constructor (tank: Tank) {
    this.id = tank.id;
    this.householdId = tank.household.id;
    this.name = tank.name;
    this.tankType = tank.tankType;
    this.subtype = tank.subtype ? TankSubtypeResponseDto.fromEntity(tank.subtype) : null;
    this.volumeLiters = tank.volumeLiters ?? null;
    this.widthCm = tank.widthCm ?? null;
    this.heightCm = tank.heightCm ?? null;
    this.depthCm = tank.depthCm ?? null;
    this.substrate = tank.substrate ?? null;
    this.startedAt = tank.startedAt ?? null;
    this.description = tank.description ?? null;
    this.createdAt = tank.createdAt.toISOString();
    this.updatedAt = tank.updatedAt.toISOString();
  }

  static fromEntity (tank: Tank): TankResponseDto {
    return new TankResponseDto(tank);
  }
}
