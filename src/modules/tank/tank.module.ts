import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Tank } from './tank.entity';
import { TankService } from './tank.service';

@Module({
  imports: [MikroOrmModule.forFeature([Tank])],
  providers: [TankService],
  exports: [TankService],
})
export class TankModule {}