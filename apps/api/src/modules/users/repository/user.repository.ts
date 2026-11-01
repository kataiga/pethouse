import { EntityRepository } from '@mikro-orm/mysql';
import type { User } from '../entity/user.entity';

export class UserRepository extends EntityRepository<User> {
  findByEmail (email: string): Promise<User | null> {
    return this.findOne({ email: email.toLowerCase() });
  }
}
