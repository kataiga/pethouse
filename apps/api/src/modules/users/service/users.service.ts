import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Language } from '@common/enums/language.enum';
import { UpdateMeDto } from '../dto/update-me.dto';
import { User } from '../entity/user.entity';
import { UserRepository } from '../repository/user.repository';

export interface NewUser {
  email: string;
  passwordHash: string;
  displayName: string;
  preferredLanguage?: Language;
}

@Injectable()
export class UsersService {
  constructor (
    @InjectRepository(User)
    private readonly users: UserRepository,
  ) {}

  /** Builds and persists a user without flushing; the caller owns the unit of work. */
  create (props: NewUser): User {
    const user = this.users.create({
      email: props.email.toLowerCase(),
      passwordHash: props.passwordHash,
      displayName: props.displayName,
      preferredLanguage: props.preferredLanguage ?? Language.FR,
    });
    this.users.getEntityManager().persist(user);

    return user;
  }

  findById (id: number): Promise<User | null> {
    return this.users.findOne({ id });
  }

  findByEmail (email: string): Promise<User | null> {
    return this.users.findByEmail(email);
  }

  async updateProfile (user: User, changes: UpdateMeDto): Promise<User> {
    if (changes.displayName !== undefined) {
      user.displayName = changes.displayName;
    }

    if (changes.preferredLanguage !== undefined) {
      user.preferredLanguage = changes.preferredLanguage;
    }

    await this.users.getEntityManager().flush();

    return user;
  }
}
