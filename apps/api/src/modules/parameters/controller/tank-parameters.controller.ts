import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Put, UseGuards,
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
import { CurrentTank } from '@core/tanks/current-tank.decorator';
import { TankAccessGuard } from '@core/tanks/tank-access.guard';
import { Tank } from '@modules/tanks/entity/tank.entity';
import { User } from '@modules/users/entity/user.entity';
import { ResolvedParameterResponseDto } from '../dto/resolved-parameter-response.dto';
import { TankParameterOverrideInputDto } from '../dto/tank-parameter-override-input.dto';
import { TankParametersService } from '../service/tank-parameters.service';

/** The resolved layer: what a tank tracks, for the caller, after account settings and overrides. */
@ApiTags('parameters')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({
  type: ErrorResponseDto,
  description: 'Unknown tank or definition, or the caller is not a member of the household.',
})
@UseGuards(TankAccessGuard)
@Controller('tanks/:tankId/parameters')
export class TankParametersController {
  constructor (private readonly tankParametersService: TankParametersService) {}

  @Get()
  @ApiOperation({
    summary: 'Every parameter as it applies to this tank, enabled or not, with the effective thresholds.',
    description: 'The only place the account layer and the tank layer are merged; clients never do it themselves.',
  })
  @ApiOkResponse({ type: [ResolvedParameterResponseDto] })
  async list (@CurrentUser() user: User, @CurrentTank() tank: Tank): Promise<ResolvedParameterResponseDto[]> {
    const resolved = await this.tankParametersService.resolveFor(tank, user);

    return resolved.map((parameter) => new ResolvedParameterResponseDto(parameter));
  }

  @Put(':definitionId')
  @ApiOperation({
    summary: 'Make this tank deviate from the account setting for one parameter.',
    description: 'Null or absent fields inherit. Sending only nulls removes the deviation.',
  })
  @ApiOkResponse({ type: [ResolvedParameterResponseDto] })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  async override (
    @CurrentUser() user: User,
    @CurrentTank() tank: Tank,
    @Param('definitionId', ParseIntPipe) definitionId: number,
    @Body() dto: TankParameterOverrideInputDto,
  ): Promise<ResolvedParameterResponseDto[]> {
    await this.tankParametersService.setOverride(tank, definitionId, dto);

    return this.list(user, tank);
  }

  @Delete(':definitionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Drop the deviation: the tank follows the account setting again.' })
  @ApiNoContentResponse()
  async inherit (@CurrentTank() tank: Tank, @Param('definitionId', ParseIntPipe) definitionId: number): Promise<void> {
    await this.tankParametersService.clearOverride(tank, definitionId);
  }
}
