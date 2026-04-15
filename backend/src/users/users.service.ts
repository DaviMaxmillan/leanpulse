import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createTeacher(email: string, pass: string, name: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Já existe um usuário com este e-mail.');

    const hashedPassword = await bcrypt.hash(pass, 10);
    return this.prisma.user.create({
      data: { name, email, password: hashedPassword, role: 'TEACHER' },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
  }

  async updateTeacher(id: string, data: { name?: string; email?: string; password?: string }) {
    const teacher = await this.prisma.user.findUnique({ where: { id } });
    if (!teacher) throw new NotFoundException('Professor não encontrado.');

    // If email is changing, ensure it's not taken
    if (data.email && data.email !== teacher.email) {
      const conflict = await this.prisma.user.findUnique({ where: { email: data.email } });
      if (conflict) throw new ConflictException('Este e-mail já está em uso por outra conta.');
    }

    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email;
    if (data.password) updateData.password = await bcrypt.hash(data.password, 10);

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
  }

  async deleteTeacher(id: string) {
    const teacher = await this.prisma.user.findUnique({ where: { id } });
    if (!teacher) throw new NotFoundException('Professor não encontrado.');
    if (teacher.role === 'SUPERADMIN') throw new ConflictException('Não é possível excluir o SuperAdmin.');

    // ── Manual cascade: User → Rooms → Sessions → Answers/Violations
    //    and User → Exams → Questions → Options
    //    (SQLite does not propagate cascade across multiple hops automatically)

    // 1. Get all rooms belonging to this teacher
    const rooms = await this.prisma.room.findMany({
      where: { teacherId: id },
      select: { id: true },
    });

    for (const room of rooms) {
      // 2. Get all sessions in those rooms
      const sessions = await this.prisma.examSession.findMany({
        where: { roomId: room.id },
        select: { id: true },
      });

      for (const session of sessions) {
        // 3. Delete answers and violations in each session
        await this.prisma.answer.deleteMany({ where: { sessionId: session.id } });
        await this.prisma.violation.deleteMany({ where: { sessionId: session.id } });
      }

      // 4. Delete sessions in the room
      await this.prisma.examSession.deleteMany({ where: { roomId: room.id } });
    }

    // 5. Delete all rooms of this teacher
    await this.prisma.room.deleteMany({ where: { teacherId: id } });

    // 6. Get all exams belonging to this teacher
    const exams = await this.prisma.exam.findMany({
      where: { userId: id },
      select: { id: true },
    });

    for (const exam of exams) {
      // 7. Delete questions + options (cascade is set for Question → Option in schema)
      await this.prisma.question.deleteMany({ where: { examId: exam.id } });
    }

    // 8. Delete all exams
    await this.prisma.exam.deleteMany({ where: { userId: id } });

    // 9. Finally, delete the user
    return this.prisma.user.delete({ where: { id } });
  }

  async findAllTeachers() {
    return this.prisma.user.findMany({
      where: { role: 'TEACHER' },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
