import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    private assertSuperAdmin;
    createTeacher(req: any, body: {
        email: string;
        password: string;
        name: string;
    }): Promise<{
        id: string;
        email: string;
        name: string;
        createdAt: Date;
        role: string;
    }>;
    updateTeacher(req: any, id: string, body: {
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
    deleteTeacher(req: any, id: string): Promise<{
        id: string;
        email: string;
        name: string;
        createdAt: Date;
        password: string;
        role: string;
    }>;
    findAllTeachers(req: any): Promise<{
        id: string;
        email: string;
        name: string;
        createdAt: Date;
        role: string;
    }[]>;
}
