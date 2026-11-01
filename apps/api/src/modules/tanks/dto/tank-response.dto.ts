import { ApiProperty } from '@nestjs/swagger';
import { TankType } from '@common/enums/tank-type.enum';
import { Tank } from '../entity/tank.entity';
import { CoverPhotoDto } from './cover-photo.dto';
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

  @ApiProperty({
    type: () => TankSubtypeResponseDto,
    nullable: true,
  })
  readonly subtype: TankSubtypeResponseDto | null;

  @ApiProperty({
    example: 120,
    nullable: true,
    type: Number,
  })
  readonly volumeLiters: number | null;

  @ApiProperty({
    example: 100,
    nullable: true,
    type: Number,
  })
  readonly widthCm: number | null;

  @ApiProperty({
    example: 40,
    nullable: true,
    type: Number,
  })
  readonly heightCm: number | null;

  @ApiProperty({
    example: 30,
    nullable: true,
    type: Number,
  })
  readonly depthCm: number | null;

  @ApiProperty({
    example: 'Aquasoil',
    nullable: true,
    type: String,
  })
  readonly substrate: string | null;

  @ApiProperty({
    example: '2026-01-15',
    nullable: true,
    type: String,
    description: 'Calendar date, no time.',
  })
  readonly startedAt: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
  })
  readonly description: string | null;

  @ApiProperty({
    type: () => CoverPhotoDto,
    nullable: true,
  })
  readonly coverPhoto: CoverPhotoDto | null;

  @ApiProperty({ example: '2026-01-01T09:00:00.000Z' })
  readonly createdAt: string;

  @ApiProperty({ example: '2026-01-01T09:00:00.000Z' })
  readonly updatedAt: string;

  /** `coverPhotoUrl` is resolved by the caller: the DTO does not know the storage base URL. */
  constructor (tank: Tank, coverPhotoUrl: string | null) {
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
    this.coverPhoto = tank.coverPhoto && coverPhotoUrl ? new CoverPhotoDto(tank.coverPhoto.id, coverPhotoUrl) : null;
    this.createdAt = tank.createdAt.toISOString();
    this.updatedAt = tank.updatedAt.toISOString();
  }

  static fromEntity (tank: Tank, coverPhotoUrl: string | null): TankResponseDto {
    return new TankResponseDto(tank, coverPhotoUrl);
  }
}
