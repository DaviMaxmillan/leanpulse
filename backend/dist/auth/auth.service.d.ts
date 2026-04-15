import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    studentLogin(name: string, email: string): Promise<{
        access_token: string;
        student: {
            id: string;
            email: string;
            name: string;
            createdAt: Date;
        };
    }>;
    teacherLogin(email: string, pass: string): Promise<{
        access_token: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: string;
        };
    }>;
}
