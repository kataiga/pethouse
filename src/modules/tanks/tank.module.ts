import { Module } from '@nestjs/common';
import { TankController } from './tank.controller';
import { TankService } from './tank.service';

@Module({
  imports: [],
  controllers: [TankController],
  providers: [TankService],
  exports: [TankService],
})
export class TanksModule {}
