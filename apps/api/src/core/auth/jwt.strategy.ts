import {
  Inject, Injectable, UnauthorizedException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import {
  ExtractJwt, Strategy,
} from 'passport-jwt';
import { jwtConfig } from '@config';
import { User } from '@modules/users/entity/user.entity';
import { UsersService } from '@modules/users/service/users.service';
import { AccessTokenPayload } from './jwt-payload';

/** Validates the bearer access token and resolves it to the user, which becomes `request.user`. */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor (
    @Inject(jwtConfig.KEY) jwt: ConfigType<typeof jwtConfig>,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: jwt.accessSecret,
      ignoreExpiration: false,
    });
  }

  async validate (payload: AccessTokenPayload): Promise<User> {
    const user = typeof payload.sub === 'number' ? await this.usersService.findById(payload.sub) : null;

    if (!user) {
      throw new UnauthorizedException('Unknown user');
    }

    return user;
  }
}
