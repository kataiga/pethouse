import { Injectable } from '@nestjs/common';
import { Tank } from './tank.entity';

@Injectable()
export class TankService {
  private tanks: Tank[] = [
    {
      id: 1,
      name: 'yes',
      createdAt: new Date('10-10-2025'),
    },
  ];

  getTanks (): Array<Tank> {
    return this.tanks;
  }
}
