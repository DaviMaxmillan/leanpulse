"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExamsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ExamsService = class ExamsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data, userId) {
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
    async update(id, data, userId) {
        const exam = await this.prisma.exam.findUnique({ where: { id } });
        if (!exam)
            throw new common_1.NotFoundException('Prova não encontrada.');
        if (exam.userId !== userId)
            throw new common_1.UnauthorizedException('Você não tem permissão para editar esta prova.');
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
    async findAllByTeacher(userId) {
        return this.prisma.exam.findMany({
            where: { userId },
            include: { questions: { include: { options: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id) {
        return this.prisma.exam.findUnique({
            where: { id },
            include: {
                questions: {
                    include: {
                        options: { select: { id: true, text: true } },
                    },
                },
            },
        });
    }
    async delete(id, userId) {
        const exam = await this.prisma.exam.findUnique({ where: { id } });
        if (!exam)
            throw new common_1.NotFoundException('Prova não encontrada.');
        if (exam.userId !== userId)
            throw new common_1.UnauthorizedException('Você não tem permissão para excluir esta prova.');
        return this.prisma.exam.delete({ where: { id } });
    }
};
exports.ExamsService = ExamsService;
exports.ExamsService = ExamsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ExamsService);
//# sourceMappingURL=exams.service.js.map