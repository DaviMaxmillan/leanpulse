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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createTeacher(email, pass, name) {
        const existing = await this.prisma.user.findUnique({ where: { email } });
        if (existing)
            throw new common_1.ConflictException('Já existe um usuário com este e-mail.');
        const hashedPassword = await bcrypt.hash(pass, 10);
        return this.prisma.user.create({
            data: { name, email, password: hashedPassword, role: 'TEACHER' },
            select: { id: true, name: true, email: true, role: true, createdAt: true },
        });
    }
    async updateTeacher(id, data) {
        const teacher = await this.prisma.user.findUnique({ where: { id } });
        if (!teacher)
            throw new common_1.NotFoundException('Professor não encontrado.');
        if (data.email && data.email !== teacher.email) {
            const conflict = await this.prisma.user.findUnique({ where: { email: data.email } });
            if (conflict)
                throw new common_1.ConflictException('Este e-mail já está em uso por outra conta.');
        }
        const updateData = {};
        if (data.name)
            updateData.name = data.name;
        if (data.email)
            updateData.email = data.email;
        if (data.password)
            updateData.password = await bcrypt.hash(data.password, 10);
        return this.prisma.user.update({
            where: { id },
            data: updateData,
            select: { id: true, name: true, email: true, role: true, createdAt: true },
        });
    }
    async deleteTeacher(id) {
        const teacher = await this.prisma.user.findUnique({ where: { id } });
        if (!teacher)
            throw new common_1.NotFoundException('Professor não encontrado.');
        if (teacher.role === 'SUPERADMIN')
            throw new common_1.ConflictException('Não é possível excluir o SuperAdmin.');
        const rooms = await this.prisma.room.findMany({
            where: { teacherId: id },
            select: { id: true },
        });
        for (const room of rooms) {
            const sessions = await this.prisma.examSession.findMany({
                where: { roomId: room.id },
                select: { id: true },
            });
            for (const session of sessions) {
                await this.prisma.answer.deleteMany({ where: { sessionId: session.id } });
                await this.prisma.violation.deleteMany({ where: { sessionId: session.id } });
            }
            await this.prisma.examSession.deleteMany({ where: { roomId: room.id } });
        }
        await this.prisma.room.deleteMany({ where: { teacherId: id } });
        const exams = await this.prisma.exam.findMany({
            where: { userId: id },
            select: { id: true },
        });
        for (const exam of exams) {
            await this.prisma.question.deleteMany({ where: { examId: exam.id } });
        }
        await this.prisma.exam.deleteMany({ where: { userId: id } });
        return this.prisma.user.delete({ where: { id } });
    }
    async findAllTeachers() {
        return this.prisma.user.findMany({
            where: { role: 'TEACHER' },
            select: { id: true, name: true, email: true, role: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map