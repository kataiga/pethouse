import {
  Body, Controller, HttpCode, HttpStatus, Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { ErrorResponseDto } from '@common/dto/error-response.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { RegisterDto } from '../dto/register.dto';
import { AuthService } from '../service/auth.service';

@ApiTags('auth')
@ApiBadRequestResponse({ type: ErrorResponseDto })
@Public()
@Controller('auth')
export class AuthController {
  constructor (private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Create an account and open a session.' })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'An account already exists for this email.',
  })
  async register (@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    const result = await this.authService.register(dto);

    return new AuthResponseDto(result.user, result.tokens);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Open a session with email and password.' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  async login (@Body() dto: LoginDto): Promise<AuthResponseDto> {
    const result = await this.authService.login(dto);

    return new AuthResponseDto(result.user, result.tokens);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a refresh token for a new token pair. The old one is revoked.' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Invalid, expired, revoked or reused refresh token.',
  })
  async refresh (@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    const result = await this.authService.refresh(dto.refreshToken);

    return new AuthResponseDto(result.user, result.tokens);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a refresh token. Always succeeds.' })
  @ApiNoContentResponse()
  async logout (@Body() dto: RefreshTokenDto): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }
}
