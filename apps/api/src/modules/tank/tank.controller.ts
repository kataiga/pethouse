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
  async getTanks (): Promise<Tank[]> {
    return this.tankService.getAllTanks();
  }
}
