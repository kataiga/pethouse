import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { Tank } from './tank.entity';

@Injectable()
export class TankService {
  constructor (
    @InjectRepository(Tank)
    private readonly tankRepository: EntityRepository<Tank>,
  ) {}

  getAllTanks (): Promise<Tank[]> {
    return this.tankRepository.findAll();
  }
}
