import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async studentLogin(name: string, email: string) {
    let student = await this.prisma.student.findUnique({
      where: { email },
    });

    if (!student) {
      student = await this.prisma.student.create({
        data: { name, email },
      });
    }

    const payload = { sub: student.id, email: student.email, role: 'student' };
    
    return {
      access_token: await this.jwtService.signAsync(payload),
      student,
    };
  }

  async teacherLogin(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new UnauthorizedException('Access denied');
    }

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Access denied');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    };
  }
}
