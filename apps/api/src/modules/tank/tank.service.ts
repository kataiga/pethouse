import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { Tank } from './tank.entity';
import { Logger } from 'nestjs-pino';

@Injectable()
export class TankService {
  constructor (
    @InjectRepository(Tank)
    private readonly tankRepository: EntityRepository<Tank>,
    private readonly logger: Logger,
  ) {}

  getAllTanks (): Promise<Tank[]> {
    this.logger.log('Pino is working', 'Tank');
    return this.tankRepository.findAll();
  }
}
