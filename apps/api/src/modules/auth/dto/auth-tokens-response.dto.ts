import { ApiProperty } from '@nestjs/swagger';

export interface IssuedTokens {
  accessToken: string;
  accessExpiresInSeconds: number;
  refreshToken: string;
  refreshExpiresInSeconds: number;
}

export class AuthTokensResponseDto {
  @ApiProperty({ description: 'Bearer token for the Authorization header.' })
  readonly accessToken: string;

  @ApiProperty({
    example: 900,
    description: 'Access token lifetime in seconds.',
  })
  readonly accessExpiresInSeconds: number;

  @ApiProperty({ description: 'Single-use: each refresh returns a new pair and revokes this one.' })
  readonly refreshToken: string;

  @ApiProperty({
    example: 2592000,
    description: 'Refresh token lifetime in seconds.',
  })
  readonly refreshExpiresInSeconds: number;

  constructor (tokens: IssuedTokens) {
    this.accessToken = tokens.accessToken;
    this.accessExpiresInSeconds = tokens.accessExpiresInSeconds;
    this.refreshToken = tokens.refreshToken;
    this.refreshExpiresInSeconds = tokens.refreshExpiresInSeconds;
  }
}
