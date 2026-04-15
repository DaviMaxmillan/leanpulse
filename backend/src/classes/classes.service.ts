import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function generateClassCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  // ─── Turmas ──────────────────────────────────────────────────────────────────

  async createClass(
    teacherId: string,
    data: { name: string; subject?: string; description?: string; period?: string },
  ) {
    let code: string;
    let isUnique = false;
    do {
      code = generateClassCode();
      const existing = await this.prisma.class.findUnique({ where: { code } });
      isUnique = !existing;
    } while (!isUnique);

    return this.prisma.class.create({
      data: {
        name: data.name,
        subject: data.subject,
        description: data.description,
        period: data.period,
        code,
        teacherId,
      },
      include: { students: true, _count: { select: { students: true } } },
    });
  }

  async getTeacherClasses(teacherId: string) {
    return this.prisma.class.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { students: true } },
      },
    });
  }

  async getClassById(id: string, teacherId: string) {
    const cls = await this.prisma.class.findFirst({
      where: { id, teacherId },
      include: {
        students: { orderBy: { joinedAt: 'asc' } },
        _count: { select: { students: true } },
        lessonPlan: { select: { id: true, title: true, subject: true } },
      },
    });
    if (!cls) throw new NotFoundException('Turma não encontrada.');
    return cls;
  }

  // ─── Painel de Desempenho ─────────────────────────────────────────────────

  async getClassPerformance(id: string, teacherId: string) {
    const cls = await this.prisma.class.findFirst({
      where: { id, teacherId },
      include: {
        students: { orderBy: { name: 'asc' } },
        // Salas vinculadas à turma (provas aplicadas)
        rooms: {
          include: {
            exam: { select: { id: true, title: true } },
            sessions: {
              include: { student: { select: { name: true, email: true } } },
            },
          },
        },
        // Atividades vinculadas à turma
        activities: {
          include: {
            submissions: { select: { studentEmail: true, studentName: true, submittedAt: true, grade: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!cls) throw new NotFoundException('Turma não encontrada.');

    // Montar mapa de desempenho por aluno
    const students = cls.students;

    // Provas: cada sala é uma "aplicação"
    const examResults = cls.rooms.map(room => ({
      roomId: room.id,
      roomName: room.name,
      examTitle: room.exam.title,
      finishedAt: room.finishedAt,
      grades: room.sessions.reduce((acc, session) => {
        if (session.student?.email) {
          acc[session.student.email] = {
            finalGrade: session.finalGrade,
            status: session.status,
          };
        }
        return acc;
      }, {} as Record<string, { finalGrade: number | null; status: string }>),
    }));

    // Atividades: cada atividade tem submissões
    const activityResults = cls.activities.map(act => ({
      activityId: act.id,
      activityTitle: act.title,
      activityType: act.type,
      submitted: act.submissions.reduce((acc, sub) => {
        acc[sub.studentEmail] = { submitted: true, grade: sub.grade };
        return acc;
      }, {} as Record<string, { submitted: boolean; grade: number | null }>),
    }));

    // Para cada aluno, calcular médias e alertas
    const studentSummaries = students.map(student => {
      const examGradesArr = examResults
        .map(e => e.grades[student.email]?.finalGrade)
        .filter((g): g is number => g !== null && g !== undefined);
        
      const actGradesArr = activityResults
        .map(a => a.submitted[student.email]?.grade)
        .filter((g): g is number => g !== null && g !== undefined);

      const allGrades = [...examGradesArr, ...actGradesArr];

      const average = allGrades.length > 0
        ? Math.round((allGrades.reduce((a, b) => a + b, 0) / allGrades.length) * 10) / 10
        : null;

      const activitiesDone = activityResults.filter(a => a.submitted[student.email]?.submitted).length;

      return {
        studentId: student.id,
        studentName: student.name,
        studentEmail: student.email,
        average,
        examCount: examGradesArr.length,
        activitiesDone,
        totalActivities: activityResults.length,
        atRisk: average !== null && average < 6,
      };
    });

    // Média geral da turma
    const allGrades = studentSummaries.map(s => s.average).filter((g): g is number => g !== null);
    const classAverage = allGrades.length > 0
      ? Math.round((allGrades.reduce((a, b) => a + b, 0) / allGrades.length) * 10) / 10
      : null;

    return {
      classId: cls.id,
      className: cls.name,
      classAverage,
      studentsAtRisk: studentSummaries.filter(s => s.atRisk).length,
      examResults,
      activityResults,
      students: studentSummaries,
    };
  }

  async updateClass(
    id: string,
    teacherId: string,
    data: { name?: string; subject?: string; description?: string; period?: string },
  ) {
    const cls = await this.prisma.class.findFirst({ where: { id, teacherId } });
    if (!cls) throw new NotFoundException('Turma não encontrada.');

    return this.prisma.class.update({
      where: { id },
      data,
      include: { _count: { select: { students: true } } },
    });
  }

  async deleteClass(id: string, teacherId: string) {
    const cls = await this.prisma.class.findFirst({ where: { id, teacherId } });
    if (!cls) throw new NotFoundException('Turma não encontrada.');
    await this.prisma.class.delete({ where: { id } });
    return { message: 'Turma excluída com sucesso.' };
  }

  async cloneClass(id: string, teacherId: string) {
    const original = await this.prisma.class.findFirst({
      where: { id, teacherId },
      include: { students: true },
    });
    if (!original) throw new NotFoundException('Turma não encontrada.');

    let code: string;
    let isUnique = false;
    do {
      code = generateClassCode();
      const existing = await this.prisma.class.findUnique({ where: { code } });
      isUnique = !existing;
    } while (!isUnique);

    return this.prisma.class.create({
      data: {
        name: `${original.name} (Cópia)`,
        subject: original.subject,
        description: original.description,
        period: original.period,
        code,
        teacherId,
        students: {
          create: original.students.map((s) => ({ name: s.name, email: s.email })),
        },
      },
      include: { _count: { select: { students: true } } },
    });
  }

  // ─── Alunos ──────────────────────────────────────────────────────────────────

  async addStudent(classId: string, teacherId: string, data: { name: string; email: string }) {
    const cls = await this.prisma.class.findFirst({ where: { id: classId, teacherId } });
    if (!cls) throw new NotFoundException('Turma não encontrada.');

    const existing = await this.prisma.classStudent.findUnique({
      where: { classId_email: { classId, email: data.email } },
    });
    if (existing) throw new ConflictException('Aluno com este e-mail já está matriculado nesta turma.');

    return this.prisma.classStudent.create({
      data: { classId, name: data.name, email: data.email },
    });
  }

  async removeStudent(classId: string, studentId: string, teacherId: string) {
    const cls = await this.prisma.class.findFirst({ where: { id: classId, teacherId } });
    if (!cls) throw new ForbiddenException('Acesso negado.');

    await this.prisma.classStudent.delete({ where: { id: studentId } });
    return { message: 'Aluno removido da turma.' };
  }

  async bulkAddStudents(
    classId: string,
    teacherId: string,
    students: { name: string; email: string }[],
  ) {
    const cls = await this.prisma.class.findFirst({ where: { id: classId, teacherId } });
    if (!cls) throw new NotFoundException('Turma não encontrada.');

    let added = 0;
    let skipped = 0;
    for (const s of students) {
      try {
        await this.prisma.classStudent.create({
          data: { classId, name: s.name, email: s.email },
        });
        added++;
      } catch {
        skipped++;
      }
    }
    return { added, skipped };
  }

  // ─── Join por Código (aluno) ───────────────────────────────────────────────

  async getClassByCode(code: string) {
    const cls = await this.prisma.class.findUnique({
      where: { code: code.toUpperCase() },
      include: { teacher: { select: { name: true } }, _count: { select: { students: true } } },
    });
    if (!cls) throw new NotFoundException('Código de turma inválido.');
    return cls;
  }

  async joinByCode(code: string, data: { name: string; email: string }) {
    const cls = await this.prisma.class.findUnique({ where: { code: code.toUpperCase() } });
    if (!cls) throw new NotFoundException('Código de turma inválido.');

    try {
      return await this.prisma.classStudent.create({
        data: { classId: cls.id, name: data.name, email: data.email },
      });
    } catch {
      throw new ConflictException('Você já está matriculado nesta turma.');
    }
  }
}
