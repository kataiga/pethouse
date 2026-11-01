import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query,
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
import { TankScoped } from '@core/tanks/tank-scoped.decorator';
import { Tank } from '@modules/tanks/entity/tank.entity';
import { User } from '@modules/users/entity/user.entity';
import { CreateRoutineDto } from '../dto/create-routine.dto';
import { ListOccurrencesQueryDto } from '../dto/list-occurrences-query.dto';
import { OccurrenceResponseDto } from '../dto/occurrence-response.dto';
import { PreviewRoutineDto } from '../dto/preview-routine.dto';
import { RoutinePreviewResponseDto } from '../dto/routine-preview-response.dto';
import { RoutineResponseDto } from '../dto/routine-response.dto';
import { UpdateRoutineDto } from '../dto/update-routine.dto';
import { RoutineOccurrencesService } from '../service/routine-occurrences.service';
import { RoutinesService } from '../service/routines.service';

@ApiTags('routines')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({
  type: ErrorResponseDto,
  description: 'Unknown tank or routine, or the caller is not a member of the household.',
})
@TankScoped()
@Controller('tanks/:tankId/routines')
export class RoutinesController {
  constructor (
    private readonly routinesService: RoutinesService,
    private readonly occurrencesService: RoutineOccurrencesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Routines of a tank, with their next occurrence.' })
  @ApiOkResponse({ type: [RoutineResponseDto] })
  async list (@CurrentTank() tank: Tank): Promise<RoutineResponseDto[]> {
    const views = await this.routinesService.list(tank);

    return views.map((view) => RoutineResponseDto.fromView(view));
  }

  @Post()
  @ApiOperation({ summary: 'Create a routine; its occurrences for the coming 30 days are planned at once.' })
  @ApiCreatedResponse({ type: RoutineResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  async create (
    @CurrentUser() user: User,
    @CurrentTank() tank: Tank,
    @Body() dto: CreateRoutineDto,
  ): Promise<RoutineResponseDto> {
    return RoutineResponseDto.fromView(await this.routinesService.create(tank, user, dto));
  }

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Next occurrences a draft rule would produce for this tank\'s household. Saves nothing.' })
  @ApiOkResponse({ type: RoutinePreviewResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  preview (@CurrentTank() tank: Tank, @Body() dto: PreviewRoutineDto): RoutinePreviewResponseDto {
    const preview = this.routinesService.preview(tank, dto);

    return new RoutinePreviewResponseDto(preview.timezone, preview.occurrences);
  }

  @Get(':routineId')
  @ApiOperation({ summary: 'One routine of a tank.' })
  @ApiOkResponse({ type: RoutineResponseDto })
  async findOne (
    @CurrentTank() tank: Tank,
    @Param('routineId', ParseIntPipe) routineId: number,
  ): Promise<RoutineResponseDto> {
    return RoutineResponseDto.fromView(await this.routinesService.findOne(tank, routineId));
  }

  @Patch(':routineId')
  @ApiOperation({ summary: 'Edit a routine. A new rule, start or active flag re-plans the pending occurrences ahead.' })
  @ApiOkResponse({ type: RoutineResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  async update (
    @CurrentTank() tank: Tank,
    @Param('routineId', ParseIntPipe) routineId: number,
    @Body() dto: UpdateRoutineDto,
  ): Promise<RoutineResponseDto> {
    return RoutineResponseDto.fromView(await this.routinesService.update(tank, routineId, dto));
  }

  @Delete(':routineId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a routine and its whole history. Deactivate it to keep the history.' })
  @ApiNoContentResponse()
  async remove (@CurrentTank() tank: Tank, @Param('routineId', ParseIntPipe) routineId: number): Promise<void> {
    await this.routinesService.remove(tank, routineId);
  }

  @Get(':routineId/occurrences')
  @ApiOperation({ summary: 'Occurrences of a routine in a time range, oldest first, whatever their status.' })
  @ApiOkResponse({ type: [OccurrenceResponseDto] })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  async occurrences (
    @CurrentTank() tank: Tank,
    @Param('routineId', ParseIntPipe) routineId: number,
    @Query() query: ListOccurrencesQueryDto,
  ): Promise<OccurrenceResponseDto[]> {
    const routine = await this.routinesService.require(tank, routineId);
    const occurrences = await this.occurrencesService.listForRoutine(routine, query.from, query.to);

    return occurrences.map((occurrence) => OccurrenceResponseDto.fromEntity(occurrence));
  }
}
