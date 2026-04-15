import { ExamsService } from './exams.service';
export declare class ExamsController {
    private readonly examsService;
    constructor(examsService: ExamsService);
    create(createExamDto: any, req: any): Promise<{
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
    update(id: string, updateExamDto: any, req: any): Promise<{
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
    findAllByTeacher(req: any): Promise<({
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
    delete(id: string, req: any): Promise<{
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
