import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Tank } from './tank.entity';
import { TankService } from './tank.service';
import { TankController } from './tank.controller';

@Module({
  imports: [MikroOrmModule.forFeature([Tank])],
  controllers: [TankController],
  providers: [TankService],
  exports: [TankService],
})
export class TankModule {}