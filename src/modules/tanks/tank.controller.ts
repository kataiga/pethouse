import {
  Controller, 
  Get, 
} from '@nestjs/common';
import { TankService } from './tank.service';
import { Tank } from './tank.entity';

@Controller('tank')
export class TankController {
  constructor (private tankService: TankService) {}

  @Get()
  getTanks (): Array<Tank> {
    return this.tankService.getTanks();
  }
}
