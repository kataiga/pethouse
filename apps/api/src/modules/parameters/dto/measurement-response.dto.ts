import { ApiProperty } from '@nestjs/swagger';
import { PhotoUploaderDto } from '@modules/tanks/dto/photo-uploader.dto';
import { Measurement } from '../entity/measurement.entity';
import { ParameterDefinitionResponseDto } from './parameter-definition-response.dto';

export class MeasurementResponseDto {
  @ApiProperty({ example: 120 })
  readonly id: number;

  @ApiProperty({ type: () => ParameterDefinitionResponseDto })
  readonly definition: ParameterDefinitionResponseDto;

  @ApiProperty({
    example: 7.2,
    description: 'Raw value; round with the definition\'s decimals for display.',
  })
  readonly value: number;

  @ApiProperty({ example: '2026-03-01T18:30:00.000Z' })
  readonly measuredAt: string;

  @ApiProperty({ type: () => PhotoUploaderDto })
  readonly recordedBy: PhotoUploaderDto;

  @ApiProperty({
    nullable: true,
    type: String,
  })
  readonly note: string | null;

  constructor (measurement: Measurement) {
    this.id = measurement.id;
    this.definition = ParameterDefinitionResponseDto.fromEntity(measurement.definition);
    this.value = measurement.value;
    this.measuredAt = measurement.measuredAt.toISOString();
    this.recordedBy = new PhotoUploaderDto(measurement.recordedBy.id, measurement.recordedBy.displayName);
    this.note = measurement.note ?? null;
  }

  static fromEntity (measurement: Measurement): MeasurementResponseDto {
    return new MeasurementResponseDto(measurement);
  }
}
