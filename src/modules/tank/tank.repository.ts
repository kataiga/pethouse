import { EntityRepository } from '@mikro-orm/mysql';
import { Injectable } from '@nestjs/common';
import { Tank } from './tank.entity';

@Injectable()
export class TankRepository extends EntityRepository<Tank> {
  async getTanks (): Promise<Tank[]> {
    return this.findAll();
  }
}