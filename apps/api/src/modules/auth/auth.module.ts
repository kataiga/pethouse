import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { JwtAuthGuard } from '@core/auth/jwt-auth.guard';
import { JwtStrategy } from '@core/auth/jwt.strategy';
import { UsersModule } from '@modules/users/users.module';
import { AuthController } from './controller/auth.controller';
import { RefreshToken } from './entity/refresh-token.entity';
import { AuthService } from './service/auth.service';
import { PasswordService } from './service/password.service';

@Module({
  imports: [
    MikroOrmModule.forFeature([RefreshToken]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // Secrets and lifetimes are passed per call: access and refresh tokens use different ones.
    JwtModule.register({}),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AuthModule {}
