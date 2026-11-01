import {
  ApiProperty, ApiPropertyOptional,
} from '@nestjs/swagger';
import { HistoryPoint } from '../repository/measurement.repository';
import { HistoryPointDto } from './history-point.dto';
import { ParameterDefinitionResponseDto } from './parameter-definition-response.dto';
import { ResolvedParameter } from './resolved-parameter-response.dto';

/** A chart-ready series with the acceptable range alongside it, so the band can be drawn. */
export class HistoryResponseDto {
  @ApiProperty({ type: () => ParameterDefinitionResponseDto })
  readonly definition: ParameterDefinitionResponseDto;

  @ApiProperty({
    enum: ['hour', 'day', 'week'],
    example: 'day',
  })
  readonly bucket: string;

  @ApiProperty({ example: '2026-02-01T00:00:00.000Z' })
  readonly from: string;

  @ApiProperty({ example: '2026-03-01T00:00:00.000Z' })
  readonly to: string;

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

  @ApiProperty({ type: () => [HistoryPointDto] })
  readonly points: HistoryPointDto[];

  constructor (parameter: ResolvedParameter, bucket: string, from: Date, to: Date, points: HistoryPoint[]) {
    this.definition = ParameterDefinitionResponseDto.fromEntity(parameter.definition);
    this.bucket = bucket;
    this.from = from.toISOString();
    this.to = to.toISOString();
    this.minThreshold = parameter.minThreshold;
    this.maxThreshold = parameter.maxThreshold;
    this.points = points.map((point) => new HistoryPointDto(point));
  }
}
