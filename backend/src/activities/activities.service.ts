import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Buffer } from 'buffer';

// Usando require para bibliotecas que podem ter problemas com default imports em certas configs de TS
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');


function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

export interface ActivityQuestionDto {
  statement: string;
  type: 'TEXT' | 'MULTIPLE_CHOICE' | 'FILE';
  order?: number;
  options?: { text: string }[];
}

@Injectable()
export class ActivitiesService {
  constructor(private prisma: PrismaService) {}

  // ─── CRUD de Atividades ───────────────────────────────────────────────────

  async createActivity(
    teacherId: string,
    data: {
      title: string;
      description?: string;
      type?: string;
      classId: string;
      dueDate?: string;
      questions: ActivityQuestionDto[];
    },
    files: any[] = []
  ) {
    // Verificar que a turma pertence ao professor
    const cls = await this.prisma.class.findFirst({ where: { id: data.classId, teacherId } });
    if (!cls) throw new NotFoundException('Turma não encontrada.');

    let code: string;
    let isUnique = false;
    do {
      code = generateCode();
      const existing = await this.prisma.activity.findUnique({ where: { code } });
      isUnique = !existing;
    } while (!isUnique);

    let fileUrl = null;
    let filename = null;
    if (files && files.length > 0) {
      fileUrl = `/uploads/${files[0].filename}`;
      filename = files[0].originalname;
    }

    return this.prisma.activity.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type || 'EXERCISE',
        classId: data.classId,
        teacherId,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        code,
        isOpen: true,
        fileUrl,
        filename,
        questions: {
          create: data.questions.map((q, i) => ({
            statement: q.statement,
            type: q.type,
            order: q.order ?? i,
            options: q.type === 'MULTIPLE_CHOICE' && q.options
              ? { create: q.options.map(o => ({ text: o.text })) }
              : undefined,
          })),
        },
      },
      include: {
        questions: { include: { options: true }, orderBy: { order: 'asc' } },
        class: { select: { name: true } },
        _count: { select: { submissions: true } },
      },
    });
  }

  async getTeacherActivities(teacherId: string) {
    return this.prisma.activity.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
      include: {
        class: { select: { name: true, subject: true } },
        _count: { select: { submissions: true } },
      },
    });
  }

  async getActivityById(id: string, teacherId: string) {
    const activity = await this.prisma.activity.findFirst({
      where: { id, teacherId },
      include: {
        class: { select: { name: true, subject: true, students: { orderBy: { name: 'asc' } } } },
        questions: { include: { options: true }, orderBy: { order: 'asc' } },
        submissions: {
          orderBy: { submittedAt: 'desc' },
          include: { answers: { include: { question: true } } },
        },
        _count: { select: { submissions: true } },
      },
    });
    if (!activity) throw new NotFoundException('Atividade não encontrada.');
    return activity;
  }

  async toggleActivity(id: string, teacherId: string) {
    const activity = await this.prisma.activity.findFirst({ where: { id, teacherId } });
    if (!activity) throw new NotFoundException('Atividade não encontrada.');
    return this.prisma.activity.update({
      where: { id },
      data: { isOpen: !activity.isOpen },
    });
  }

  async deleteActivity(id: string, teacherId: string) {
    const activity = await this.prisma.activity.findFirst({ where: { id, teacherId } });
    if (!activity) throw new NotFoundException('Atividade não encontrada.');
    await this.prisma.activity.delete({ where: { id } });
    return { message: 'Atividade excluída.' };
  }

  // ─── Submissão do Aluno (público) ─────────────────────────────────────────

  async getActivityByCode(code: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        class: {
          select: {
            name: true,
            subject: true,
            students: { select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } },
          },
        },
        teacher: { select: { name: true } },
        questions: { include: { options: { select: { id: true, text: true } } }, orderBy: { order: 'asc' } },
      },
    });
    if (!activity) throw new NotFoundException('Código de atividade inválido.');
    if (!activity.isOpen) throw new ForbiddenException('Esta atividade não está mais aceitando respostas.');
    return activity;
  }

  async submitActivity(
    code: string,
    data: {
      studentName: string;
      studentEmail: string;
      answers: { questionId: string; textAnswer?: string; selectedOptionId?: string }[];
    },
    files: any[],
  ) {
    const activity = await this.prisma.activity.findUnique({ where: { code: code.toUpperCase() } });
    if (!activity) throw new NotFoundException('Código inválido.');
    if (!activity.isOpen) throw new ForbiddenException('Atividade encerrada.');

    // Verificar duplicata
    const existing = await this.prisma.activitySubmission.findUnique({
      where: { activityId_studentEmail: { activityId: activity.id, studentEmail: data.studentEmail } },
    });
    if (existing) throw new ConflictException('Você já respondeu esta atividade.');

    return this.prisma.activitySubmission.create({
      data: {
        activityId: activity.id,
        studentName: data.studentName,
        studentEmail: data.studentEmail,
        fileUrl: files.find(f => f.fieldname === 'activity_file') ? `/uploads/${files.find(f => f.fieldname === 'activity_file').filename}` : null,
        filename: files.find(f => f.fieldname === 'activity_file') ? files.find(f => f.fieldname === 'activity_file').originalname : null,
        answers: {
          create: data.answers.map(a => {
            const file = files.find(f => f.fieldname === `file_${a.questionId}`);
            return {
              questionId: a.questionId,
              textAnswer: a.textAnswer,
              selectedOptionId: a.selectedOptionId,
              fileUrl: file ? `/uploads/${file.filename}` : null,
              filename: file ? file.originalname : null,
            };
          }),
        },
      },
    });
  }

  async gradeSubmission(submissionId: string, grade: number) {
    return this.prisma.activitySubmission.update({
      where: { id: submissionId },
      data: { grade },
    });
  }

  async exportActivityToExcel(activityId: string, teacherId: string): Promise<Buffer> {
    const activity = await this.getActivityById(activityId, teacherId);
    
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Respostas');

    // Cabeçalhos
    const headers = ['Nome do Aluno', 'Email', 'Nota', 'Data Envio'];
    activity.questions.forEach((q, idx) => {
      headers.push(`Q${idx + 1}: ${q.statement}`);
    });
    sheet.addRow(headers);
    sheet.getRow(1).font = { bold: true };

    activity.submissions.forEach(sub => {
      const row = [
        sub.studentName,
        sub.studentEmail,
        sub.grade !== null ? sub.grade : '',
        sub.submittedAt.toLocaleString('pt-BR'),
      ];
      activity.questions.forEach(q => {
        const ans = sub.answers.find(a => a.questionId === q.id);
        if (!ans) row.push('Não respondida');
        else if (q.type === 'MULTIPLE_CHOICE') {
          const opt = q.options.find(o => o.id === ans.selectedOptionId);
          row.push(opt ? opt.text : '');
        } else if (q.type === 'FILE') {
          row.push(ans.fileUrl ? `Arquivo: ${ans.filename}` : 'Sem arquivo');
        } else {
          row.push(ans.textAnswer || '');
        }
      });
      sheet.addRow(row);
    });

    return (await workbook.xlsx.writeBuffer()) as Buffer;
  }

  async exportSubmissionToPdf(activityId: string, submissionId: string, teacherId: string): Promise<Buffer> {
    const activity = await this.getActivityById(activityId, teacherId);
    const sub = activity.submissions.find(s => s.id === submissionId);
    if (!sub) throw new NotFoundException('Submissão não encontrada.');

    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      doc.fontSize(20).text(activity.title, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Aluno: ${sub.studentName}`);
      doc.text(`Email: ${sub.studentEmail}`);
      doc.text(`Data: ${sub.submittedAt.toLocaleString('pt-BR')}`);
      doc.text(`Nota: ${sub.grade !== null ? sub.grade : 'Não avaliada'}`);
      doc.moveDown(2);

      activity.questions.forEach((q, idx) => {
        doc.fontSize(14).font('Helvetica-Bold').text(`Questão ${idx + 1}: ${q.statement}`);
        doc.moveDown(0.5);
        
        const ans = sub.answers.find(a => a.questionId === q.id);
        doc.fontSize(12).font('Helvetica');
        
        if (!ans) {
          doc.fillColor('gray').text('Não respondida.');
        } else if (q.type === 'MULTIPLE_CHOICE') {
          const opt = q.options.find(o => o.id === ans.selectedOptionId);
          doc.fillColor('black').text(`Resposta: ${opt ? opt.text : ''}`);
        } else if (q.type === 'FILE') {
          doc.fillColor('blue').text(ans.fileUrl ? `Arquivo Anexado: ${ans.filename}` : 'Nenhum arquivo anexado.');
        } else {
          doc.fillColor('black').text(ans.textAnswer || '');
        }
        doc.moveDown(1.5);
      });

      doc.end();
    });
  }
}
