import { Controller, Post, Get, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createExamDto: any, @Request() req: any) {
    return this.examsService.create(createExamDto, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateExamDto: any, @Request() req: any) {
    return this.examsService.update(id, updateExamDto, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAllByTeacher(@Request() req: any) {
    return this.examsService.findAllByTeacher(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.examsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  delete(@Param('id') id: string, @Request() req: any) {
    return this.examsService.delete(id, req.user.id);
  }
}
