import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, ValidateNested,
} from 'class-validator';
import { ParameterSettingInputDto } from './parameter-setting-input.dto';

export class UpdateParameterSettingsDto {
  @ApiProperty({
    type: () => [ParameterSettingInputDto],
    description: 'Upserted one by one; definitions not listed are left as they are.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ParameterSettingInputDto)
  settings!: ParameterSettingInputDto[];
}
