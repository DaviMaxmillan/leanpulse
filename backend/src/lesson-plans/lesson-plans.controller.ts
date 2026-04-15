import {
  Controller, Get, Post, Put, Delete, Patch, Body, Param, UseGuards, Request,
  UploadedFile, UseInterceptors, Res, StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as express from 'express';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';
import { LessonPlansService } from './lesson-plans.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('lesson-plans')
@UseGuards(JwtAuthGuard)
export class LessonPlansController {
  constructor(private readonly lessonPlansService: LessonPlansService) {}

  // ─── CRUD de Planos ───────────────────────────────────────────────────────

  @Post()
  createPlan(
    @Body() body: { title: string; subject?: string; description?: string },
    @Request() req: any,
  ) {
    return this.lessonPlansService.createPlan(req.user.id, body);
  }

  @Get()
  getMyPlans(@Request() req: any) {
    return this.lessonPlansService.getTeacherPlans(req.user.id);
  }

  @Get(':id')
  getPlan(@Param('id') id: string, @Request() req: any) {
    return this.lessonPlansService.getPlanById(id, req.user.id);
  }

  @Put(':id')
  updatePlan(
    @Param('id') id: string,
    @Body() body: { title?: string; subject?: string; description?: string },
    @Request() req: any,
  ) {
    return this.lessonPlansService.updatePlan(id, req.user.id, body);
  }

  @Delete(':id')
  deletePlan(@Param('id') id: string, @Request() req: any) {
    return this.lessonPlansService.deletePlan(id, req.user.id);
  }

  // ─── Vincular a turmas ────────────────────────────────────────────────────

  @Post(':planId/assign/:classId')
  assignToClass(
    @Param('planId') planId: string,
    @Param('classId') classId: string,
    @Request() req: any,
  ) {
    return this.lessonPlansService.assignPlanToClass(planId, classId, req.user.id);
  }

  @Delete('class/:classId/unassign')
  unassignFromClass(@Param('classId') classId: string, @Request() req: any) {
    return this.lessonPlansService.unassignPlanFromClass(classId, req.user.id);
  }

  // ─── CRUD de Aulas ────────────────────────────────────────────────────────

  @Post(':planId/lessons')
  addLesson(
    @Param('planId') planId: string,
    @Body() body: { title: string; topic?: string; objectives?: string },
    @Request() req: any,
  ) {
    return this.lessonPlansService.addLesson(planId, req.user.id, body);
  }

  @Put('lessons/:lessonId')
  updateLesson(
    @Param('lessonId') lessonId: string,
    @Body() body: { title?: string; topic?: string; objectives?: string; status?: string },
    @Request() req: any,
  ) {
    return this.lessonPlansService.updateLesson(lessonId, req.user.id, body);
  }

  @Delete('lessons/:lessonId')
  deleteLesson(@Param('lessonId') lessonId: string, @Request() req: any) {
    return this.lessonPlansService.deleteLesson(lessonId, req.user.id);
  }

  // ─── Pastas ───────────────────────────────────────────────────────────────

  @Post('lessons/:lessonId/folders')
  createFolder(
    @Param('lessonId') lessonId: string,
    @Body() body: { name: string },
    @Request() req: any,
  ) {
    return this.lessonPlansService.createFolder(lessonId, req.user.id, body);
  }

  @Delete('folders/:folderId')
  deleteFolder(@Param('folderId') folderId: string, @Request() req: any) {
    return this.lessonPlansService.deleteFolder(folderId, req.user.id);
  }

  // ─── Materiais ────────────────────────────────────────────────────────────

  @Post('lessons/:lessonId/materials/link')
  addLink(
    @Param('lessonId') lessonId: string,
    @Body() body: { type: string; title: string; url: string; folderId?: string },
    @Request() req: any,
  ) {
    return this.lessonPlansService.addLinkMaterial(lessonId, req.user.id, body);
  }

  @Post('lessons/:lessonId/materials/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('lessonId') lessonId: string,
    @Body() body: { title?: string; folderId?: string },
    @UploadedFile() file: any,
    @Request() req: any,
  ) {
    return this.lessonPlansService.addFileMaterial(lessonId, req.user.id, file, body.title, body.folderId);
  }

  @Delete('materials/:materialId')
  deleteMaterial(@Param('materialId') materialId: string, @Request() req: any) {
    return this.lessonPlansService.deleteMaterial(materialId, req.user.id);
  }
}
