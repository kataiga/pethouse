import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Put,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ErrorResponseDto } from '@common/dto/error-response.dto';
import { User } from '@modules/users/entity/user.entity';
import { DeviceResponseDto } from '../dto/device-response.dto';
import { RegisterDeviceDto } from '../dto/register-device.dto';
import { DeviceTokensService } from '../service/device-tokens.service';

@ApiTags('users')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@Controller('users/me/devices')
export class DevicesController {
  constructor (private readonly devicesService: DeviceTokensService) {}

  @Get()
  @ApiOperation({ summary: 'Devices of the caller that receive routine notifications.' })
  @ApiOkResponse({ type: [DeviceResponseDto] })
  async list (@CurrentUser() user: User): Promise<DeviceResponseDto[]> {
    const devices = await this.devicesService.list(user);

    return devices.map((device) => DeviceResponseDto.fromEntity(device));
  }

  @Put()
  @ApiOperation({
    summary: 'Register or refresh the Expo push token of this installation.',
    description: 'Call it at every launch. A token known for another account moves to the caller.',
  })
  @ApiOkResponse({ type: DeviceResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  async register (@CurrentUser() user: User, @Body() dto: RegisterDeviceDto): Promise<DeviceResponseDto> {
    return DeviceResponseDto.fromEntity(await this.devicesService.register(user, dto));
  }

  @Delete(':deviceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Stop notifications to one device, on sign-out.' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  async revoke (@CurrentUser() user: User, @Param('deviceId', ParseIntPipe) deviceId: number): Promise<void> {
    await this.devicesService.revoke(user, deviceId);
  }
}
