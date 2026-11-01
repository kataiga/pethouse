import {
  Entity, EntityRepositoryType, Enum, Opt, PrimaryKey, Property,
} from '@mikro-orm/core';
import { Language } from '@common/enums/language.enum';
import { UserRepository } from '../repository/user.repository';

@Entity({
  tableName: 'users',
  repository: () => UserRepository,
})
export class User {
  [EntityRepositoryType]?: UserRepository;

  @PrimaryKey()
  id!: number;

  @Property({
    length: 255,
    unique: true,
  })
  email!: string;

  /** argon2id hash. Never serialised: response DTOs pick the public fields explicitly. */
  @Property({
    length: 255,
    hidden: true,
  })
  passwordHash!: string;

  @Property({ length: 80 })
  displayName!: string;

  @Enum({
    items: () => Language,
    default: Language.FR,
  })
  preferredLanguage: Language & Opt = Language.FR;

  @Property({ onCreate: () => new Date() })
  createdAt: Date & Opt = new Date();

  @Property({
    onCreate: () => new Date(),
    onUpdate: () => new Date(),
  })
  updatedAt: Date & Opt = new Date();
}
