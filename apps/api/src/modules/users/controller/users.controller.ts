import {
  Body, Controller, Get, Patch,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ErrorResponseDto } from '@common/dto/error-response.dto';
import { UpdateMeDto } from '../dto/update-me.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { User } from '../entity/user.entity';
import { UsersService } from '../service/users.service';

@ApiTags('users')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@Controller('users')
export class UsersController {
  constructor (private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'The authenticated user.' })
  @ApiOkResponse({ type: UserResponseDto })
  me (@CurrentUser() user: User): UserResponseDto {
    return UserResponseDto.fromEntity(user);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update display name and preferred language.' })
  @ApiOkResponse({ type: UserResponseDto })
  async updateMe (@CurrentUser() user: User, @Body() changes: UpdateMeDto): Promise<UserResponseDto> {
    return UserResponseDto.fromEntity(await this.usersService.updateProfile(user, changes));
  }
}
