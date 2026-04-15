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
exports.ClassesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
function generateClassCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}
let ClassesService = class ClassesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createClass(teacherId, data) {
        let code;
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
    async getTeacherClasses(teacherId) {
        return this.prisma.class.findMany({
            where: { teacherId },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { students: true } },
            },
        });
    }
    async getClassById(id, teacherId) {
        const cls = await this.prisma.class.findFirst({
            where: { id, teacherId },
            include: {
                students: { orderBy: { joinedAt: 'asc' } },
                _count: { select: { students: true } },
                lessonPlan: { select: { id: true, title: true, subject: true } },
            },
        });
        if (!cls)
            throw new common_1.NotFoundException('Turma não encontrada.');
        return cls;
    }
    async getClassPerformance(id, teacherId) {
        const cls = await this.prisma.class.findFirst({
            where: { id, teacherId },
            include: {
                students: { orderBy: { name: 'asc' } },
                rooms: {
                    include: {
                        exam: { select: { id: true, title: true } },
                        sessions: {
                            include: { student: { select: { name: true, email: true } } },
                        },
                    },
                },
                activities: {
                    include: {
                        submissions: { select: { studentEmail: true, studentName: true, submittedAt: true, grade: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        if (!cls)
            throw new common_1.NotFoundException('Turma não encontrada.');
        const students = cls.students;
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
            }, {}),
        }));
        const activityResults = cls.activities.map(act => ({
            activityId: act.id,
            activityTitle: act.title,
            activityType: act.type,
            submitted: act.submissions.reduce((acc, sub) => {
                acc[sub.studentEmail] = { submitted: true, grade: sub.grade };
                return acc;
            }, {}),
        }));
        const studentSummaries = students.map(student => {
            const examGradesArr = examResults
                .map(e => e.grades[student.email]?.finalGrade)
                .filter((g) => g !== null && g !== undefined);
            const actGradesArr = activityResults
                .map(a => a.submitted[student.email]?.grade)
                .filter((g) => g !== null && g !== undefined);
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
        const allGrades = studentSummaries.map(s => s.average).filter((g) => g !== null);
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
    async updateClass(id, teacherId, data) {
        const cls = await this.prisma.class.findFirst({ where: { id, teacherId } });
        if (!cls)
            throw new common_1.NotFoundException('Turma não encontrada.');
        return this.prisma.class.update({
            where: { id },
            data,
            include: { _count: { select: { students: true } } },
        });
    }
    async deleteClass(id, teacherId) {
        const cls = await this.prisma.class.findFirst({ where: { id, teacherId } });
        if (!cls)
            throw new common_1.NotFoundException('Turma não encontrada.');
        await this.prisma.class.delete({ where: { id } });
        return { message: 'Turma excluída com sucesso.' };
    }
    async cloneClass(id, teacherId) {
        const original = await this.prisma.class.findFirst({
            where: { id, teacherId },
            include: { students: true },
        });
        if (!original)
            throw new common_1.NotFoundException('Turma não encontrada.');
        let code;
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
    async addStudent(classId, teacherId, data) {
        const cls = await this.prisma.class.findFirst({ where: { id: classId, teacherId } });
        if (!cls)
            throw new common_1.NotFoundException('Turma não encontrada.');
        const existing = await this.prisma.classStudent.findUnique({
            where: { classId_email: { classId, email: data.email } },
        });
        if (existing)
            throw new common_1.ConflictException('Aluno com este e-mail já está matriculado nesta turma.');
        return this.prisma.classStudent.create({
            data: { classId, name: data.name, email: data.email },
        });
    }
    async removeStudent(classId, studentId, teacherId) {
        const cls = await this.prisma.class.findFirst({ where: { id: classId, teacherId } });
        if (!cls)
            throw new common_1.ForbiddenException('Acesso negado.');
        await this.prisma.classStudent.delete({ where: { id: studentId } });
        return { message: 'Aluno removido da turma.' };
    }
    async bulkAddStudents(classId, teacherId, students) {
        const cls = await this.prisma.class.findFirst({ where: { id: classId, teacherId } });
        if (!cls)
            throw new common_1.NotFoundException('Turma não encontrada.');
        let added = 0;
        let skipped = 0;
        for (const s of students) {
            try {
                await this.prisma.classStudent.create({
                    data: { classId, name: s.name, email: s.email },
                });
                added++;
            }
            catch {
                skipped++;
            }
        }
        return { added, skipped };
    }
    async getClassByCode(code) {
        const cls = await this.prisma.class.findUnique({
            where: { code: code.toUpperCase() },
            include: { teacher: { select: { name: true } }, _count: { select: { students: true } } },
        });
        if (!cls)
            throw new common_1.NotFoundException('Código de turma inválido.');
        return cls;
    }
    async joinByCode(code, data) {
        const cls = await this.prisma.class.findUnique({ where: { code: code.toUpperCase() } });
        if (!cls)
            throw new common_1.NotFoundException('Código de turma inválido.');
        try {
            return await this.prisma.classStudent.create({
                data: { classId: cls.id, name: data.name, email: data.email },
            });
        }
        catch {
            throw new common_1.ConflictException('Você já está matriculado nesta turma.');
        }
    }
};
exports.ClassesService = ClassesService;
exports.ClassesService = ClassesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ClassesService);
//# sourceMappingURL=classes.service.js.map