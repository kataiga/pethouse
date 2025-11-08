import { EntityRepository } from '@mikro-orm/mysql';
import { Tank } from './tank.entity';

export class TankRepository extends EntityRepository<Tank> {

  async getTanks (): Promise<Tank[]> {
    return [];
  }
}
