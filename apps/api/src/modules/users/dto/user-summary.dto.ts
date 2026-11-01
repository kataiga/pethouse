import { ApiProperty } from '@nestjs/swagger';
import { User } from '../entity/user.entity';

/** The public face of a member inside household-scoped responses. */
export class UserSummaryDto {
  @ApiProperty({ example: 42 })
  readonly id: number;

  @ApiProperty({ example: 'Alex' })
  readonly displayName: string;

  constructor (user: User) {
    this.id = user.id;
    this.displayName = user.displayName;
  }
}
