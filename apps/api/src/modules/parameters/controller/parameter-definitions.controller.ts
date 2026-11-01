import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, UseGuards,
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
import { CreateParameterDefinitionDto } from '../dto/create-parameter-definition.dto';
import { ParameterDefinitionResponseDto } from '../dto/parameter-definition-response.dto';
import { ParameterDefinitionsService } from '../service/parameter-definitions.service';

@ApiTags('parameters')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@Controller()
export class ParameterDefinitionsController {
  constructor (
    private readonly definitionsService: ParameterDefinitionsService,
    private readonly householdsService: HouseholdsService,
  ) {}

  @Get('parameter-definitions')
  @ApiOperation({ summary: 'System definitions plus the custom ones of every household of the caller.' })
  @ApiOkResponse({ type: [ParameterDefinitionResponseDto] })
  async list (@CurrentUser() user: User): Promise<ParameterDefinitionResponseDto[]> {
    const memberships = await this.householdsService.listForUser(user);
    const definitions = await this.definitionsService.listVisible(memberships.map((m) => m.household.id));

    return definitions.map(ParameterDefinitionResponseDto.fromEntity);
  }

  @Post('households/:householdId/parameter-definitions')
  @UseGuards(HouseholdMemberGuard)
  @ApiOperation({ summary: 'Add a custom parameter to a household. Any member may.' })
  @ApiCreatedResponse({ type: ParameterDefinitionResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'A system or household parameter with the same name exists.',
  })
  async create (
    @CurrentMembership() membership: HouseholdMember,
    @Body() dto: CreateParameterDefinitionDto,
  ): Promise<ParameterDefinitionResponseDto> {
    const definition = await this.definitionsService.createCustom(membership.household, dto);

    return ParameterDefinitionResponseDto.fromEntity(definition);
  }

  @Delete('households/:householdId/parameter-definitions/:definitionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(HouseholdMemberGuard)
  @ApiOperation({ summary: 'Remove a custom parameter with its settings, overrides and measurements.' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  async remove (
    @CurrentMembership() membership: HouseholdMember,
    @Param('definitionId', ParseIntPipe) definitionId: number,
  ): Promise<void> {
    await this.definitionsService.deleteCustom(membership.household, definitionId);
  }
}
