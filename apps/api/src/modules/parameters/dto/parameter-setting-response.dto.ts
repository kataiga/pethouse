import { ApiProperty } from '@nestjs/swagger';
import { ParameterDefinition } from '../entity/parameter-definition.entity';
import { ParameterDefinitionResponseDto } from './parameter-definition-response.dto';

export interface EffectiveSetting {
  definition: ParameterDefinition;
  enabled: boolean;
  displayOrder: number;
  minThreshold: number | null;
  maxThreshold: number | null;
  /** Whether the account changed this setting, or it is still the seeded default. */
  customised: boolean;
}

/** An account-level setting for one tank type, defaults merged in. */
export class ParameterSettingResponseDto {
  @ApiProperty({ type: () => ParameterDefinitionResponseDto })
  readonly definition: ParameterDefinitionResponseDto;

  @ApiProperty()
  readonly enabled: boolean;

  @ApiProperty({ example: 30 })
  readonly displayOrder: number;

  @ApiProperty({
    nullable: true,
    type: Number,
    example: 6.5,
  })
  readonly minThreshold: number | null;

  @ApiProperty({
    nullable: true,
    type: Number,
    example: 7.5,
  })
  readonly maxThreshold: number | null;

  @ApiProperty({ description: 'False while the seeded default applies.' })
  readonly customised: boolean;

  constructor (setting: EffectiveSetting) {
    this.definition = ParameterDefinitionResponseDto.fromEntity(setting.definition);
    this.enabled = setting.enabled;
    this.displayOrder = setting.displayOrder;
    this.minThreshold = setting.minThreshold;
    this.maxThreshold = setting.maxThreshold;
    this.customised = setting.customised;
  }
}
