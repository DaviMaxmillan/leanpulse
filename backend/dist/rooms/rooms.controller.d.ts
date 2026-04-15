import { RoomsService } from './rooms.service';
import * as express from 'express';
export declare class RoomsController {
    private readonly roomsService;
    constructor(roomsService: RoomsService);
    createRoom(body: {
        name: string;
        examId: string;
        classId?: string;
    }, req: any): Promise<{
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
    getTeacherRooms(req: any): Promise<({
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
    finishRoom(id: string, req: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        examId: string;
        status: string;
        finishedAt: Date | null;
        teacherId: string;
        classId: string | null;
    }>;
    deleteRoom(id: string, req: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        examId: string;
        status: string;
        finishedAt: Date | null;
        teacherId: string;
        classId: string | null;
    }>;
    reactivateRoom(id: string, body: {
        examId: string;
    }, req: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        examId: string;
        status: string;
        finishedAt: Date | null;
        teacherId: string;
        classId: string | null;
    }>;
    getRoomReport(id: string, req: any, res: express.Response): Promise<void>;
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
}
