import {
  Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request,
} from '@nestjs/common';
import { ClassesService } from './classes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  // ─── Join por Código (público — DEVE vir ANTES das rotas :id) ───────────────

  @Get('join/:code')
  getClassByCode(@Param('code') code: string) {
    return this.classesService.getClassByCode(code);
  }

  @Post('join/:code')
  joinByCode(
    @Param('code') code: string,
    @Body() body: { name: string; email: string },
  ) {
    return this.classesService.joinByCode(code, body);
  }

  // ─── Turmas (Professor autenticado) ──────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post()
  createClass(
    @Body() body: { name: string; subject?: string; description?: string; period?: string },
    @Request() req: any,
  ) {
    return this.classesService.createClass(req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  getMyClasses(@Request() req: any) {
    return this.classesService.getTeacherClasses(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getClass(@Param('id') id: string, @Request() req: any) {
    return this.classesService.getClassById(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  updateClass(
    @Param('id') id: string,
    @Body() body: { name?: string; subject?: string; description?: string; period?: string },
    @Request() req: any,
  ) {
    return this.classesService.updateClass(id, req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  deleteClass(@Param('id') id: string, @Request() req: any) {
    return this.classesService.deleteClass(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/clone')
  cloneClass(@Param('id') id: string, @Request() req: any) {
    return this.classesService.cloneClass(id, req.user.id);
  }

  // ─── Desempenho ──────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get(':id/performance')
  getPerformance(@Param('id') id: string, @Request() req: any) {
    return this.classesService.getClassPerformance(id, req.user.id);
  }

  // ─── Alunos ──────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post(':id/students')
  addStudent(
    @Param('id') id: string,
    @Body() body: { name: string; email: string },
    @Request() req: any,
  ) {
    return this.classesService.addStudent(id, req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/students/bulk')
  bulkAddStudents(
    @Param('id') id: string,
    @Body() body: { students: { name: string; email: string }[] },
    @Request() req: any,
  ) {
    return this.classesService.bulkAddStudents(id, req.user.id, body.students);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':classId/students/:studentId')
  removeStudent(
    @Param('classId') classId: string,
    @Param('studentId') studentId: string,
    @Request() req: any,
  ) {
    return this.classesService.removeStudent(classId, studentId, req.user.id);
  }
}
