import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Patch,
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
import { ErrorResponseDto } from '@common/dto/error-response.dto';
import { CurrentTank } from '@core/tanks/current-tank.decorator';
import { TankScoped } from '@core/tanks/tank-scoped.decorator';
import { TankResponseDto } from '../dto/tank-response.dto';
import { UpdateTankDto } from '../dto/update-tank.dto';
import { Tank } from '../entity/tank.entity';
import { TanksService } from '../service/tanks.service';

@ApiTags('tanks')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({
  type: ErrorResponseDto,
  description: 'Unknown tank, or the caller is not a member of its household.',
})
@TankScoped()
@Controller('tanks/:tankId')
export class TanksController {
  constructor (private readonly tanksService: TanksService) {}

  @Get()
  @ApiOperation({ summary: 'One tank.' })
  @ApiOkResponse({ type: TankResponseDto })
  get (@CurrentTank() tank: Tank): TankResponseDto {
    return this.tanksService.present(tank);
  }

  @Patch()
  @ApiOperation({ summary: 'Update a tank. Null clears an optional field; the tank type is fixed.' })
  @ApiOkResponse({ type: TankResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  async update (@CurrentTank() tank: Tank, @Body() dto: UpdateTankDto): Promise<TankResponseDto> {
    return this.tanksService.present(await this.tanksService.update(tank, dto));
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a tank and everything attached to it.' })
  @ApiNoContentResponse()
  async remove (@CurrentTank() tank: Tank): Promise<void> {
    await this.tanksService.delete(tank);
  }
}
