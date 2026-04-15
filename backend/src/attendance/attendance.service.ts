import {
  Injectable, NotFoundException, ForbiddenException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Retorna a data de hoje no fuso UTC-3 (Brasil) como "YYYY-MM-DD" */
export function todayBrazil(): string {
  const now = new Date();
  // UTC-3 offset
  const brazil = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return brazil.toISOString().split('T')[0];
}

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  // ─── Verificar propriedade da turma ──────────────────────────────────────

  private async assertClassOwner(classId: string, teacherId: string) {
    const cls = await this.prisma.class.findFirst({ where: { id: classId, teacherId } });
    if (!cls) throw new NotFoundException('Turma não encontrada.');
    return cls;
  }

  // ─── Criar registro de chamada ────────────────────────────────────────────

  async createRecord(
    classId: string,
    teacherId: string,
    data: { date: string; topic?: string; notes?: string },
  ) {
    await this.assertClassOwner(classId, teacherId);

    // Validar: não pode ser data futura
    const today = todayBrazil();
    if (data.date > today) {
      throw new ForbiddenException(
        `Não é possível registrar chamada para datas futuras. Hoje é ${today}.`,
      );
    }

    // Verificar duplicata
    const existing = await this.prisma.attendanceRecord.findUnique({
      where: { classId_date: { classId, date: data.date } },
    });
    if (existing) throw new ConflictException('Já existe uma chamada para esta data.');

    // Buscar todos os alunos da turma e pré-popular entradas como "presente"
    const students = await this.prisma.classStudent.findMany({
      where: { classId },
      orderBy: { name: 'asc' },
    });

    return this.prisma.attendanceRecord.create({
      data: {
        classId,
        date: data.date,
        topic: data.topic,
        notes: data.notes,
        entries: {
          create: students.map(s => ({
            studentId: s.id,
            studentName: s.name,
            present: true,
          })),
        },
      },
      include: { entries: { orderBy: { studentName: 'asc' } } },
    });
  }

  // ─── Listar registros de uma turma ───────────────────────────────────────

  async getClassRecords(classId: string, teacherId: string) {
    await this.assertClassOwner(classId, teacherId);
    return this.prisma.attendanceRecord.findMany({
      where: { classId },
      orderBy: { date: 'desc' },
      include: {
        entries: { orderBy: { studentName: 'asc' } },
        _count: { select: { entries: true } },
      },
    });
  }

  // ─── Buscar um registro específico ───────────────────────────────────────

  async getRecord(recordId: string, teacherId: string) {
    const record = await this.prisma.attendanceRecord.findUnique({
      where: { id: recordId },
      include: { entries: { orderBy: { studentName: 'asc' } }, class: true },
    });
    if (!record) throw new NotFoundException('Chamada não encontrada.');
    if (record.class.teacherId !== teacherId) throw new ForbiddenException('Permissão negada.');
    return record;
  }

  // ─── Atualizar cabeçalho do registro ─────────────────────────────────────

  async updateRecord(
    recordId: string,
    teacherId: string,
    data: { topic?: string; notes?: string; date?: string },
  ) {
    const record = await this.getRecord(recordId, teacherId);

    // Se estiver mudando a data, validar que não é futura
    if (data.date) {
      const today = todayBrazil();
      if (data.date > today) {
        throw new ForbiddenException('Não é possível alterar para uma data futura.');
      }
      // Verificar conflito de data (exceto o próprio registro)
      const conflict = await this.prisma.attendanceRecord.findFirst({
        where: { classId: record.classId, date: data.date, id: { not: recordId } },
      });
      if (conflict) throw new ConflictException('Já existe uma chamada para esta data.');
    }

    return this.prisma.attendanceRecord.update({
      where: { id: recordId },
      data: { topic: data.topic, notes: data.notes, date: data.date },
      include: { entries: { orderBy: { studentName: 'asc' } } },
    });
  }

  // ─── Atualizar presença de um aluno em uma chamada ────────────────────────

  async updateEntry(
    recordId: string,
    studentId: string,
    teacherId: string,
    present: boolean,
  ) {
    // Verificar acesso
    const record = await this.prisma.attendanceRecord.findUnique({
      where: { id: recordId },
      include: { class: true },
    });
    if (!record) throw new NotFoundException('Chamada não encontrada.');
    if (record.class.teacherId !== teacherId) throw new ForbiddenException('Permissão negada.');

    return this.prisma.attendanceEntry.upsert({
      where: { recordId_studentId: { recordId, studentId } },
      update: { present },
      create: {
        recordId,
        studentId,
        studentName: (await this.prisma.classStudent.findUnique({ where: { id: studentId } }))?.name || 'Aluno',
        present,
      },
    });
  }

  // ─── Excluir registro de chamada ─────────────────────────────────────────

  async deleteRecord(recordId: string, teacherId: string) {
    await this.getRecord(recordId, teacherId);
    await this.prisma.attendanceRecord.delete({ where: { id: recordId } });
    return { message: 'Chamada excluída.' };
  }

  // ─── Resumo de presença por aluno (para painel de desempenho) ────────────

  async getAttendanceSummary(classId: string, teacherId: string) {
    await this.assertClassOwner(classId, teacherId);
    const records = await this.prisma.attendanceRecord.findMany({
      where: { classId },
      include: { entries: true },
    });

    const totalClasses = records.length;
    const byStudent: Record<string, { name: string; present: number; absent: number; pct: number }> = {};

    for (const record of records) {
      for (const entry of record.entries) {
        if (!byStudent[entry.studentId]) {
          byStudent[entry.studentId] = { name: entry.studentName, present: 0, absent: 0, pct: 0 };
        }
        if (entry.present) byStudent[entry.studentId].present++;
        else byStudent[entry.studentId].absent++;
      }
    }

    Object.values(byStudent).forEach(s => {
      s.pct = totalClasses > 0 ? Math.round((s.present / totalClasses) * 100) : 100;
    });

    return { totalClasses, students: Object.entries(byStudent).map(([id, data]) => ({ id, ...data })) };
  }
}
