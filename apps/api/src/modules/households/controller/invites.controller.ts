import {
  Controller, HttpCode, HttpStatus, Param, Post,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ErrorResponseDto } from '@common/dto/error-response.dto';
import { User } from '@modules/users/entity/user.entity';
import { HouseholdResponseDto } from '../dto/household-response.dto';
import { InvitesService } from '../service/invites.service';

@ApiTags('households')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@Controller('invites')
export class InvitesController {
  constructor (private readonly invitesService: InvitesService) {}

  @Post(':code/redeem')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Join the household behind an invite code as a member.',
    description: 'Redeeming a code of a household the caller already belongs to is a no-op.',
  })
  @ApiOkResponse({ type: HouseholdResponseDto })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Unknown, expired, revoked or exhausted code.',
  })
  async redeem (@Param('code') code: string, @CurrentUser() user: User): Promise<HouseholdResponseDto> {
    return HouseholdResponseDto.fromMembership(await this.invitesService.redeem(code, user));
  }
}
