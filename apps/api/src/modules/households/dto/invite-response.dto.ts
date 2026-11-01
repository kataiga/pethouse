import { ApiProperty } from '@nestjs/swagger';
import { HouseholdInvite } from '../entity/household-invite.entity';

export const INVITE_URL_SCHEME = 'pethouse://invite/';

export class InviteResponseDto {
  @ApiProperty({ example: 7 })
  readonly id: number;

  @ApiProperty({ example: 'k3Jd9xQ2mZpL' })
  readonly code: string;

  @ApiProperty({
    example: 'pethouse://invite/k3Jd9xQ2mZpL',
    description: 'Deep link to share; the app redeems it.',
  })
  readonly url: string;

  @ApiProperty({ example: '2026-01-08T09:00:00.000Z' })
  readonly expiresAt: string;

  @ApiProperty({ example: 10 })
  readonly maxUses: number;

  @ApiProperty({ example: 2 })
  readonly useCount: number;

  @ApiProperty({
    example: null,
    nullable: true,
    type: String,
  })
  readonly revokedAt: string | null;

  @ApiProperty({ description: 'False once expired, revoked or exhausted.' })
  readonly active: boolean;

  @ApiProperty({ example: '2026-01-01T09:00:00.000Z' })
  readonly createdAt: string;

  constructor (invite: HouseholdInvite) {
    this.id = invite.id;
    this.code = invite.code;
    this.url = `${INVITE_URL_SCHEME}${invite.code}`;
    this.expiresAt = invite.expiresAt.toISOString();
    this.maxUses = invite.maxUses;
    this.useCount = invite.useCount;
    this.revokedAt = invite.revokedAt?.toISOString() ?? null;
    this.active = invite.isRedeemable();
    this.createdAt = invite.createdAt.toISOString();
  }

  static fromEntity (invite: HouseholdInvite): InviteResponseDto {
    return new InviteResponseDto(invite);
  }
}
