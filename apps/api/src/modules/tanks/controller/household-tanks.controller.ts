import {
  Body, Controller, Get, Post, UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '@common/dto/error-response.dto';
import { CurrentMembership } from '@core/households/current-membership.decorator';
import { HouseholdMemberGuard } from '@core/households/household-member.guard';
import { HouseholdMember } from '@modules/households/entity/household-member.entity';
import { CreateTankDto } from '../dto/create-tank.dto';
import { TankResponseDto } from '../dto/tank-response.dto';
import { TanksService } from '../service/tanks.service';

@ApiTags('tanks')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({
  type: ErrorResponseDto,
  description: 'Unknown household, or the caller is not a member.',
})
@UseGuards(HouseholdMemberGuard)
@Controller('households/:householdId/tanks')
export class HouseholdTanksController {
  constructor (private readonly tanksService: TanksService) {}

  @Get()
  @ApiOperation({ summary: 'Tanks of a household, oldest first.' })
  @ApiOkResponse({ type: [TankResponseDto] })
  async list (@CurrentMembership() membership: HouseholdMember): Promise<TankResponseDto[]> {
    const tanks = await this.tanksService.listForHousehold(membership.household);

    return tanks.map(TankResponseDto.fromEntity);
  }

  @Post()
  @ApiOperation({ summary: 'Create a tank in a household. Any member may.' })
  @ApiCreatedResponse({ type: TankResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Invalid body, or a subtype that does not match the tank type.',
  })
  async create (
    @CurrentMembership() membership: HouseholdMember,
    @Body() dto: CreateTankDto,
  ): Promise<TankResponseDto> {
    return TankResponseDto.fromEntity(await this.tanksService.create(membership.household, dto));
  }
}
