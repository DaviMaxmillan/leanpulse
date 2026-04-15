import { SessionsService } from './sessions.service';
import type { Response } from 'express';
export declare class SessionsController {
    private readonly sessionsService;
    constructor(sessionsService: SessionsService);
    startSession(body: {
        roomId: string;
        studentId: string;
    }): Promise<{
        id: string;
        studentId: string;
        roomId: string;
        status: string;
        startedAt: Date;
        finishedAt: Date | null;
        violationsCount: number;
        rawScore: number | null;
        finalGrade: number | null;
    }>;
    blockSession(id: string): Promise<{
        id: string;
        studentId: string;
        roomId: string;
        status: string;
        startedAt: Date;
        finishedAt: Date | null;
        violationsCount: number;
        rawScore: number | null;
        finalGrade: number | null;
    }>;
    unblockSession(id: string): Promise<{
        id: string;
        studentId: string;
        roomId: string;
        status: string;
        startedAt: Date;
        finishedAt: Date | null;
        violationsCount: number;
        rawScore: number | null;
        finalGrade: number | null;
    }>;
    finishSession(id: string): Promise<{
        id: string;
        studentId: string;
        roomId: string;
        status: string;
        startedAt: Date;
        finishedAt: Date | null;
        violationsCount: number;
        rawScore: number | null;
        finalGrade: number | null;
    }>;
    submitAnswers(id: string, body: {
        answers: {
            questionId: string;
            selectedOptionIds: string[];
        }[];
    }): Promise<{
        rawScore: number;
        finalGrade: number;
        weight: number;
        session: {
            id: string;
            studentId: string;
            roomId: string;
            status: string;
            startedAt: Date;
            finishedAt: Date | null;
            violationsCount: number;
            rawScore: number | null;
            finalGrade: number | null;
        };
    }>;
    getRoomSessions(roomId: string): Promise<({
        student: {
            id: string;
            email: string;
            name: string;
            createdAt: Date;
        };
        answers: {
            id: string;
            questionId: string;
            selectedOptionIds: string;
            score: number;
            studentId: string;
            sessionId: string;
        }[];
        violations: {
            id: string;
            sessionId: string;
            type: string;
            timestamp: Date;
            screenshot: string | null;
        }[];
    } & {
        id: string;
        studentId: string;
        roomId: string;
        status: string;
        startedAt: Date;
        finishedAt: Date | null;
        violationsCount: number;
        rawScore: number | null;
        finalGrade: number | null;
    })[]>;
    downloadReport(id: string, res: Response): Promise<void>;
    sendReport(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
