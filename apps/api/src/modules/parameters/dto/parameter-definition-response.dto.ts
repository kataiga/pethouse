import { ApiProperty } from '@nestjs/swagger';
import { ParameterDefinition } from '../entity/parameter-definition.entity';

export class ParameterDefinitionResponseDto {
  @ApiProperty({ example: 3 })
  readonly id: number;

  @ApiProperty({
    example: 'ph',
    description: 'Stable key. System definitions are translated by the app from it.',
  })
  readonly slug: string;

  @ApiProperty({ example: 'pH' })
  readonly name: string;

  @ApiProperty({
    example: 'mg/L',
    description: 'Empty for dimensionless values such as pH.',
  })
  readonly unit: string;

  @ApiProperty({
    example: 1,
    description: 'Decimals to display and accept.',
  })
  readonly decimals: number;

  @ApiProperty()
  readonly isSystem: boolean;

  constructor (definition: ParameterDefinition) {
    this.id = definition.id;
    this.slug = definition.slug;
    this.name = definition.name;
    this.unit = definition.unit;
    this.decimals = definition.decimals;
    this.isSystem = definition.isSystem;
  }

  static fromEntity (definition: ParameterDefinition): ParameterDefinitionResponseDto {
    return new ParameterDefinitionResponseDto(definition);
  }
}
