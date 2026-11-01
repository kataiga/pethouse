import {
  Controller, Get, Query, UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiExtraModels, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '@common/dto/error-response.dto';
import { CurrentTank } from '@core/tanks/current-tank.decorator';
import { TankAccessGuard } from '@core/tanks/tank-access.guard';
import { Tank } from '@modules/tanks/entity/tank.entity';
import { OccurrencePageDto } from '../dto/occurrence-page.dto';
import { OccurrenceResponseDto } from '../dto/occurrence-response.dto';
import { RoutineHistoryQueryDto } from '../dto/routine-history-query.dto';
import { RoutineOccurrencesService } from '../service/routine-occurrences.service';

@ApiTags('routines')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({
  type: ErrorResponseDto,
  description: 'Unknown tank, or the caller is not a member of the household.',
})
@ApiExtraModels(OccurrenceResponseDto)
@UseGuards(TankAccessGuard)
@Controller('tanks/:tankId/routine-history')
export class RoutineHistoryController {
  constructor (private readonly occurrencesService: RoutineOccurrencesService) {}

  @Get()
  @ApiOperation({ summary: 'Who did what, when: done, skipped and missed occurrences of the tank, newest first.' })
  @ApiOkResponse({ type: OccurrencePageDto })
  async history (
    @CurrentTank() tank: Tank,
    @Query() query: RoutineHistoryQueryDto,
  ): Promise<InstanceType<typeof OccurrencePageDto>> {
    const page = await this.occurrencesService.history(tank, query.routineId, query.page, query.limit);

    return new OccurrencePageDto({
      ...page,
      data: page.data.map((occurrence) => OccurrenceResponseDto.fromEntity(occurrence)),
    });
  }
}
