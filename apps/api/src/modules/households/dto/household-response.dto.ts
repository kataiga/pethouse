import { ApiProperty } from '@nestjs/swagger';
import { HouseholdMember } from '../entity/household-member.entity';
import { HouseholdRole } from '../entity/household-role.enum';
import { Household } from '../entity/household.entity';

/** A household as seen by one of its members: carries that member's role. */
export class HouseholdResponseDto {
  @ApiProperty({ example: 1 })
  readonly id: number;

  @ApiProperty({ example: 'Home' })
  readonly name: string;

  @ApiProperty({ example: 'Europe/Paris' })
  readonly timezone: string;

  @ApiProperty({
    enum: HouseholdRole,
    description: 'Role of the authenticated user in this household.',
  })
  readonly role: HouseholdRole;

  @ApiProperty({ example: '2026-01-01T09:00:00.000Z' })
  readonly createdAt: string;

  constructor (household: Household, role: HouseholdRole) {
    this.id = household.id;
    this.name = household.name;
    this.timezone = household.timezone;
    this.role = role;
    this.createdAt = household.createdAt.toISOString();
  }

  static fromMembership (membership: HouseholdMember): HouseholdResponseDto {
    return new HouseholdResponseDto(membership.household, membership.role);
  }
}
