import { Controller, Post, Get, Body, Param, Res, UseGuards } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Response } from 'express';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post('start')
  startSession(@Body() body: { roomId: string; studentId: string }) {
    return this.sessionsService.startSession(body.roomId, body.studentId);
  }

  @Get(':id/exists')
  async checkSessionExists(@Param('id') id: string, @Res({ passthrough: true }) res: any) {
    const exists = await this.sessionsService.sessionExists(id);
    if (!exists) {
      res.status(404);
      return { exists: false };
    }
    return { exists: true };
  }

  @Post(':id/block')
  blockSession(@Param('id') id: string) {
    return this.sessionsService.blockSession(id);
  }

  @Post(':id/unblock')
  unblockSession(@Param('id') id: string) {
    return this.sessionsService.unblockSession(id);
  }

  @Post(':id/finish')
  finishSession(@Param('id') id: string) {
    return this.sessionsService.finishSession(id);
  }

  @Post(':id/submit')
  submitAnswers(
    @Param('id') id: string,
    @Body() body: { answers: { questionId: string; selectedOptionIds: string[] }[] },
  ) {
    return this.sessionsService.submitAnswers(id, body.answers);
  }

  @Get('room/:roomId')
  getRoomSessions(@Param('roomId') roomId: string) {
    return this.sessionsService.getSessionsByRoom(roomId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/report')
  async downloadReport(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.sessionsService.getSessionReport(id);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="resultado.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/send-report')
  async sendReport(@Param('id') id: string) {
    return this.sessionsService.sendReportEmail(id);
  }
}
