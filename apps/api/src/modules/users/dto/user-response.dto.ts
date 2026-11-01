import { ApiProperty } from '@nestjs/swagger';
import { Language } from '@common/enums/language.enum';
import { User } from '../entity/user.entity';

export class UserResponseDto {
  @ApiProperty({ example: 42 })
  readonly id: number;

  @ApiProperty({ example: 'alex@example.com' })
  readonly email: string;

  @ApiProperty({ example: 'Alex' })
  readonly displayName: string;

  @ApiProperty({
    enum: Language,
    example: Language.FR,
  })
  readonly preferredLanguage: Language;

  @ApiProperty({ example: '2026-01-01T09:00:00.000Z' })
  readonly createdAt: string;

  constructor (user: User) {
    this.id = user.id;
    this.email = user.email;
    this.displayName = user.displayName;
    this.preferredLanguage = user.preferredLanguage;
    this.createdAt = user.createdAt.toISOString();
  }

  static fromEntity (user: User): UserResponseDto {
    return new UserResponseDto(user);
  }
}
