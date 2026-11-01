import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { TankType } from '@common/enums/tank-type.enum';

export class TankTypeParamDto {
  @ApiProperty({ enum: TankType })
  @IsEnum(TankType)
  tankType!: TankType;
}
