import { Injectable } from '@nestjs/common';
import { EntityRepository } from '@mikro-orm/mysql';
import { InjectRepository } from '@mikro-orm/nestjs';
import { TankType } from '@common/enums/tank-type.enum';
import { RoutineTemplate } from '../entity/routine-template.entity';

@Injectable()
export class RoutineTemplatesService {
  constructor (
    @InjectRepository(RoutineTemplate)
    private readonly templates: EntityRepository<RoutineTemplate>,
  ) {}

  list (tankType?: TankType): Promise<RoutineTemplate[]> {
    return this.templates.find(tankType === undefined ? {} : { tankType }, {
      orderBy: {
        tankType: 'asc',
        position: 'asc',
        id: 'asc',
      },
    });
  }
}
