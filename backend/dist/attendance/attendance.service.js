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
exports.AttendanceService = void 0;
exports.todayBrazil = todayBrazil;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
function todayBrazil() {
    const now = new Date();
    const brazil = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    return brazil.toISOString().split('T')[0];
}
let AttendanceService = class AttendanceService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async assertClassOwner(classId, teacherId) {
        const cls = await this.prisma.class.findFirst({ where: { id: classId, teacherId } });
        if (!cls)
            throw new common_1.NotFoundException('Turma não encontrada.');
        return cls;
    }
    async createRecord(classId, teacherId, data) {
        await this.assertClassOwner(classId, teacherId);
        const today = todayBrazil();
        if (data.date > today) {
            throw new common_1.ForbiddenException(`Não é possível registrar chamada para datas futuras. Hoje é ${today}.`);
        }
        const existing = await this.prisma.attendanceRecord.findUnique({
            where: { classId_date: { classId, date: data.date } },
        });
        if (existing)
            throw new common_1.ConflictException('Já existe uma chamada para esta data.');
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
    async getClassRecords(classId, teacherId) {
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
    async getRecord(recordId, teacherId) {
        const record = await this.prisma.attendanceRecord.findUnique({
            where: { id: recordId },
            include: { entries: { orderBy: { studentName: 'asc' } }, class: true },
        });
        if (!record)
            throw new common_1.NotFoundException('Chamada não encontrada.');
        if (record.class.teacherId !== teacherId)
            throw new common_1.ForbiddenException('Permissão negada.');
        return record;
    }
    async updateRecord(recordId, teacherId, data) {
        const record = await this.getRecord(recordId, teacherId);
        if (data.date) {
            const today = todayBrazil();
            if (data.date > today) {
                throw new common_1.ForbiddenException('Não é possível alterar para uma data futura.');
            }
            const conflict = await this.prisma.attendanceRecord.findFirst({
                where: { classId: record.classId, date: data.date, id: { not: recordId } },
            });
            if (conflict)
                throw new common_1.ConflictException('Já existe uma chamada para esta data.');
        }
        return this.prisma.attendanceRecord.update({
            where: { id: recordId },
            data: { topic: data.topic, notes: data.notes, date: data.date },
            include: { entries: { orderBy: { studentName: 'asc' } } },
        });
    }
    async updateEntry(recordId, studentId, teacherId, present) {
        const record = await this.prisma.attendanceRecord.findUnique({
            where: { id: recordId },
            include: { class: true },
        });
        if (!record)
            throw new common_1.NotFoundException('Chamada não encontrada.');
        if (record.class.teacherId !== teacherId)
            throw new common_1.ForbiddenException('Permissão negada.');
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
    async deleteRecord(recordId, teacherId) {
        await this.getRecord(recordId, teacherId);
        await this.prisma.attendanceRecord.delete({ where: { id: recordId } });
        return { message: 'Chamada excluída.' };
    }
    async getAttendanceSummary(classId, teacherId) {
        await this.assertClassOwner(classId, teacherId);
        const records = await this.prisma.attendanceRecord.findMany({
            where: { classId },
            include: { entries: true },
        });
        const totalClasses = records.length;
        const byStudent = {};
        for (const record of records) {
            for (const entry of record.entries) {
                if (!byStudent[entry.studentId]) {
                    byStudent[entry.studentId] = { name: entry.studentName, present: 0, absent: 0, pct: 0 };
                }
                if (entry.present)
                    byStudent[entry.studentId].present++;
                else
                    byStudent[entry.studentId].absent++;
            }
        }
        Object.values(byStudent).forEach(s => {
            s.pct = totalClasses > 0 ? Math.round((s.present / totalClasses) * 100) : 100;
        });
        return { totalClasses, students: Object.entries(byStudent).map(([id, data]) => ({ id, ...data })) };
    }
};
exports.AttendanceService = AttendanceService;
exports.AttendanceService = AttendanceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AttendanceService);
//# sourceMappingURL=attendance.service.js.map