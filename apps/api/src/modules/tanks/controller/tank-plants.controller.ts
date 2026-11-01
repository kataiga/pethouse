import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
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
import { User } from '@modules/users/entity/user.entity';
import { AddTankPlantDto } from '../dto/add-tank-plant.dto';
import { ListTankInhabitantsQueryDto } from '../dto/list-tank-inhabitants-query.dto';
import { TankPlantResponseDto } from '../dto/tank-plant-response.dto';
import { UpdateTankPlantDto } from '../dto/update-tank-plant.dto';
import { Tank } from '../entity/tank.entity';
import { TankPlantsService } from '../service/tank-plants.service';

@ApiTags('tanks')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({
  type: ErrorResponseDto,
  description: 'Unknown tank or entry, or the caller is not a member of the household.',
})
@UseGuards(TankAccessGuard)
@Controller('tanks/:tankId/plants')
export class TankPlantsController {
  constructor (private readonly tankPlantsService: TankPlantsService) {}

  @Get()
  @ApiOperation({ summary: 'Plants of a tank, current ones by default.' })
  @ApiOkResponse({ type: [TankPlantResponseDto] })
  async list (
    @CurrentUser() user: User,
    @CurrentTank() tank: Tank,
    @Query() query: ListTankInhabitantsQueryDto,
  ): Promise<TankPlantResponseDto[]> {
    const entries = await this.tankPlantsService.list(tank, query.includeRemoved);

    return entries.map((entry) => TankPlantResponseDto.fromEntity(entry, user.preferredLanguage));
  }

  @Post()
  @ApiOperation({ summary: 'Add a plant species to a tank with a plant count.' })
  @ApiCreatedResponse({ type: TankPlantResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  async add (
    @CurrentUser() user: User,
    @CurrentTank() tank: Tank,
    @Body() dto: AddTankPlantDto,
  ): Promise<TankPlantResponseDto> {
    return TankPlantResponseDto.fromEntity(await this.tankPlantsService.add(tank, dto), user.preferredLanguage);
  }

  @Patch(':entryId')
  @ApiOperation({ summary: 'Change the plant count, dates or notes of an entry.' })
  @ApiOkResponse({ type: TankPlantResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  async update (
    @CurrentUser() user: User,
    @CurrentTank() tank: Tank,
    @Param('entryId', ParseIntPipe) entryId: number,
    @Body() dto: UpdateTankPlantDto,
  ): Promise<TankPlantResponseDto> {
    const entry = await this.tankPlantsService.update(tank, entryId, dto);

    return TankPlantResponseDto.fromEntity(entry, user.preferredLanguage);
  }

  @Delete(':entryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an entry outright. Prefer a removal date to keep the history.' })
  @ApiNoContentResponse()
  async remove (@CurrentTank() tank: Tank, @Param('entryId', ParseIntPipe) entryId: number): Promise<void> {
    await this.tankPlantsService.remove(tank, entryId);
  }
}
