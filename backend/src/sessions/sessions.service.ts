import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import * as XLSX from 'xlsx';
import * as ExcelJS from 'exceljs';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async startSession(roomId: string, classStudentId: string) {
    // 1. Busca o ClassStudent para obter nome e email
    const classStudent = await this.prisma.classStudent.findUnique({
      where: { id: classStudentId },
    });
    if (!classStudent) throw new BadRequestException('Aluno não encontrado na turma.');

    // 2. Encontra ou cria o Student no sistema de provas
    let student = await this.prisma.student.findUnique({
      where: { email: classStudent.email },
    });
    if (!student) {
      student = await this.prisma.student.create({
        data: { name: classStudent.name, email: classStudent.email },
      });
    }

    // 3. Verifica se já existe sessão ativa para este aluno nesta sala
    const activeSession = await this.prisma.examSession.findFirst({
      where: { roomId, studentId: student.id, status: { not: 'finished' } },
    });
    if (activeSession) return activeSession;

    // 4. Cria a sessão
    return this.prisma.examSession.create({
      data: { roomId, studentId: student.id, status: 'active' },
      include: {
        room: {
          include: { exam: { include: { questions: { include: { options: true } } } } },
        },
      },
    });
  }

  async blockSession(sessionId: string) {
    return this.prisma.examSession.update({
      where: { id: sessionId },
      data: { status: 'blocked' },
    });
  }

  async unblockSession(sessionId: string) {
    return this.prisma.examSession.update({
      where: { id: sessionId },
      data: { status: 'active' },
    });
  }

  async finishSession(sessionId: string) {
    return this.prisma.examSession.update({
      where: { id: sessionId },
      data: { status: 'finished', finishedAt: new Date() },
    });
  }

  async getSessionsByRoom(roomId: string) {
    return this.prisma.examSession.findMany({
      where: { roomId },
      include: { student: true, violations: true, answers: true },
    });
  }

  async recordViolation(sessionId: string, type: string, screenshot?: string) {
    await this.prisma.examSession.update({
      where: { id: sessionId },
      data: { violationsCount: { increment: 1 } },
    });
    return this.prisma.violation.create({ data: { sessionId, type, screenshot: screenshot ?? null } });
  }

  async submitAnswers(
    sessionId: string,
    answers: { questionId: string; selectedOptionIds: string[] }[],
  ) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        room: {
          include: {
            exam: {
              include: {
                questions: { include: { options: true } },
              },
            },
          },
        },
        student: true,
      },
    });

    if (!session) throw new BadRequestException('Sessão não encontrada.');
    if (session.status === 'finished')
      throw new BadRequestException('Esta prova já foi entregue.');
    if (!session.room?.exam)
      throw new BadRequestException('Dados da prova não encontrados. Recarregue a página.');

    const exam = session.room.exam;
    let rawScore = 0;

    await this.prisma.answer.deleteMany({ where: { sessionId } });

    const answerRecords: any[] = [];

    for (const submission of answers) {
      const question = exam.questions.find((q) => q.id === submission.questionId);
      if (!question) continue;

      const correctOptions = question.options.filter((o) => o.isCorrect);
      const wrongOptions = question.options.filter((o) => !o.isCorrect);

      const correctIds = correctOptions.map((o) => o.id);
      const wrongIds = wrongOptions.map((o) => o.id);

      const selectedCorrect = submission.selectedOptionIds.filter((id) =>
        correctIds.includes(id),
      );
      const selectedWrong = submission.selectedOptionIds.filter((id) =>
        wrongIds.includes(id),
      );

      let questionScore = 0;

      if (selectedWrong.length === 0) {
        if (question.scoringMode === 'ALL_REQUIRED') {
          if (selectedCorrect.length === correctIds.length) {
            questionScore = question.pointValue;
          } else if (selectedCorrect.length > 0) {
            questionScore = question.pointValue * 0.5;
          }
        } else if (question.scoringMode === 'ANY_CORRECT') {
          if (selectedCorrect.length >= 1) {
            questionScore = question.pointValue;
          }
        }
      }

      rawScore += questionScore;

      answerRecords.push({
        studentId: session.studentId,
        questionId: question.id,
        sessionId: sessionId,
        selectedOptionIds: JSON.stringify(submission.selectedOptionIds),
        score: questionScore,
      });
    }

    try {
      await this.prisma.answer.createMany({ data: answerRecords });
    } catch (e: any) {
      this.logger.error('Erro ao salvar respostas:', e?.message || e);
      throw new BadRequestException('Erro ao salvar respostas: ' + (e?.message || 'falha no banco de dados'));
    }

    const finalGrade = rawScore * (exam.weight / 10);

    const updatedSession = await this.prisma.examSession.update({
      where: { id: sessionId },
      data: {
        status: 'finished',
        finishedAt: new Date(),
        rawScore,
        finalGrade,
      },
    });

    return {
      rawScore,
      finalGrade,
      weight: exam.weight,
      session: updatedSession,
    };
  }

  async getSessionReport(sessionId: string): Promise<Buffer> {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        student: true,
        answers: {
          include: {
            question: { include: { options: true } },
          },
        },
        violations: { orderBy: { timestamp: 'asc' } },
        room: {
          include: { exam: true },
        },
      },
    });

    if (!session) throw new BadRequestException('Session not found');

    const wb = new ExcelJS.Workbook();
    wb.creator = 'LeanPulse';

    // ── Sheet 1: Respostas ──────────────────────────────────────────────────
    const wsAnswers = wb.addWorksheet('Respostas');
    wsAnswers.columns = [
      { header: 'Questão', key: 'q', width: 60 },
      { header: 'Valor (pts)', key: 'v', width: 12 },
      { header: 'Gabarito', key: 'g', width: 40 },
      { header: 'Resposta do Aluno', key: 'r', width: 40 },
      { header: 'Pontos Obtidos', key: 'p', width: 15 },
      { header: 'Acertou?', key: 'a', width: 15 },
    ];

    // Style header row
    wsAnswers.getRow(1).font = { bold: true };
    wsAnswers.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    wsAnswers.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    for (const answer of session.answers) {
      const selectedIds: string[] = JSON.parse(answer.selectedOptionIds || '[]');
      const allOptions = answer.question.options;
      const correctOptions = allOptions.filter((o) => o.isCorrect);
      const selectedOptions = allOptions.filter((o) => selectedIds.includes(o.id));
      const acertou = answer.score >= answer.question.pointValue ? 'Sim ✅' : answer.score > 0 ? 'Parcial ⚡' : 'Não ❌';

      const row = wsAnswers.addRow({
        q: answer.question.statement,
        v: answer.question.pointValue,
        g: correctOptions.map((o) => o.text).join(' | '),
        r: selectedOptions.map((o) => o.text).join(' | '),
        p: answer.score,
        a: acertou,
      });
      row.getCell('q').alignment = { wrapText: true };
    }

    // Final grade row
    const finalRow = wsAnswers.addRow({
      q: '─── RESULTADO FINAL ───',
      v: '',
      g: '',
      r: `Nota Final: ${(session.finalGrade || 0).toFixed(2)} (peso ${session.room.exam.weight})`,
      p: session.rawScore || 0,
      a: '',
    });
    finalRow.font = { bold: true };
    finalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    finalRow.font = { bold: true, color: { argb: 'FFFBBF24' } };

    // ── Sheet 2: Infrações ──────────────────────────────────────────────────
    const wsViolations = wb.addWorksheet('Infrações');
    const violationLabels: Record<string, string> = {
      blur: 'Perda de foco da janela',
      tab_change: 'Troca de aba detectada',
      exit_fullscreen: 'Saiu da tela cheia',
    };

    // Header
    wsViolations.columns = [
      { header: '#', key: 'num', width: 6 },
      { header: 'Tipo', key: 'tipo', width: 30 },
      { header: 'Horário', key: 'hora', width: 22 },
      { header: 'Evidência (Print)', key: 'img', width: 80 },
    ];
    wsViolations.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    wsViolations.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };

    if (session.violations.length === 0) {
      wsViolations.addRow({ num: '-', tipo: 'Nenhuma infração registrada', hora: '', img: '' });
    } else {
      let currentRow = 2;
      for (let i = 0; i < session.violations.length; i++) {
        const v = session.violations[i];
        const label = violationLabels[v.type] || v.type;
        const timestamp = new Date(v.timestamp).toLocaleString('pt-BR');
        const ROW_HEIGHT_PX = 120; // height in points (1pt ≈ 1.33px)

        wsViolations.getRow(currentRow).height = ROW_HEIGHT_PX;
        wsViolations.addRow({ num: i + 1, tipo: label, hora: timestamp, img: '' });

        if (v.screenshot) {
          try {
            // Strip data URI prefix if present
            const base64Data = v.screenshot.replace(/^data:image\/\w+;base64,/, '');
            const imgId = wb.addImage({
              base64: base64Data,
              extension: 'jpeg',
            });
            // Place image anchored to column D of current row using range format
            wsViolations.addImage(imgId, `D${currentRow}:E${currentRow + 1}`);
          } catch {
            wsViolations.getRow(currentRow).getCell('img').value = '[Imagem indisponível]';
          }
        } else {
          wsViolations.getRow(currentRow).getCell('img').value = '[Sem captura]';
        }

        // Style alternating rows
        if (i % 2 === 0) {
          wsViolations.getRow(currentRow).fill = {
            type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF1F1' },
          };
        }
        currentRow++;
      }
    }

    // Write workbook to buffer
    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * New functionality: Send student report via individual email
   */
  async sendReportEmail(sessionId: string) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        student: true,
        room: { include: { exam: true } },
      },
    });

    if (!session) throw new NotFoundException('Sessão não encontrada.');
    if (session.status !== 'finished') throw new BadRequestException('A avaliação ainda não foi concluída.');

    const excelBuffer = await this.getSessionReport(sessionId);
    const fileName = `resultado-${session.student.name.replace(/\s+/g, '-')}.xlsx`;

    await this.emailService.sendExamReport(
      session.student.email,
      session.student.name,
      session.room.exam.title,
      session.rawScore || 0,
      session.finalGrade || 0,
      session.room.exam.weight,
      excelBuffer,
      fileName,
    );

    return { success: true, message: 'Relatório enviado com sucesso.' };
  }
}
