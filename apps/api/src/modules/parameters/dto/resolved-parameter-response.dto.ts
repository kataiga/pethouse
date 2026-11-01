import {
  ApiProperty, ApiPropertyOptional,
} from '@nestjs/swagger';
import { ParameterDefinition } from '../entity/parameter-definition.entity';
import { LatestReading } from '../repository/measurement.repository';
import { LatestReadingDto } from './latest-reading.dto';
import { ParameterDefinitionResponseDto } from './parameter-definition-response.dto';

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

  @ApiPropertyOptional({
    nullable: true,
    type: Number,
    example: 6.5,
  })
  readonly minThreshold: number | null;

  @ApiPropertyOptional({
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

  @ApiPropertyOptional({
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
    this.latest = resolved.latest ? new LatestReadingDto(resolved.latest) : null;
  }
}
