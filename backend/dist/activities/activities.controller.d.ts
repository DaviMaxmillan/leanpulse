import { ActivitiesService } from './activities.service';
import * as express from 'express';
export declare class ActivitiesController {
    private readonly activitiesService;
    constructor(activitiesService: ActivitiesService);
    getByCode(code: string): Promise<{
        class: {
            name: string;
            subject: string | null;
            students: {
                id: string;
                email: string;
                name: string;
            }[];
        };
        teacher: {
            name: string;
        };
        questions: ({
            options: {
                id: string;
                text: string;
            }[];
        } & {
            id: string;
            statement: string;
            type: string;
            activityId: string;
            order: number;
        })[];
    } & {
        id: string;
        createdAt: Date;
        title: string;
        teacherId: string;
        classId: string;
        type: string;
        description: string | null;
        code: string;
        fileUrl: string | null;
        filename: string | null;
        dueDate: Date | null;
        isOpen: boolean;
    }>;
    submit(code: string, body: any, files: any[]): Promise<{
        id: string;
        activityId: string;
        studentName: string;
        studentEmail: string;
        grade: number | null;
        submittedAt: Date;
        fileUrl: string | null;
        filename: string | null;
    }>;
    createActivity(body: any, files: any[], req: any): Promise<{
        class: {
            name: string;
        };
        questions: ({
            options: {
                id: string;
                text: string;
                questionId: string;
            }[];
        } & {
            id: string;
            statement: string;
            type: string;
            activityId: string;
            order: number;
        })[];
        _count: {
            submissions: number;
        };
    } & {
        id: string;
        createdAt: Date;
        title: string;
        teacherId: string;
        classId: string;
        type: string;
        description: string | null;
        code: string;
        fileUrl: string | null;
        filename: string | null;
        dueDate: Date | null;
        isOpen: boolean;
    }>;
    getMyActivities(req: any): Promise<({
        class: {
            name: string;
            subject: string | null;
        };
        _count: {
            submissions: number;
        };
    } & {
        id: string;
        createdAt: Date;
        title: string;
        teacherId: string;
        classId: string;
        type: string;
        description: string | null;
        code: string;
        fileUrl: string | null;
        filename: string | null;
        dueDate: Date | null;
        isOpen: boolean;
    })[]>;
    getActivity(id: string, req: any): Promise<{
        class: {
            name: string;
            subject: string | null;
            students: {
                id: string;
                email: string;
                name: string;
                classId: string;
                joinedAt: Date;
            }[];
        };
        questions: ({
            options: {
                id: string;
                text: string;
                questionId: string;
            }[];
        } & {
            id: string;
            statement: string;
            type: string;
            activityId: string;
            order: number;
        })[];
        _count: {
            submissions: number;
        };
        submissions: ({
            answers: ({
                question: {
                    id: string;
                    statement: string;
                    type: string;
                    activityId: string;
                    order: number;
                };
            } & {
                id: string;
                questionId: string;
                fileUrl: string | null;
                filename: string | null;
                textAnswer: string | null;
                selectedOptionId: string | null;
                submissionId: string;
            })[];
        } & {
            id: string;
            activityId: string;
            studentName: string;
            studentEmail: string;
            grade: number | null;
            submittedAt: Date;
            fileUrl: string | null;
            filename: string | null;
        })[];
    } & {
        id: string;
        createdAt: Date;
        title: string;
        teacherId: string;
        classId: string;
        type: string;
        description: string | null;
        code: string;
        fileUrl: string | null;
        filename: string | null;
        dueDate: Date | null;
        isOpen: boolean;
    }>;
    toggleActivity(id: string, req: any): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        teacherId: string;
        classId: string;
        type: string;
        description: string | null;
        code: string;
        fileUrl: string | null;
        filename: string | null;
        dueDate: Date | null;
        isOpen: boolean;
    }>;
    gradeSubmission(subId: string, grade: number): Promise<{
        id: string;
        activityId: string;
        studentName: string;
        studentEmail: string;
        grade: number | null;
        submittedAt: Date;
        fileUrl: string | null;
        filename: string | null;
    }>;
    exportExcel(id: string, req: any, res: express.Response): Promise<void>;
    exportPdf(id: string, subId: string, req: any, res: express.Response): Promise<void>;
    deleteActivity(id: string, req: any): Promise<{
        message: string;
    }>;
}
