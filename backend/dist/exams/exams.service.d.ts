import { PrismaService } from '../prisma/prisma.service';
export declare class ExamsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(data: {
        title: string;
        duration: number;
        weight: number;
        showOneAtATime?: boolean;
        randomizeQuestions?: boolean;
        randomizeOptions?: boolean;
        allowBackNavigation?: boolean;
        questions: {
            statement: string;
            pointValue: number;
            scoringMode: string;
            options: {
                text: string;
                isCorrect: boolean;
            }[];
        }[];
    }, userId: string): Promise<{
        questions: ({
            options: {
                id: string;
                text: string;
                isCorrect: boolean;
                questionId: string;
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
    }>;
    update(id: string, data: {
        title?: string;
        duration?: number;
        weight?: number;
        showOneAtATime?: boolean;
        randomizeQuestions?: boolean;
        randomizeOptions?: boolean;
        allowBackNavigation?: boolean;
        questions?: {
            statement: string;
            pointValue: number;
            scoringMode: string;
            options: {
                text: string;
                isCorrect: boolean;
            }[];
        }[];
    }, userId: string): Promise<{
        questions: ({
            options: {
                id: string;
                text: string;
                isCorrect: boolean;
                questionId: string;
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
    }>;
    findAllByTeacher(userId: string): Promise<({
        questions: ({
            options: {
                id: string;
                text: string;
                isCorrect: boolean;
                questionId: string;
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
    })[]>;
    findOne(id: string): Promise<({
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
    }) | null>;
    delete(id: string, userId: string): Promise<{
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
    }>;
}
