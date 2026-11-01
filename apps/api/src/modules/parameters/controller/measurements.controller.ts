import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiExtraModels,
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
import { HistoryQueryDto } from '../dto/history-query.dto';
import { HistoryResponseDto } from '../dto/history-response.dto';
import { ListMeasurementsQueryDto } from '../dto/list-measurements-query.dto';
import { MeasurementPageDto } from '../dto/measurement-page.dto';
import { MeasurementResponseDto } from '../dto/measurement-response.dto';
import { RecordMeasurementDto } from '../dto/record-measurement.dto';
import { UpdateMeasurementDto } from '../dto/update-measurement.dto';
import { MeasurementsService } from '../service/measurements.service';

@ApiTags('parameters')
@ApiBearerAuth()
@ApiExtraModels(MeasurementResponseDto)
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({
  type: ErrorResponseDto,
  description: 'Unknown tank, parameter or measurement, or the caller is not a member of the household.',
})
@TankScoped()
@Controller('tanks/:tankId/measurements')
export class MeasurementsController {
  constructor (private readonly measurementsService: MeasurementsService) {}

  @Post()
  @ApiOperation({ summary: 'Record a reading for a parameter the tank tracks.' })
  @ApiCreatedResponse({ type: MeasurementResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Invalid body, or the parameter is not tracked on this tank.',
  })
  async record (
    @CurrentUser() user: User,
    @CurrentTank() tank: Tank,
    @Body() dto: RecordMeasurementDto,
  ): Promise<MeasurementResponseDto> {
    return MeasurementResponseDto.fromEntity(await this.measurementsService.record(tank, user, dto));
  }

  @Get()
  @ApiOperation({ summary: 'Readings of a tank, newest first, optionally for one parameter and a date range.' })
  @ApiOkResponse({ type: MeasurementPageDto })
  async list (
    @CurrentTank() tank: Tank,
    @Query() query: ListMeasurementsQueryDto,
  ): Promise<InstanceType<typeof MeasurementPageDto>> {
    const page = await this.measurementsService.list(tank, query);

    return new MeasurementPageDto({
      ...page,
      data: page.data.map(MeasurementResponseDto.fromEntity),
    });
  }

  @Get('history')
  @ApiOperation({
    summary: 'One parameter aggregated per hour, day or week, with the acceptable range for the chart band.',
  })
  @ApiOkResponse({ type: HistoryResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  async history (
    @CurrentUser() user: User,
    @CurrentTank() tank: Tank,
    @Query() query: HistoryQueryDto,
  ): Promise<HistoryResponseDto> {
    const series = await this.measurementsService.history(tank, user, query);

    return new HistoryResponseDto(series.parameter, query.bucket, series.from, series.to, series.points);
  }

  @Patch(':measurementId')
  @ApiOperation({ summary: 'Correct a reading.' })
  @ApiOkResponse({ type: MeasurementResponseDto })
  async update (
    @CurrentTank() tank: Tank,
    @Param('measurementId', ParseIntPipe) measurementId: number,
    @Body() dto: UpdateMeasurementDto,
  ): Promise<MeasurementResponseDto> {
    return MeasurementResponseDto.fromEntity(await this.measurementsService.update(tank, measurementId, dto));
  }

  @Delete(':measurementId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a reading.' })
  @ApiNoContentResponse()
  async remove (@CurrentTank() tank: Tank, @Param('measurementId', ParseIntPipe) measurementId: number): Promise<void> {
    await this.measurementsService.delete(tank, measurementId);
  }
}
