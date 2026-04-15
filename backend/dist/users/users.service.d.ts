import { PrismaService } from '../prisma/prisma.service';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createTeacher(email: string, pass: string, name: string): Promise<{
        id: string;
        email: string;
        name: string;
        createdAt: Date;
        role: string;
    }>;
    updateTeacher(id: string, data: {
        name?: string;
        email?: string;
        password?: string;
    }): Promise<{
        id: string;
        email: string;
        name: string;
        createdAt: Date;
        role: string;
    }>;
    deleteTeacher(id: string): Promise<{
        id: string;
        email: string;
        name: string;
        createdAt: Date;
        password: string;
        role: string;
    }>;
    findAllTeachers(): Promise<{
        id: string;
        email: string;
        name: string;
        createdAt: Date;
        role: string;
    }[]>;
}
