import { ApiProperty } from '@nestjs/swagger';
import { ParameterDefinition } from '../entity/parameter-definition.entity';
import { LatestReading } from '../repository/measurement.repository';
import { LatestReadingDto } from './latest-reading.dto';
import {
  type AccountLayer, AccountLayerDto,
} from './account-layer.dto';
import { ParameterDefinitionResponseDto } from './parameter-definition-response.dto';
import {
  type TankLayer, TankLayerDto,
} from './tank-layer.dto';

export type ParameterSource = 'default' | 'account' | 'tank';

export interface ResolvedParameter {
  definition: ParameterDefinition;
  enabled: boolean;
  displayOrder: number;
  minThreshold: number | null;
  maxThreshold: number | null;
  /** Where the effective `enabled` comes from. */
  source: ParameterSource;
  overridden: boolean;
  /** The caller's account setting the tank inherits from. */
  account: AccountLayer;
  /** The tank's own deviation, null where it has none. */
  override: TankLayer | null;
  /** The most recent reading on this tank, whatever the enabled state. */
  latest: LatestReading | null;
}

/** One parameter as it applies to one tank, after the account default and the tank override. */
export class ResolvedParameterResponseDto {
  @ApiProperty({ type: () => ParameterDefinitionResponseDto })
  readonly definition: ParameterDefinitionResponseDto;

  @ApiProperty({ description: 'Whether the tank tracks this parameter.' })
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

  @ApiProperty({
    enum: ['default', 'account', 'tank'],
    description: 'default: seeded; account: the user changed it for this tank type; tank: this tank deviates.',
  })
  readonly source: ParameterSource;

  @ApiProperty({ description: 'True when the tank has an override row for this parameter.' })
  readonly overridden: boolean;

  @ApiProperty({
    type: () => AccountLayerDto,
    description: 'The account layer alone, so an editor can say what clearing a deviation falls back to.',
  })
  readonly account: AccountLayerDto;

  @ApiProperty({
    type: () => TankLayerDto,
    nullable: true,
    description: 'The tank layer alone, as stored. PUT replaces it whole, so an editor starts from it.',
  })
  readonly override: TankLayerDto | null;

  @ApiProperty({
    type: () => LatestReadingDto,
    nullable: true,
    description: 'Most recent reading, so a card can show the value and compare it to the thresholds.',
  })
  readonly latest: LatestReadingDto | null;

  constructor (resolved: ResolvedParameter) {
    this.definition = ParameterDefinitionResponseDto.fromEntity(resolved.definition);
    this.enabled = resolved.enabled;
    this.displayOrder = resolved.displayOrder;
    this.minThreshold = resolved.minThreshold;
    this.maxThreshold = resolved.maxThreshold;
    this.source = resolved.source;
    this.overridden = resolved.overridden;
    this.account = new AccountLayerDto(resolved.account);
    this.override = resolved.override ? new TankLayerDto(resolved.override) : null;
    this.latest = resolved.latest ? new LatestReadingDto(resolved.latest) : null;
  }
}
