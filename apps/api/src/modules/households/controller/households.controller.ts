import {
  Body, Controller, Delete, ForbiddenException, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
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
import { RequireHouseholdRole } from '@core/households/household-role.decorator';
import { HouseholdScoped } from '@core/households/household-scoped.decorator';
import { User } from '@modules/users/entity/user.entity';
import { CreateHouseholdDto } from '../dto/create-household.dto';
import { CreateInviteDto } from '../dto/create-invite.dto';
import { HouseholdMemberResponseDto } from '../dto/household-member-response.dto';
import { HouseholdResponseDto } from '../dto/household-response.dto';
import { InviteResponseDto } from '../dto/invite-response.dto';
import { UpdateHouseholdDto } from '../dto/update-household.dto';
import { UpdateMemberRoleDto } from '../dto/update-member-role.dto';
import { HouseholdMember } from '../entity/household-member.entity';
import { HouseholdRole } from '../entity/household-role.enum';
import { HouseholdsService } from '../service/households.service';
import { InvitesService } from '../service/invites.service';

@ApiTags('households')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@Controller('households')
export class HouseholdsController {
  constructor (
    private readonly householdsService: HouseholdsService,
    private readonly invitesService: InvitesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'The households the authenticated user belongs to.' })
  @ApiOkResponse({ type: [HouseholdResponseDto] })
  async list (@CurrentUser() user: User): Promise<HouseholdResponseDto[]> {
    const memberships = await this.householdsService.listForUser(user);

    return memberships.map(HouseholdResponseDto.fromMembership);
  }

  @Post()
  @ApiOperation({ summary: 'Create a household; the caller becomes its owner.' })
  @ApiCreatedResponse({ type: HouseholdResponseDto })
  async create (@CurrentUser() user: User, @Body() dto: CreateHouseholdDto): Promise<HouseholdResponseDto> {
    const membership = this.householdsService.create(user, dto);
    await this.householdsService.flush();

    return HouseholdResponseDto.fromMembership(membership);
  }

  @Get(':householdId')
  @HouseholdScoped()
  @ApiOperation({ summary: 'One household of the authenticated user.' })
  @ApiOkResponse({ type: HouseholdResponseDto })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Unknown household, or the caller is not a member.',
  })
  get (@CurrentMembership() membership: HouseholdMember): HouseholdResponseDto {
    return HouseholdResponseDto.fromMembership(membership);
  }

  @Patch(':householdId')
  @HouseholdScoped()
  @RequireHouseholdRole(HouseholdRole.OWNER)
  @ApiOperation({ summary: 'Rename a household or change its time zone. Owners only.' })
  @ApiOkResponse({ type: HouseholdResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  async update (
    @CurrentMembership() membership: HouseholdMember,
    @Body() dto: UpdateHouseholdDto,
  ): Promise<HouseholdResponseDto> {
    await this.householdsService.update(membership.household, dto);

    return HouseholdResponseDto.fromMembership(membership);
  }

  @Delete(':householdId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @HouseholdScoped()
  @RequireHouseholdRole(HouseholdRole.OWNER)
  @ApiOperation({ summary: 'Delete a household with its members and invites. Owners only.' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  async remove (@CurrentMembership() membership: HouseholdMember): Promise<void> {
    await this.householdsService.delete(membership.household);
  }

  @Get(':householdId/members')
  @HouseholdScoped()
  @ApiOperation({ summary: 'Members of a household.' })
  @ApiOkResponse({ type: [HouseholdMemberResponseDto] })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  async listMembers (@CurrentMembership() membership: HouseholdMember): Promise<HouseholdMemberResponseDto[]> {
    const members = await this.householdsService.listMembers(membership.household);

    return members.map(HouseholdMemberResponseDto.fromEntity);
  }

  @Patch(':householdId/members/:userId')
  @HouseholdScoped()
  @RequireHouseholdRole(HouseholdRole.OWNER)
  @ApiOperation({ summary: 'Promote a member to owner or demote an owner. Owners only.' })
  @ApiOkResponse({ type: HouseholdMemberResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'The last owner cannot be demoted.',
  })
  async changeRole (
    @CurrentMembership() membership: HouseholdMember,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: UpdateMemberRoleDto,
  ): Promise<HouseholdMemberResponseDto> {
    const member = await this.householdsService.changeRole(membership.household, userId, dto.role);
    await this.householdsService.populateUser(member);

    return HouseholdMemberResponseDto.fromEntity(member);
  }

  @Delete(':householdId/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @HouseholdScoped()
  @ApiOperation({ summary: 'Remove a member (owners), or leave the household (own user id).' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'A member may only remove themselves.',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'The last owner cannot leave; delete the household instead.',
  })
  async removeMember (
    @CurrentMembership() membership: HouseholdMember,
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<void> {
    if (!membership.isOwner() && userId !== membership.user.id) {
      throw new ForbiddenException('A member may only remove themselves');
    }

    await this.householdsService.removeMember(membership.household, userId);
  }

  @Post(':householdId/invites')
  @HouseholdScoped()
  @RequireHouseholdRole(HouseholdRole.OWNER)
  @ApiOperation({ summary: 'Create an invite code to share as a link. Owners only.' })
  @ApiCreatedResponse({ type: InviteResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  async createInvite (
    @CurrentMembership() membership: HouseholdMember,
    @CurrentUser() user: User,
    @Body() dto: CreateInviteDto,
  ): Promise<InviteResponseDto> {
    return InviteResponseDto.fromEntity(await this.invitesService.create(membership.household, user, dto));
  }

  @Get(':householdId/invites')
  @HouseholdScoped()
  @RequireHouseholdRole(HouseholdRole.OWNER)
  @ApiOperation({ summary: 'Invites of a household, newest first. Owners only.' })
  @ApiOkResponse({ type: [InviteResponseDto] })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  async listInvites (@CurrentMembership() membership: HouseholdMember): Promise<InviteResponseDto[]> {
    const invites = await this.invitesService.list(membership.household);

    return invites.map(InviteResponseDto.fromEntity);
  }

  @Delete(':householdId/invites/:inviteId')
  @HouseholdScoped()
  @RequireHouseholdRole(HouseholdRole.OWNER)
  @ApiOperation({ summary: 'Revoke an invite. Owners only. Idempotent.' })
  @ApiOkResponse({ type: InviteResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  async revokeInvite (
    @CurrentMembership() membership: HouseholdMember,
    @Param('inviteId', ParseIntPipe) inviteId: number,
  ): Promise<InviteResponseDto> {
    return InviteResponseDto.fromEntity(await this.invitesService.revoke(membership.household, inviteId));
  }
}
