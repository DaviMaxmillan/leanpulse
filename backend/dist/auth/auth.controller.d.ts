import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    studentLogin(signInDto: Record<string, string>): Promise<{
        access_token: string;
        student: {
            id: string;
            email: string;
            name: string;
            createdAt: Date;
        };
    }>;
    teacherLogin(signInDto: Record<string, string>): Promise<{
        access_token: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: string;
        };
    }>;
}
