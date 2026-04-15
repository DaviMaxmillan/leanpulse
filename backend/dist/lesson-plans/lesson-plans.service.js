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
exports.LessonPlansService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const path_1 = require("path");
const fs_1 = require("fs");
let LessonPlansService = class LessonPlansService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async assertPlanOwner(planId, teacherId) {
        const plan = await this.prisma.lessonPlan.findFirst({ where: { id: planId, teacherId } });
        if (!plan)
            throw new common_1.NotFoundException('Plano não encontrado.');
        return plan;
    }
    async createPlan(teacherId, data) {
        return this.prisma.lessonPlan.create({
            data: { title: data.title, subject: data.subject, description: data.description, teacherId },
            include: { _count: { select: { lessons: true, classes: true } } },
        });
    }
    async getTeacherPlans(teacherId) {
        return this.prisma.lessonPlan.findMany({
            where: { teacherId },
            orderBy: { updatedAt: 'desc' },
            include: {
                _count: { select: { lessons: true, classes: true } },
                classes: { select: { id: true, name: true, subject: true } },
            },
        });
    }
    async getPlanById(planId, teacherId) {
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
        if (!plan)
            throw new common_1.NotFoundException('Plano não encontrado.');
        return plan;
    }
    async updatePlan(planId, teacherId, data) {
        await this.assertPlanOwner(planId, teacherId);
        return this.prisma.lessonPlan.update({ where: { id: planId }, data });
    }
    async deletePlan(planId, teacherId) {
        await this.assertPlanOwner(planId, teacherId);
        const lessons = await this.prisma.lesson.findMany({
            where: { planId },
            include: { materials: true },
        });
        for (const lesson of lessons) {
            for (const mat of lesson.materials) {
                if (mat.filename)
                    this.deleteFile(mat.filename);
            }
        }
        await this.prisma.lessonPlan.delete({ where: { id: planId } });
        return { message: 'Plano excluído.' };
    }
    async assignPlanToClass(planId, classId, teacherId) {
        await this.assertPlanOwner(planId, teacherId);
        const cls = await this.prisma.class.findFirst({ where: { id: classId, teacherId } });
        if (!cls)
            throw new common_1.NotFoundException('Turma não encontrada.');
        return this.prisma.class.update({
            where: { id: classId },
            data: { lessonPlanId: planId },
            include: { lessonPlan: { select: { id: true, title: true } } },
        });
    }
    async unassignPlanFromClass(classId, teacherId) {
        const cls = await this.prisma.class.findFirst({ where: { id: classId, teacherId } });
        if (!cls)
            throw new common_1.NotFoundException('Turma não encontrada.');
        return this.prisma.class.update({ where: { id: classId }, data: { lessonPlanId: null } });
    }
    async addLesson(planId, teacherId, data) {
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
    async updateLesson(lessonId, teacherId, data) {
        const lesson = await this.prisma.lesson.findUnique({
            where: { id: lessonId },
            include: { plan: true },
        });
        if (!lesson || lesson.plan.teacherId !== teacherId)
            throw new common_1.NotFoundException('Aula não encontrada.');
        return this.prisma.lesson.update({ where: { id: lessonId }, data });
    }
    async deleteLesson(lessonId, teacherId) {
        const lesson = await this.prisma.lesson.findUnique({
            where: { id: lessonId },
            include: { plan: true, materials: true },
        });
        if (!lesson || lesson.plan.teacherId !== teacherId)
            throw new common_1.NotFoundException('Aula não encontrada.');
        for (const mat of lesson.materials) {
            if (mat.filename)
                this.deleteFile(mat.filename);
        }
        await this.prisma.lesson.delete({ where: { id: lessonId } });
        return { message: 'Aula excluída.' };
    }
    async createFolder(lessonId, teacherId, data) {
        const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId }, include: { plan: true } });
        if (!lesson || lesson.plan.teacherId !== teacherId)
            throw new common_1.NotFoundException('Aula não encontrada.');
        return this.prisma.lessonFolder.create({
            data: { lessonId, name: data.name },
        });
    }
    async deleteFolder(folderId, teacherId) {
        const folder = await this.prisma.lessonFolder.findUnique({
            where: { id: folderId },
            include: { lesson: { include: { plan: true } }, materials: true }
        });
        if (!folder || folder.lesson.plan.teacherId !== teacherId)
            throw new common_1.NotFoundException('Pasta não encontrada.');
        for (const mat of folder.materials) {
            if (mat.filename)
                this.deleteFile(mat.filename);
        }
        await this.prisma.lessonFolder.delete({ where: { id: folderId } });
        return { message: 'Pasta excluída.' };
    }
    async addLinkMaterial(lessonId, teacherId, data) {
        const lesson = await this.prisma.lesson.findUnique({
            where: { id: lessonId },
            include: { plan: true },
        });
        if (!lesson || lesson.plan.teacherId !== teacherId)
            throw new common_1.NotFoundException('Aula não encontrada.');
        return this.prisma.lessonMaterial.create({
            data: { lessonId, folderId: data.folderId, type: data.type, title: data.title, url: data.url },
        });
    }
    async addFileMaterial(lessonId, teacherId, file, title, folderId) {
        const lesson = await this.prisma.lesson.findUnique({
            where: { id: lessonId },
            include: { plan: true },
        });
        if (!lesson || lesson.plan.teacherId !== teacherId) {
            this.deleteFile(file.filename);
            throw new common_1.NotFoundException('Aula não encontrada.');
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
    async deleteMaterial(materialId, teacherId) {
        const mat = await this.prisma.lessonMaterial.findUnique({
            where: { id: materialId },
            include: { lesson: { include: { plan: true } } },
        });
        if (!mat || mat.lesson.plan.teacherId !== teacherId)
            throw new common_1.NotFoundException('Material não encontrado.');
        if (mat.filename)
            this.deleteFile(mat.filename);
        await this.prisma.lessonMaterial.delete({ where: { id: materialId } });
        return { message: 'Material excluído.' };
    }
    deleteFile(filename) {
        try {
            const uploadDir = process.env.UPLOAD_PATH || (0, path_1.join)(process.cwd(), 'uploads');
            const filePath = (0, path_1.join)(uploadDir, filename);
            if ((0, fs_1.existsSync)(filePath))
                (0, fs_1.unlinkSync)(filePath);
        }
        catch { }
    }
};
exports.LessonPlansService = LessonPlansService;
exports.LessonPlansService = LessonPlansService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LessonPlansService);
//# sourceMappingURL=lesson-plans.service.js.map