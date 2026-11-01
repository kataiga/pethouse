import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum, IsString, Length,
} from 'class-validator';
import { TankType } from '@common/enums/tank-type.enum';

export class CreateTankSubtypeDto {
  @ApiProperty({ enum: TankType })
  @IsEnum(TankType)
  tankType!: TankType;

  @ApiProperty({
    example: 'Blackwater',
    minLength: 1,
    maxLength: 60,
  })
  @IsString()
  @Length(1, 60)
  name!: string;
}
