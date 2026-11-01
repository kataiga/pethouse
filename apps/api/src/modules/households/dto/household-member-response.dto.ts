import { ApiProperty } from '@nestjs/swagger';
import { HouseholdMember } from '../entity/household-member.entity';
import { HouseholdRole } from '../entity/household-role.enum';

export class HouseholdMemberResponseDto {
  @ApiProperty({ example: 42 })
  readonly userId: number;

  @ApiProperty({ example: 'Alex' })
  readonly displayName: string;

  @ApiProperty({ example: 'alex@example.com' })
  readonly email: string;

  @ApiProperty({ enum: HouseholdRole })
  readonly role: HouseholdRole;

  @ApiProperty({ example: '2026-01-01T09:00:00.000Z' })
  readonly joinedAt: string;

  constructor (member: HouseholdMember) {
    this.userId = member.user.id;
    this.displayName = member.user.displayName;
    this.email = member.user.email;
    this.role = member.role;
    this.joinedAt = member.joinedAt.toISOString();
  }

  static fromEntity (member: HouseholdMember): HouseholdMemberResponseDto {
    return new HouseholdMemberResponseDto(member);
  }
}
