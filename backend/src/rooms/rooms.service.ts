import { Injectable, NotFoundException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as XLSX from 'xlsx';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async createRoom(name: string, examId: string, teacherId: string, classId?: string) {
    const existing = await this.prisma.room.findUnique({ where: { name } });
    if (existing) throw new ConflictException('O nome da sala já está em uso!');
    return this.prisma.room.create({
      data: { name, examId, teacherId, status: 'active', classId: classId || null },
      include: { class: { select: { name: true } } },
    });
  }

  async finishRoom(id: string, teacherId: string) {
    return this.prisma.room.update({
      where: { id, teacherId },
      data: { status: 'finished', finishedAt: new Date() },
    });
  }

  async deleteRoom(id: string, teacherId: string) {
    const room = await this.prisma.room.findUnique({ where: { id } });
    if (!room) throw new NotFoundException('Sala não encontrada.');
    if (room.teacherId !== teacherId) throw new UnauthorizedException('Permissão negada.');
    return this.prisma.room.delete({ where: { id } });
  }

  async reactivateRoom(id: string, newExamId: string, teacherId: string) {
    const room = await this.prisma.room.findUnique({ where: { id } });
    if (!room) throw new NotFoundException('Sala não encontrada.');
    if (room.teacherId !== teacherId) throw new UnauthorizedException('Permissão negada.');

    // Clear all sessions (clean start)
    const sessions = await this.prisma.examSession.findMany({ where: { roomId: id }, select: { id: true } });
    for (const s of sessions) {
      await this.prisma.answer.deleteMany({ where: { sessionId: s.id } });
      await this.prisma.violation.deleteMany({ where: { sessionId: s.id } });
    }
    await this.prisma.examSession.deleteMany({ where: { roomId: id } });

    return this.prisma.room.update({
      where: { id },
      data: {
        examId: newExamId,
        status: 'active',
        finishedAt: null,
        createdAt: new Date(), // reset timestamp
      },
    });
  }

  async getRoomsByTeacher(teacherId: string) {
    return this.prisma.room.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
      include: {
        exam: { select: { title: true, weight: true } },
        class: { select: { name: true } },
        _count: { select: { sessions: true } },
      },
    });
  }

  async getRoomByName(name: string) {
    const room = await this.prisma.room.findUnique({
      where: { name },
      include: {
        exam: {
          include: {
            questions: {
              include: {
                options: { select: { id: true, text: true } },
              },
            },
          },
        },
        class: {
          select: {
            name: true,
            subject: true,
            students: { select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } },
          },
        },
      },
    });
    if (!room) throw new NotFoundException('Sala não encontrada');
    return room;
  }

  /** Generate Excel with ALL students in a room */
  async generateRoomReport(id: string, teacherId: string): Promise<Buffer> {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        exam: {
          include: { questions: { include: { options: true } } },
        },
        sessions: {
          include: {
            student: true,
            answers: { include: { question: { include: { options: true } } } },
            violations: true,
          },
          orderBy: { finishedAt: 'asc' },
        },
      },
    });

    if (!room) throw new NotFoundException('Sala não encontrada.');
    if (room.teacherId !== teacherId) throw new UnauthorizedException('Permissão negada.');

    const wb = XLSX.utils.book_new();

    // --- Sheet 1: Summary ---
    const summaryRows = room.sessions.map((s) => ({
      'Nome': s.student.name,
      'Email': s.student.email,
      'Status': s.status === 'finished' ? 'Concluído' : s.status === 'blocked' ? 'Bloqueado' : 'Ativo',
      'Pontos Obtidos': s.rawScore ?? '-',
      'Nota Final': s.finalGrade != null ? s.finalGrade.toFixed(2) : '-',
      'Infrações': s.violationsCount,
      'Iniciou em': s.startedAt ? new Date(s.startedAt).toLocaleString('pt-BR') : '-',
      'Finalizou em': s.finishedAt ? new Date(s.finishedAt).toLocaleString('pt-BR') : '-',
    }));

    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    wsSummary['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo Geral');

    // --- Sheet per student ---
    for (const session of room.sessions) {
      if (session.answers.length === 0) continue;

      const rows = session.answers.map((answer) => {
        const selectedIds: string[] = JSON.parse(answer.selectedOptionIds || '[]');
        const allOptions = answer.question.options;
        const correctOptions = allOptions.filter((o) => o.isCorrect);
        const selectedOptions = allOptions.filter((o) => selectedIds.includes(o.id));
        return {
          'Questão': answer.question.statement,
          'Valor (pts)': answer.question.pointValue,
          'Gabarito': correctOptions.map((o) => o.text).join(' | '),
          'Resposta do Aluno': selectedOptions.map((o) => o.text).join(' | '),
          'Pontos': answer.score,
          'Acertou?': answer.score >= answer.question.pointValue ? 'Sim ✅' : answer.score > 0 ? 'Parcial ⚡' : 'Não ❌',
        };
      });

      rows.push({
        'Questão': '--- RESULTADO FINAL ---',
        'Valor (pts)': 0,
        'Gabarito': '---',
        'Resposta do Aluno': '---',
        'Pontos': session.rawScore || 0,
        'Acertou?': `Nota: ${(session.finalGrade || 0).toFixed(2)} (peso ${room.exam.weight})`,
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [{ wch: 50 }, { wch: 12 }, { wch: 35 }, { wch: 35 }, { wch: 10 }, { wch: 15 }];

      const sheetName = session.student.name.substring(0, 28).replace(/[\[\]:*?/\\]/g, '');
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
}
