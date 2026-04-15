import {
  Controller, Get, Post, Put, Delete, Patch, Body, Param, UseGuards, Request,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  /** Criar nova chamada para uma turma */
  @Post('class/:classId')
  createRecord(
    @Param('classId') classId: string,
    @Body() body: { date: string; topic?: string; notes?: string },
    @Request() req: any,
  ) {
    return this.attendanceService.createRecord(classId, req.user.id, body);
  }

  /** Listar todas as chamadas de uma turma */
  @Get('class/:classId')
  getClassRecords(@Param('classId') classId: string, @Request() req: any) {
    return this.attendanceService.getClassRecords(classId, req.user.id);
  }

  /** Resumo de frequência por aluno */
  @Get('class/:classId/summary')
  getAttendanceSummary(@Param('classId') classId: string, @Request() req: any) {
    return this.attendanceService.getAttendanceSummary(classId, req.user.id);
  }

  /** Buscar um registro específico */
  @Get(':id')
  getRecord(@Param('id') id: string, @Request() req: any) {
    return this.attendanceService.getRecord(id, req.user.id);
  }

  /** Atualizar cabeçalho do registro (data, tópico, notas) */
  @Put(':id')
  updateRecord(
    @Param('id') id: string,
    @Body() body: { date?: string; topic?: string; notes?: string },
    @Request() req: any,
  ) {
    return this.attendanceService.updateRecord(id, req.user.id, body);
  }

  /** Toggle de presença de um aluno */
  @Patch(':recordId/entry/:studentId')
  updateEntry(
    @Param('recordId') recordId: string,
    @Param('studentId') studentId: string,
    @Body() body: { present: boolean },
    @Request() req: any,
  ) {
    return this.attendanceService.updateEntry(recordId, studentId, req.user.id, body.present);
  }

  /** Excluir um registro de chamada */
  @Delete(':id')
  deleteRecord(@Param('id') id: string, @Request() req: any) {
    return this.attendanceService.deleteRecord(id, req.user.id);
  }
}
