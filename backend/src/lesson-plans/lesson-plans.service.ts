import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { join } from 'path';
import { existsSync, unlinkSync } from 'fs';

@Injectable()
export class LessonPlansService {
  constructor(private prisma: PrismaService) {}

  private async assertPlanOwner(planId: string, teacherId: string) {
    const plan = await this.prisma.lessonPlan.findFirst({ where: { id: planId, teacherId } });
    if (!plan) throw new NotFoundException('Plano não encontrado.');
    return plan;
  }

  // ─── CRUD de Planos ───────────────────────────────────────────────────────

  async createPlan(teacherId: string, data: { title: string; subject?: string; description?: string }) {
    return this.prisma.lessonPlan.create({
      data: { title: data.title, subject: data.subject, description: data.description, teacherId },
      include: { _count: { select: { lessons: true, classes: true } } },
    });
  }

  async getTeacherPlans(teacherId: string) {
    return this.prisma.lessonPlan.findMany({
      where: { teacherId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { lessons: true, classes: true } },
        classes: { select: { id: true, name: true, subject: true } },
      },
    });
  }

  async getPlanById(planId: string, teacherId: string) {
    const plan = await this.prisma.lessonPlan.findFirst({
      where: { id: planId, teacherId },
      include: {
        lessons: {
          orderBy: { order: 'asc' },
          include: { 
            materials: { orderBy: { createdAt: 'asc' } },
            folders: { include: { materials: { orderBy: { createdAt: 'asc' } } } }
          },
        },
        classes: { select: { id: true, name: true, subject: true } },
        _count: { select: { lessons: true } },
      },
    });
    if (!plan) throw new NotFoundException('Plano não encontrado.');
    return plan;
  }

  async updatePlan(planId: string, teacherId: string, data: { title?: string; subject?: string; description?: string }) {
    await this.assertPlanOwner(planId, teacherId);
    return this.prisma.lessonPlan.update({ where: { id: planId }, data });
  }

  async deletePlan(planId: string, teacherId: string) {
    await this.assertPlanOwner(planId, teacherId);
    // Limpar arquivos de materiais antes de deletar
    const lessons = await this.prisma.lesson.findMany({
      where: { planId },
      include: { materials: true },
    });
    for (const lesson of lessons) {
      for (const mat of lesson.materials) {
        if (mat.filename) this.deleteFile(mat.filename);
      }
    }
    await this.prisma.lessonPlan.delete({ where: { id: planId } });
    return { message: 'Plano excluído.' };
  }

  // ─── Vincular/Desvincular plano a turmas ─────────────────────────────────

  async assignPlanToClass(planId: string, classId: string, teacherId: string) {
    await this.assertPlanOwner(planId, teacherId);
    const cls = await this.prisma.class.findFirst({ where: { id: classId, teacherId } });
    if (!cls) throw new NotFoundException('Turma não encontrada.');
    return this.prisma.class.update({
      where: { id: classId },
      data: { lessonPlanId: planId },
      include: { lessonPlan: { select: { id: true, title: true } } },
    });
  }

  async unassignPlanFromClass(classId: string, teacherId: string) {
    const cls = await this.prisma.class.findFirst({ where: { id: classId, teacherId } });
    if (!cls) throw new NotFoundException('Turma não encontrada.');
    return this.prisma.class.update({ where: { id: classId }, data: { lessonPlanId: null } });
  }

  // ─── CRUD de Aulas ────────────────────────────────────────────────────────

  async addLesson(planId: string, teacherId: string, data: { title: string; topic?: string; objectives?: string }) {
    await this.assertPlanOwner(planId, teacherId);
    const count = await this.prisma.lesson.count({ where: { planId } });
    return this.prisma.lesson.create({
      data: {
        planId,
        title: data.title,
        topic: data.topic,
        objectives: data.objectives,
        order: count + 1,
      },
      include: { materials: true },
    });
  }

  async updateLesson(
    lessonId: string,
    teacherId: string,
    data: { title?: string; topic?: string; objectives?: string; status?: string; order?: number },
  ) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { plan: true },
    });
    if (!lesson || lesson.plan.teacherId !== teacherId) throw new NotFoundException('Aula não encontrada.');
    return this.prisma.lesson.update({ where: { id: lessonId }, data });
  }

  async deleteLesson(lessonId: string, teacherId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { plan: true, materials: true },
    });
    if (!lesson || lesson.plan.teacherId !== teacherId) throw new NotFoundException('Aula não encontrada.');
    for (const mat of lesson.materials) {
      if (mat.filename) this.deleteFile(mat.filename);
    }
    await this.prisma.lesson.delete({ where: { id: lessonId } });
    return { message: 'Aula excluída.' };
  }

  // ─── Folders da Aula ──────────────────────────────────────────────────────

  async createFolder(lessonId: string, teacherId: string, data: { name: string }) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId }, include: { plan: true } });
    if (!lesson || lesson.plan.teacherId !== teacherId) throw new NotFoundException('Aula não encontrada.');
    return this.prisma.lessonFolder.create({
      data: { lessonId, name: data.name },
    });
  }

  async deleteFolder(folderId: string, teacherId: string) {
    const folder = await this.prisma.lessonFolder.findUnique({ 
      where: { id: folderId }, 
      include: { lesson: { include: { plan: true } }, materials: true } 
    });
    if (!folder || folder.lesson.plan.teacherId !== teacherId) throw new NotFoundException('Pasta não encontrada.');
    
    // Limpar arquivos
    for (const mat of folder.materials) {
      if (mat.filename) this.deleteFile(mat.filename);
    }
    await this.prisma.lessonFolder.delete({ where: { id: folderId } });
    return { message: 'Pasta excluída.' };
  }

  // ─── Materiais da Aula ────────────────────────────────────────────────────

  async addLinkMaterial(lessonId: string, teacherId: string, data: { type: string; title: string; url: string; folderId?: string }) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { plan: true },
    });
    if (!lesson || lesson.plan.teacherId !== teacherId) throw new NotFoundException('Aula não encontrada.');
    return this.prisma.lessonMaterial.create({
      data: { lessonId, folderId: data.folderId, type: data.type, title: data.title, url: data.url },
    });
  }

  async addFileMaterial(
    lessonId: string,
    teacherId: string,
    file: any,
    title?: string,
    folderId?: string
  ) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { plan: true },
    });
    if (!lesson || lesson.plan.teacherId !== teacherId) {
      // Remove uploaded file if auth fails
      this.deleteFile(file.filename);
      throw new NotFoundException('Aula não encontrada.');
    }

    const url = `/uploads/${file.filename}`;
    return this.prisma.lessonMaterial.create({
      data: {
        lessonId,
        folderId: folderId || null,
        type: 'FILE',
        title: title || file.originalname,
        url,
        filename: file.filename,
        filesize: file.size,
        mimetype: file.mimetype,
      },
    });
  }

  async deleteMaterial(materialId: string, teacherId: string) {
    const mat = await this.prisma.lessonMaterial.findUnique({
      where: { id: materialId },
      include: { lesson: { include: { plan: true } } },
    });
    if (!mat || mat.lesson.plan.teacherId !== teacherId) throw new NotFoundException('Material não encontrado.');
    if (mat.filename) this.deleteFile(mat.filename);
    await this.prisma.lessonMaterial.delete({ where: { id: materialId } });
    return { message: 'Material excluído.' };
  }

  private deleteFile(filename: string) {
    try {
      const uploadDir = process.env.UPLOAD_PATH || join(process.cwd(), 'uploads');
      const filePath = join(uploadDir, filename);
      if (existsSync(filePath)) unlinkSync(filePath);
    } catch { /* silently ignore */ }
  }
}
