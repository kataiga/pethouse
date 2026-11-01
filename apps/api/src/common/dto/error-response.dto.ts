import {
  ApiProperty, ApiPropertyOptional,
} from '@nestjs/swagger';

export interface ErrorResponseProps {
  statusCode: number;
  error: string;
  message: string;
  details?: string[];
  path: string;
}

/** The single error shape every endpoint returns, produced by the global exception filter. */
export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  readonly statusCode: number;

  @ApiProperty({
    example: 'Bad Request',
    description: 'HTTP reason phrase.',
  })
  readonly error: string;

  @ApiProperty({
    example: 'Validation failed',
    description: 'Human-readable summary.',
  })
  readonly message: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['name must be a string'],
    description: 'One entry per violated constraint when the request body is invalid.',
  })
  readonly details?: string[];

  @ApiProperty({ example: '/api/health' })
  readonly path: string;

  @ApiProperty({
    example: '2026-01-01T09:00:00.000Z',
    description: 'ISO 8601 timestamp of the response.',
  })
  readonly timestamp: string;

  constructor (props: ErrorResponseProps) {
    this.statusCode = props.statusCode;
    this.error = props.error;
    this.message = props.message;
    this.details = props.details;
    this.path = props.path;
    this.timestamp = new Date().toISOString();
  }
}
