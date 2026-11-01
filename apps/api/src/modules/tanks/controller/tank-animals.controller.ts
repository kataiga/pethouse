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
import { AddTankAnimalDto } from '../dto/add-tank-animal.dto';
import { ListTankInhabitantsQueryDto } from '../dto/list-tank-inhabitants-query.dto';
import { TankAnimalResponseDto } from '../dto/tank-animal-response.dto';
import { UpdateTankAnimalDto } from '../dto/update-tank-animal.dto';
import { Tank } from '../entity/tank.entity';
import { TankAnimalsService } from '../service/tank-animals.service';

@ApiTags('tanks')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({
  type: ErrorResponseDto,
  description: 'Unknown tank or entry, or the caller is not a member of the household.',
})
@UseGuards(TankAccessGuard)
@Controller('tanks/:tankId/animals')
export class TankAnimalsController {
  constructor (private readonly tankAnimalsService: TankAnimalsService) {}

  @Get()
  @ApiOperation({ summary: 'Animals of a tank, current ones by default.' })
  @ApiOkResponse({ type: [TankAnimalResponseDto] })
  async list (
    @CurrentUser() user: User,
    @CurrentTank() tank: Tank,
    @Query() query: ListTankInhabitantsQueryDto,
  ): Promise<TankAnimalResponseDto[]> {
    const entries = await this.tankAnimalsService.list(tank, query.includeRemoved);

    return entries.map((entry) => TankAnimalResponseDto.fromEntity(entry, user.preferredLanguage));
  }

  @Post()
  @ApiOperation({ summary: 'Add a species to a tank with a head count.' })
  @ApiCreatedResponse({ type: TankAnimalResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  async add (
    @CurrentUser() user: User,
    @CurrentTank() tank: Tank,
    @Body() dto: AddTankAnimalDto,
  ): Promise<TankAnimalResponseDto> {
    return TankAnimalResponseDto.fromEntity(await this.tankAnimalsService.add(tank, dto), user.preferredLanguage);
  }

  @Patch(':entryId')
  @ApiOperation({ summary: 'Change the head count, dates or notes of an entry.' })
  @ApiOkResponse({ type: TankAnimalResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  async update (
    @CurrentUser() user: User,
    @CurrentTank() tank: Tank,
    @Param('entryId', ParseIntPipe) entryId: number,
    @Body() dto: UpdateTankAnimalDto,
  ): Promise<TankAnimalResponseDto> {
    const entry = await this.tankAnimalsService.update(tank, entryId, dto);

    return TankAnimalResponseDto.fromEntity(entry, user.preferredLanguage);
  }

  @Delete(':entryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an entry outright. Prefer a removal date to keep the history.' })
  @ApiNoContentResponse()
  async remove (@CurrentTank() tank: Tank, @Param('entryId', ParseIntPipe) entryId: number): Promise<void> {
    await this.tankAnimalsService.remove(tank, entryId);
  }
}
