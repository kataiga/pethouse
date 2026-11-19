import {
  Controller, Get, Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse, ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '@common/dto/error-response.dto';
import { CurrentMembership } from '@core/households/current-membership.decorator';
import { HouseholdScoped } from '@core/households/household-scoped.decorator';
import { HouseholdMember } from '@modules/households/entity/household-member.entity';
import { HouseholdOccurrenceResponseDto } from '../dto/household-occurrence-response.dto';
import { ListOccurrencesQueryDto } from '../dto/list-occurrences-query.dto';
import { RoutineOccurrencesService } from '../service/routine-occurrences.service';

@ApiTags('routines')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({
  type: ErrorResponseDto,
  description: 'Unknown household, or the caller is not a member.',
})
@HouseholdScoped()
@Controller('households/:householdId/occurrences')
export class HouseholdOccurrencesController {
  constructor (private readonly occurrencesService: RoutineOccurrencesService) {}

  @Get()
  @ApiOperation({
    summary: 'Occurrences of every active routine of the household in a time range, oldest first.',
    description: 'What the app\'s Today view shows: overdue, due today and coming up, whatever the tank.',
  })
  @ApiOkResponse({ type: [HouseholdOccurrenceResponseDto] })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  async list (
    @CurrentMembership() membership: HouseholdMember,
    @Query() query: ListOccurrencesQueryDto,
  ): Promise<HouseholdOccurrenceResponseDto[]> {
    const occurrences = await this.occurrencesService.listForHousehold(membership.household.id, query.from, query.to);

    return occurrences.map((occurrence) => HouseholdOccurrenceResponseDto.fromEntity(occurrence));
  }
}
