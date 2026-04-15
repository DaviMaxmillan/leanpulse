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
exports.RoomsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const XLSX = __importStar(require("xlsx"));
let RoomsService = class RoomsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createRoom(name, examId, teacherId, classId) {
        const existing = await this.prisma.room.findUnique({ where: { name } });
        if (existing)
            throw new common_1.ConflictException('O nome da sala já está em uso!');
        return this.prisma.room.create({
            data: { name, examId, teacherId, status: 'active', classId: classId || null },
            include: { class: { select: { name: true } } },
        });
    }
    async finishRoom(id, teacherId) {
        return this.prisma.room.update({
            where: { id, teacherId },
            data: { status: 'finished', finishedAt: new Date() },
        });
    }
    async deleteRoom(id, teacherId) {
        const room = await this.prisma.room.findUnique({ where: { id } });
        if (!room)
            throw new common_1.NotFoundException('Sala não encontrada.');
        if (room.teacherId !== teacherId)
            throw new common_1.UnauthorizedException('Permissão negada.');
        return this.prisma.room.delete({ where: { id } });
    }
    async reactivateRoom(id, newExamId, teacherId) {
        const room = await this.prisma.room.findUnique({ where: { id } });
        if (!room)
            throw new common_1.NotFoundException('Sala não encontrada.');
        if (room.teacherId !== teacherId)
            throw new common_1.UnauthorizedException('Permissão negada.');
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
                createdAt: new Date(),
            },
        });
    }
    async getRoomsByTeacher(teacherId) {
        return this.prisma.room.findMany({
            where: { teacherId },
            orderBy: { createdAt: 'desc' },
            include: {
                exam: { select: { title: true, weight: true } },
                _count: { select: { sessions: true } },
            },
        });
    }
    async getRoomByName(name) {
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
        if (!room)
            throw new common_1.NotFoundException('Sala não encontrada');
        return room;
    }
    async generateRoomReport(id, teacherId) {
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
        if (!room)
            throw new common_1.NotFoundException('Sala não encontrada.');
        if (room.teacherId !== teacherId)
            throw new common_1.UnauthorizedException('Permissão negada.');
        const wb = XLSX.utils.book_new();
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
        for (const session of room.sessions) {
            if (session.answers.length === 0)
                continue;
            const rows = session.answers.map((answer) => {
                const selectedIds = JSON.parse(answer.selectedOptionIds || '[]');
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
};
exports.RoomsService = RoomsService;
exports.RoomsService = RoomsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RoomsService);
//# sourceMappingURL=rooms.service.js.map