import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { userRole } from '@/users/entities/user.entity';

export interface JwtPayload {
  sub: string;
  role: userRole;
  sid: string;
}

export interface RequestUser {
  userId: string;
  role: userRole;
  sid: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request): string | null => {
          return typeof req?.cookies?.accessToken === 'string'
            ? req?.cookies?.accessToken
            : null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  validate(payload: JwtPayload): RequestUser {
    return { userId: payload.sub, role: payload.role, sid: payload.sid };
  }
}
