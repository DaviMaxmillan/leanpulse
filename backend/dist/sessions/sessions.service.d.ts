import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
export declare class SessionsService {
    private readonly prisma;
    private readonly emailService;
    constructor(prisma: PrismaService, emailService: EmailService);
    startSession(roomId: string, studentId: string): Promise<{
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
    blockSession(sessionId: string): Promise<{
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
    unblockSession(sessionId: string): Promise<{
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
    finishSession(sessionId: string): Promise<{
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
    getSessionsByRoom(roomId: string): Promise<({
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
    recordViolation(sessionId: string, type: string, screenshot?: string): Promise<{
        id: string;
        sessionId: string;
        type: string;
        timestamp: Date;
        screenshot: string | null;
    }>;
    submitAnswers(sessionId: string, answers: {
        questionId: string;
        selectedOptionIds: string[];
    }[]): Promise<{
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
    getSessionReport(sessionId: string): Promise<Buffer>;
    sendReportEmail(sessionId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
