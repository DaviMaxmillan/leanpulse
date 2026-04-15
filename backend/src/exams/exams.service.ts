import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExamsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: {
      title: string;
      duration: number;
      weight: number;
      showOneAtATime?: boolean;
      randomizeQuestions?: boolean;
      randomizeOptions?: boolean;
      allowBackNavigation?: boolean;
      questions: {
        statement: string;
        pointValue: number;
        scoringMode: string;
        options: { text: string; isCorrect: boolean }[];
      }[];
    },
    userId: string,
  ) {
    return this.prisma.exam.create({
      data: {
        title: data.title,
        duration: data.duration,
        weight: data.weight || 1,
        showOneAtATime: data.showOneAtATime ?? false,
        randomizeQuestions: data.randomizeQuestions ?? false,
        randomizeOptions: data.randomizeOptions ?? false,
        allowBackNavigation: data.allowBackNavigation ?? true,
        userId,
        questions: {
          create: data.questions.map((q) => ({
            statement: q.statement,
            pointValue: q.pointValue || 1,
            scoringMode: q.scoringMode || 'ALL_REQUIRED',
            options: { create: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })) },
          })),
        },
      },
      include: { questions: { include: { options: true } } },
    });
  }

  async update(
    id: string,
    data: {
      title?: string;
      duration?: number;
      weight?: number;
      showOneAtATime?: boolean;
      randomizeQuestions?: boolean;
      randomizeOptions?: boolean;
      allowBackNavigation?: boolean;
      questions?: {
        statement: string;
        pointValue: number;
        scoringMode: string;
        options: { text: string; isCorrect: boolean }[];
      }[];
    },
    userId: string,
  ) {
    const exam = await this.prisma.exam.findUnique({ where: { id } });
    if (!exam) throw new NotFoundException('Prova não encontrada.');
    if (exam.userId !== userId) throw new UnauthorizedException('Você não tem permissão para editar esta prova.');

    // If questions are provided, delete all existing and recreate
    if (data.questions) {
      await this.prisma.question.deleteMany({ where: { examId: id } });
    }

    return this.prisma.exam.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.duration !== undefined && { duration: data.duration }),
        ...(data.weight !== undefined && { weight: data.weight }),
        ...(data.showOneAtATime !== undefined && { showOneAtATime: data.showOneAtATime }),
        ...(data.randomizeQuestions !== undefined && { randomizeQuestions: data.randomizeQuestions }),
        ...(data.randomizeOptions !== undefined && { randomizeOptions: data.randomizeOptions }),
        ...(data.allowBackNavigation !== undefined && { allowBackNavigation: data.allowBackNavigation }),
        ...(data.questions && {
          questions: {
            create: data.questions.map((q) => ({
              statement: q.statement,
              pointValue: q.pointValue || 1,
              scoringMode: q.scoringMode || 'ALL_REQUIRED',
              options: { create: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })) },
            })),
          },
        }),
      },
      include: { questions: { include: { options: true } } },
    });
  }

  async findAllByTeacher(userId: string) {
    return this.prisma.exam.findMany({
      where: { userId },
      include: { questions: { include: { options: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.exam.findUnique({
      where: { id },
      include: {
        questions: {
          include: {
            options: { select: { id: true, text: true } }, // isCorrect hidden from students
          },
        },
      },
    });
  }

  async delete(id: string, userId: string) {
    const exam = await this.prisma.exam.findUnique({ where: { id } });
    if (!exam) throw new NotFoundException('Prova não encontrada.');
    if (exam.userId !== userId) throw new UnauthorizedException('Você não tem permissão para excluir esta prova.');
    return this.prisma.exam.delete({ where: { id } });
  }
}
