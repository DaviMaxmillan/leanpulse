import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('student')
  studentLogin(@Body() signInDto: Record<string, string>) {
    return this.authService.studentLogin(signInDto.name, signInDto.email);
  }

  @HttpCode(HttpStatus.OK)
  @Post('teacher')
  teacherLogin(@Body() signInDto: Record<string, string>) {
    return this.authService.teacherLogin(signInDto.email, signInDto.password);
  }
}
