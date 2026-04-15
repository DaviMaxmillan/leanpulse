import { PrismaService } from '../prisma/prisma.service';
export declare class RoomsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createRoom(name: string, examId: string, teacherId: string, classId?: string): Promise<{
        class: {
            name: string;
        } | null;
    } & {
        id: string;
        name: string;
        createdAt: Date;
        examId: string;
        status: string;
        finishedAt: Date | null;
        teacherId: string;
        classId: string | null;
    }>;
    finishRoom(id: string, teacherId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        examId: string;
        status: string;
        finishedAt: Date | null;
        teacherId: string;
        classId: string | null;
    }>;
    deleteRoom(id: string, teacherId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        examId: string;
        status: string;
        finishedAt: Date | null;
        teacherId: string;
        classId: string | null;
    }>;
    reactivateRoom(id: string, newExamId: string, teacherId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        examId: string;
        status: string;
        finishedAt: Date | null;
        teacherId: string;
        classId: string | null;
    }>;
    getRoomsByTeacher(teacherId: string): Promise<({
        exam: {
            title: string;
            weight: number;
        };
        _count: {
            sessions: number;
        };
    } & {
        id: string;
        name: string;
        createdAt: Date;
        examId: string;
        status: string;
        finishedAt: Date | null;
        teacherId: string;
        classId: string | null;
    })[]>;
    getRoomByName(name: string): Promise<{
        class: {
            name: string;
            subject: string | null;
            students: {
                id: string;
                email: string;
                name: string;
            }[];
        } | null;
        exam: {
            questions: ({
                options: {
                    id: string;
                    text: string;
                }[];
            } & {
                id: string;
                statement: string;
                pointValue: number;
                scoringMode: string;
                examId: string;
            })[];
        } & {
            id: string;
            createdAt: Date;
            title: string;
            duration: number;
            weight: number;
            showOneAtATime: boolean;
            randomizeQuestions: boolean;
            randomizeOptions: boolean;
            allowBackNavigation: boolean;
            userId: string;
        };
    } & {
        id: string;
        name: string;
        createdAt: Date;
        examId: string;
        status: string;
        finishedAt: Date | null;
        teacherId: string;
        classId: string | null;
    }>;
    generateRoomReport(id: string, teacherId: string): Promise<Buffer>;
}
