import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'super-secret-key-change-in-prod',
    });
  }

  async validate(payload: any) {
    if (payload.role === 'SUPERADMIN' || payload.role === 'TEACHER') {
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) throw new UnauthorizedException();
      return { id: payload.sub, email: payload.email, role: payload.role };
    }
    
    if (payload.role === 'student') {
      return { id: payload.sub, email: payload.email, role: 'student' };
    }
    
    throw new UnauthorizedException();
  }
}
