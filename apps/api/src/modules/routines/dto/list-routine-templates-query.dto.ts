import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum, IsOptional,
} from 'class-validator';
import { TankType } from '@common/enums/tank-type.enum';

export class ListRoutineTemplatesQueryDto {
  @ApiPropertyOptional({
    enum: TankType,
    enumName: 'TankType',
  })
  @IsOptional()
  @IsEnum(TankType)
  tankType?: TankType;
}
