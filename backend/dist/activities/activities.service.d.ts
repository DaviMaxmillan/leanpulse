import { PrismaService } from '../prisma/prisma.service';
import { Buffer } from 'buffer';
export interface ActivityQuestionDto {
    statement: string;
    type: 'TEXT' | 'MULTIPLE_CHOICE' | 'FILE';
    order?: number;
    options?: {
        text: string;
    }[];
}
export declare class ActivitiesService {
    private prisma;
    constructor(prisma: PrismaService);
    createActivity(teacherId: string, data: {
        title: string;
        description?: string;
        type?: string;
        classId: string;
        dueDate?: string;
        questions: ActivityQuestionDto[];
    }, files?: any[]): Promise<{
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
    getTeacherActivities(teacherId: string): Promise<({
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
    getActivityById(id: string, teacherId: string): Promise<{
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
    toggleActivity(id: string, teacherId: string): Promise<{
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
    deleteActivity(id: string, teacherId: string): Promise<{
        message: string;
    }>;
    getActivityByCode(code: string): Promise<{
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
    submitActivity(code: string, data: {
        studentName: string;
        studentEmail: string;
        answers: {
            questionId: string;
            textAnswer?: string;
            selectedOptionId?: string;
        }[];
    }, files: any[]): Promise<{
        id: string;
        activityId: string;
        studentName: string;
        studentEmail: string;
        grade: number | null;
        submittedAt: Date;
        fileUrl: string | null;
        filename: string | null;
    }>;
    gradeSubmission(submissionId: string, grade: number): Promise<{
        id: string;
        activityId: string;
        studentName: string;
        studentEmail: string;
        grade: number | null;
        submittedAt: Date;
        fileUrl: string | null;
        filename: string | null;
    }>;
    exportActivityToExcel(activityId: string, teacherId: string): Promise<Buffer>;
    exportSubmissionToPdf(activityId: string, submissionId: string, teacherId: string): Promise<Buffer>;
}
