import { Controller, Post, Get, Patch, Body, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

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

  /** Get current teacher profile (including whether geminiApiKey is set) */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, geminiApiKey: true },
    });
    return {
      ...user,
      // Mask the key for safety — send only whether it's set and the last 4 chars
      geminiApiKeySet: !!user?.geminiApiKey,
      geminiApiKeyHint: user?.geminiApiKey
        ? `AIza...${user.geminiApiKey.slice(-4)}`
        : null,
      geminiApiKey: undefined, // never expose full key to frontend
    };
  }

  /** Save or clear teacher's personal Gemini API key */
  @UseGuards(JwtAuthGuard)
  @Patch('me/gemini-key')
  async updateGeminiKey(@Request() req: any, @Body('geminiApiKey') key: string) {
    const trimmed = key?.trim() || null;
    await this.prisma.user.update({
      where: { id: req.user.id },
      data: { geminiApiKey: trimmed },
    });
    return {
      geminiApiKeySet: !!trimmed,
      geminiApiKeyHint: trimmed ? `AIza...${trimmed.slice(-4)}` : null,
    };
  }
}
