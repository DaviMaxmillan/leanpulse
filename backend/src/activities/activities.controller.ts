import {
  Controller, Get, Post, Delete, Body, Param, UseGuards, Request, Patch, UseInterceptors, UploadedFiles, Res,
} from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as express from 'express';

@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  // ─── Rotas públicas (aluno) ────────────────────────────────────────────────
  @Get('access/:code')
  getByCode(@Param('code') code: string) {
    return this.activitiesService.getActivityByCode(code);
  }

  @Post('access/:code/submit')
  @UseInterceptors(AnyFilesInterceptor({
    storage: diskStorage({
      destination: process.env.UPLOAD_PATH || './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `activity-${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
  }))
  submit(
    @Param('code') code: string,
    @Body() body: any,
    @UploadedFiles() files: any[],
  ) {
    // Se o envio for multipart/form-data, os dados vêm como stringificados no body ('payload')
    // Se for application/json (sem arquivo), body já é o objeto.
    let payload;
    if (body.payload) {
      try { payload = JSON.parse(body.payload); } catch (e) { payload = {}; }
    } else {
      payload = body;
    }
    return this.activitiesService.submitActivity(code, payload, files || []);
  }

  // ─── Rotas do Professor (autenticadas) ────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(AnyFilesInterceptor({
    storage: diskStorage({
      destination: process.env.UPLOAD_PATH || './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `material-${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
  }))
  createActivity(
    @Body() body: any,
    @UploadedFiles() files: any[],
    @Request() req: any,
  ) {
    let payload;
    if (body.payload) {
      try { payload = JSON.parse(body.payload); } catch(e) { payload = {}; }
    } else {
      payload = body;
    }
    return this.activitiesService.createActivity(req.user.id, payload, files || []);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  getMyActivities(@Request() req: any) {
    return this.activitiesService.getTeacherActivities(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getActivity(@Param('id') id: string, @Request() req: any) {
    return this.activitiesService.getActivityById(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/toggle')
  toggleActivity(@Param('id') id: string, @Request() req: any) {
    return this.activitiesService.toggleActivity(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/submissions/:subId/grade')
  gradeSubmission(@Param('subId') subId: string, @Body('grade') grade: number) {
    return this.activitiesService.gradeSubmission(subId, grade);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/export/excel')
  async exportExcel(@Param('id') id: string, @Request() req: any, @Res() res: express.Response) {
    const buffer = await this.activitiesService.exportActivityToExcel(id, req.user.id);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="atividade_${id}.xlsx"`,
    });
    res.end(buffer);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/submissions/:subId/export/pdf')
  async exportPdf(@Param('id') id: string, @Param('subId') subId: string, @Request() req: any, @Res() res: express.Response) {
    const buffer = await this.activitiesService.exportSubmissionToPdf(id, subId, req.user.id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="submission_${subId}.pdf"`,
    });
    res.end(buffer);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  deleteActivity(@Param('id') id: string, @Request() req: any) {
    return this.activitiesService.deleteActivity(id, req.user.id);
  }
}
