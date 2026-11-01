import {
  Controller, HttpCode, HttpStatus, Post, UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ErrorResponseDto } from '@common/dto/error-response.dto';
import { CurrentOccurrence } from '@core/routines/current-occurrence.decorator';
import { OccurrenceAccessGuard } from '@core/routines/occurrence-access.guard';
import { User } from '@modules/users/entity/user.entity';
import { OccurrenceResponseDto } from '../dto/occurrence-response.dto';
import { RoutineOccurrence } from '../entity/routine-occurrence.entity';
import { RoutineOccurrencesService } from '../service/routine-occurrences.service';

@ApiTags('routines')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({
  type: ErrorResponseDto,
  description: 'Unknown occurrence, or the caller is not a member of its household.',
})
@UseGuards(OccurrenceAccessGuard)
@Controller('routine-occurrences/:occurrenceId')
export class RoutineOccurrencesController {
  constructor (private readonly occurrencesService: RoutineOccurrencesService) {}

  @Post('complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark an occurrence done. Target of the notification "Done" action.',
    description: 'Already done: returns it unchanged, with whoever completed it first. The schedule never moves.',
  })
  @ApiOkResponse({ type: OccurrenceResponseDto })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'The occurrence was skipped.',
  })
  async complete (
    @CurrentUser() user: User,
    @CurrentOccurrence() occurrence: RoutineOccurrence,
  ): Promise<OccurrenceResponseDto> {
    return OccurrenceResponseDto.fromEntity(await this.occurrencesService.complete(occurrence, user));
  }

  @Post('skip')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Skip an occurrence on purpose.',
    description: 'Already skipped: returns it unchanged.',
  })
  @ApiOkResponse({ type: OccurrenceResponseDto })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'The occurrence was done.',
  })
  async skip (
    @CurrentUser() user: User,
    @CurrentOccurrence() occurrence: RoutineOccurrence,
  ): Promise<OccurrenceResponseDto> {
    return OccurrenceResponseDto.fromEntity(await this.occurrencesService.skip(occurrence, user));
  }
}
