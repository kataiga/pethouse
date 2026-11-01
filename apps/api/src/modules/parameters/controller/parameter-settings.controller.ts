import {
  Body, Controller, Get, Param, Put,
} from '@nestjs/common';
import {
  ApiBadRequestResponse, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ErrorResponseDto } from '@common/dto/error-response.dto';
import { HouseholdsService } from '@modules/households/service/households.service';
import { User } from '@modules/users/entity/user.entity';
import { ParameterSettingResponseDto } from '../dto/parameter-setting-response.dto';
import { TankTypeParamDto } from '../dto/tank-type-param.dto';
import { UpdateParameterSettingsDto } from '../dto/update-parameter-settings.dto';
import { ParameterSettingsService } from '../service/parameter-settings.service';

/** The account-level layer: what every tank of a type inherits, per user. */
@ApiTags('parameters')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@Controller('users/me/parameter-settings/:tankType')
export class ParameterSettingsController {
  constructor (
    private readonly settingsService: ParameterSettingsService,
    private readonly householdsService: HouseholdsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'The caller\'s parameter settings for a tank type, seeded defaults merged in.' })
  @ApiOkResponse({ type: [ParameterSettingResponseDto] })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  async list (@CurrentUser() user: User, @Param() params: TankTypeParamDto): Promise<ParameterSettingResponseDto[]> {
    const settings = await this.settingsService.effectiveFor(user, params.tankType, await this.householdIds(user));

    return settings.map((setting) => new ParameterSettingResponseDto(setting));
  }

  @Put()
  @ApiOperation({
    summary: 'Upsert settings for a tank type. Definitions not listed keep their current value.',
    description: 'Changing an account setting reaches every tank of that type that never deviated from it.',
  })
  @ApiOkResponse({ type: [ParameterSettingResponseDto] })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  async update (
    @CurrentUser() user: User,
    @Param() params: TankTypeParamDto,
    @Body() dto: UpdateParameterSettingsDto,
  ): Promise<ParameterSettingResponseDto[]> {
    const householdIds = await this.householdIds(user);
    const settings = await this.settingsService.update(user, params.tankType, householdIds, dto.settings);

    return settings.map((setting) => new ParameterSettingResponseDto(setting));
  }

  private async householdIds (user: User): Promise<number[]> {
    return (await this.householdsService.listForUser(user)).map((membership) => membership.household.id);
  }
}
