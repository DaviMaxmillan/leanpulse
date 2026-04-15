import { Controller, Post, Get, Delete, Body, Param, UseGuards, Request, Res } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import * as express from 'express';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createRoom(@Body() body: { name: string; examId: string; classId?: string }, @Request() req: any) {
    return this.roomsService.createRoom(body.name, body.examId, req.user.id, body.classId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  getTeacherRooms(@Request() req: any) {
    return this.roomsService.getRoomsByTeacher(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/finish')
  finishRoom(@Param('id') id: string, @Request() req: any) {
    return this.roomsService.finishRoom(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  deleteRoom(@Param('id') id: string, @Request() req: any) {
    return this.roomsService.deleteRoom(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/reactivate')
  reactivateRoom(@Param('id') id: string, @Body() body: { examId: string }, @Request() req: any) {
    return this.roomsService.reactivateRoom(id, body.examId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/report')
  async getRoomReport(@Param('id') id: string, @Request() req: any, @Res() res: express.Response) {
    const buffer = await this.roomsService.generateRoomReport(id, req.user.id);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="relatorio-sala-${id}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  // Used by student app
  @Get('by-name/:name')
  getRoomByName(@Param('name') name: string) {
    return this.roomsService.getRoomByName(name);
  }
}
