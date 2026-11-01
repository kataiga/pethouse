import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '@modules/users/dto/user-response.dto';
import { User } from '@modules/users/entity/user.entity';
import {
  AuthTokensResponseDto, IssuedTokens,
} from './auth-tokens-response.dto';

export class AuthResponseDto {
  @ApiProperty({ type: () => UserResponseDto })
  readonly user: UserResponseDto;

  @ApiProperty({ type: () => AuthTokensResponseDto })
  readonly tokens: AuthTokensResponseDto;

  constructor (user: User, tokens: IssuedTokens) {
    this.user = UserResponseDto.fromEntity(user);
    this.tokens = new AuthTokensResponseDto(tokens);
  }
}
