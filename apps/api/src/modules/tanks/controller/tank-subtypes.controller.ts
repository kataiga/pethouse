import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Query, UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
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
import { CurrentMembership } from '@core/households/current-membership.decorator';
import { HouseholdMemberGuard } from '@core/households/household-member.guard';
import { HouseholdMember } from '@modules/households/entity/household-member.entity';
import { HouseholdsService } from '@modules/households/service/households.service';
import { User } from '@modules/users/entity/user.entity';
import { CreateTankSubtypeDto } from '../dto/create-tank-subtype.dto';
import { ListTankSubtypesQueryDto } from '../dto/list-tank-subtypes-query.dto';
import { TankSubtypeResponseDto } from '../dto/tank-subtype-response.dto';
import { TankSubtypesService } from '../service/tank-subtypes.service';

@ApiTags('tanks')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@Controller()
export class TankSubtypesController {
  constructor (
    private readonly subtypesService: TankSubtypesService,
    private readonly householdsService: HouseholdsService,
  ) {}

  @Get('tank-subtypes')
  @ApiOperation({ summary: 'System subtypes plus the custom ones of every household of the caller.' })
  @ApiOkResponse({ type: [TankSubtypeResponseDto] })
  async list (@CurrentUser() user: User, @Query() query: ListTankSubtypesQueryDto): Promise<TankSubtypeResponseDto[]> {
    const memberships = await this.householdsService.listForUser(user);
    const subtypes = await this.subtypesService.listVisible(
      memberships.map((membership) => membership.household.id),
      query.tankType,
    );

    return subtypes.map(TankSubtypeResponseDto.fromEntity);
  }

  @Post('households/:householdId/subtypes')
  @UseGuards(HouseholdMemberGuard)
  @ApiOperation({ summary: 'Add a custom subtype to a household. Any member may.' })
  @ApiCreatedResponse({ type: TankSubtypeResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'A system or household subtype with the same name exists for this tank type.',
  })
  async create (
    @CurrentMembership() membership: HouseholdMember,
    @Body() dto: CreateTankSubtypeDto,
  ): Promise<TankSubtypeResponseDto> {
    return TankSubtypeResponseDto.fromEntity(await this.subtypesService.createCustom(membership.household, dto));
  }

  @Delete('households/:householdId/subtypes/:subtypeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(HouseholdMemberGuard)
  @ApiOperation({ summary: 'Remove a custom subtype; tanks using it keep no subtype. System ones cannot go.' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  async remove (
    @CurrentMembership() membership: HouseholdMember,
    @Param('subtypeId', ParseIntPipe) subtypeId: number,
  ): Promise<void> {
    await this.subtypesService.deleteCustom(membership.household, subtypeId);
  }
}
