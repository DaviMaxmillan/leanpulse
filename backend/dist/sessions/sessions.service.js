"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const email_service_1 = require("../email/email.service");
const ExcelJS = __importStar(require("exceljs"));
let SessionsService = class SessionsService {
    prisma;
    emailService;
    constructor(prisma, emailService) {
        this.prisma = prisma;
        this.emailService = emailService;
    }
    async startSession(roomId, studentId) {
        const activeSession = await this.prisma.examSession.findFirst({
            where: { roomId, studentId, status: { not: 'finished' } },
        });
        if (activeSession) {
            return activeSession;
        }
        return this.prisma.examSession.create({
            data: {
                roomId,
                studentId,
                status: 'active',
            },
            include: {
                room: {
                    include: { exam: { include: { questions: { include: { options: true } } } } },
                },
            },
        });
    }
    async blockSession(sessionId) {
        return this.prisma.examSession.update({
            where: { id: sessionId },
            data: { status: 'blocked' },
        });
    }
    async unblockSession(sessionId) {
        return this.prisma.examSession.update({
            where: { id: sessionId },
            data: { status: 'active' },
        });
    }
    async finishSession(sessionId) {
        return this.prisma.examSession.update({
            where: { id: sessionId },
            data: { status: 'finished', finishedAt: new Date() },
        });
    }
    async getSessionsByRoom(roomId) {
        return this.prisma.examSession.findMany({
            where: { roomId },
            include: { student: true, violations: true, answers: true },
        });
    }
    async recordViolation(sessionId, type, screenshot) {
        await this.prisma.examSession.update({
            where: { id: sessionId },
            data: { violationsCount: { increment: 1 } },
        });
        return this.prisma.violation.create({ data: { sessionId, type, screenshot: screenshot ?? null } });
    }
    async submitAnswers(sessionId, answers) {
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
        if (!session)
            throw new common_1.BadRequestException('Session not found');
        if (session.status === 'finished')
            throw new common_1.BadRequestException('Session already finished');
        const exam = session.room.exam;
        let rawScore = 0;
        await this.prisma.answer.deleteMany({ where: { sessionId } });
        const answerRecords = [];
        for (const submission of answers) {
            const question = exam.questions.find((q) => q.id === submission.questionId);
            if (!question)
                continue;
            const correctOptions = question.options.filter((o) => o.isCorrect);
            const wrongOptions = question.options.filter((o) => !o.isCorrect);
            const correctIds = correctOptions.map((o) => o.id);
            const wrongIds = wrongOptions.map((o) => o.id);
            const selectedCorrect = submission.selectedOptionIds.filter((id) => correctIds.includes(id));
            const selectedWrong = submission.selectedOptionIds.filter((id) => wrongIds.includes(id));
            let questionScore = 0;
            if (selectedWrong.length === 0) {
                if (question.scoringMode === 'ALL_REQUIRED') {
                    if (selectedCorrect.length === correctIds.length) {
                        questionScore = question.pointValue;
                    }
                    else if (selectedCorrect.length > 0) {
                        questionScore = question.pointValue * 0.5;
                    }
                }
                else if (question.scoringMode === 'ANY_CORRECT') {
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
        await this.prisma.answer.createMany({ data: answerRecords });
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
    async getSessionReport(sessionId) {
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
        if (!session)
            throw new common_1.BadRequestException('Session not found');
        const wb = new ExcelJS.Workbook();
        wb.creator = 'LeanPulse';
        const wsAnswers = wb.addWorksheet('Respostas');
        wsAnswers.columns = [
            { header: 'Questão', key: 'q', width: 60 },
            { header: 'Valor (pts)', key: 'v', width: 12 },
            { header: 'Gabarito', key: 'g', width: 40 },
            { header: 'Resposta do Aluno', key: 'r', width: 40 },
            { header: 'Pontos Obtidos', key: 'p', width: 15 },
            { header: 'Acertou?', key: 'a', width: 15 },
        ];
        wsAnswers.getRow(1).font = { bold: true };
        wsAnswers.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
        wsAnswers.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        for (const answer of session.answers) {
            const selectedIds = JSON.parse(answer.selectedOptionIds || '[]');
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
        const wsViolations = wb.addWorksheet('Infrações');
        const violationLabels = {
            blur: 'Perda de foco da janela',
            tab_change: 'Troca de aba detectada',
            exit_fullscreen: 'Saiu da tela cheia',
        };
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
        }
        else {
            let currentRow = 2;
            for (let i = 0; i < session.violations.length; i++) {
                const v = session.violations[i];
                const label = violationLabels[v.type] || v.type;
                const timestamp = new Date(v.timestamp).toLocaleString('pt-BR');
                const ROW_HEIGHT_PX = 120;
                wsViolations.getRow(currentRow).height = ROW_HEIGHT_PX;
                wsViolations.addRow({ num: i + 1, tipo: label, hora: timestamp, img: '' });
                if (v.screenshot) {
                    try {
                        const base64Data = v.screenshot.replace(/^data:image\/\w+;base64,/, '');
                        const imgId = wb.addImage({
                            base64: base64Data,
                            extension: 'jpeg',
                        });
                        wsViolations.addImage(imgId, `D${currentRow}:E${currentRow + 1}`);
                    }
                    catch {
                        wsViolations.getRow(currentRow).getCell('img').value = '[Imagem indisponível]';
                    }
                }
                else {
                    wsViolations.getRow(currentRow).getCell('img').value = '[Sem captura]';
                }
                if (i % 2 === 0) {
                    wsViolations.getRow(currentRow).fill = {
                        type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF1F1' },
                    };
                }
                currentRow++;
            }
        }
        const buffer = await wb.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }
    async sendReportEmail(sessionId) {
        const session = await this.prisma.examSession.findUnique({
            where: { id: sessionId },
            include: {
                student: true,
                room: { include: { exam: true } },
            },
        });
        if (!session)
            throw new common_1.NotFoundException('Sessão não encontrada.');
        if (session.status !== 'finished')
            throw new common_1.BadRequestException('A avaliação ainda não foi concluída.');
        const excelBuffer = await this.getSessionReport(sessionId);
        const fileName = `resultado-${session.student.name.replace(/\s+/g, '-')}.xlsx`;
        await this.emailService.sendExamReport(session.student.email, session.student.name, session.room.exam.title, session.rawScore || 0, session.finalGrade || 0, session.room.exam.weight, excelBuffer, fileName);
        return { success: true, message: 'Relatório enviado com sucesso.' };
    }
};
exports.SessionsService = SessionsService;
exports.SessionsService = SessionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        email_service_1.EmailService])
], SessionsService);
//# sourceMappingURL=sessions.service.js.map