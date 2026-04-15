import { ClassesService } from './classes.service';
export declare class ClassesController {
    private readonly classesService;
    constructor(classesService: ClassesService);
    getClassByCode(code: string): Promise<{
        teacher: {
            name: string;
        };
        _count: {
            students: number;
        };
    } & {
        id: string;
        name: string;
        createdAt: Date;
        teacherId: string;
        description: string | null;
        subject: string | null;
        period: string | null;
        code: string;
        lessonPlanId: string | null;
        updatedAt: Date;
    }>;
    joinByCode(code: string, body: {
        name: string;
        email: string;
    }): Promise<{
        id: string;
        email: string;
        name: string;
        classId: string;
        joinedAt: Date;
    }>;
    createClass(body: {
        name: string;
        subject?: string;
        description?: string;
        period?: string;
    }, req: any): Promise<{
        _count: {
            students: number;
        };
        students: {
            id: string;
            email: string;
            name: string;
            classId: string;
            joinedAt: Date;
        }[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        teacherId: string;
        description: string | null;
        subject: string | null;
        period: string | null;
        code: string;
        lessonPlanId: string | null;
        updatedAt: Date;
    }>;
    getMyClasses(req: any): Promise<({
        _count: {
            students: number;
        };
    } & {
        id: string;
        name: string;
        createdAt: Date;
        teacherId: string;
        description: string | null;
        subject: string | null;
        period: string | null;
        code: string;
        lessonPlanId: string | null;
        updatedAt: Date;
    })[]>;
    getClass(id: string, req: any): Promise<{
        lessonPlan: {
            id: string;
            title: string;
            subject: string | null;
        } | null;
        _count: {
            students: number;
        };
        students: {
            id: string;
            email: string;
            name: string;
            classId: string;
            joinedAt: Date;
        }[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        teacherId: string;
        description: string | null;
        subject: string | null;
        period: string | null;
        code: string;
        lessonPlanId: string | null;
        updatedAt: Date;
    }>;
    updateClass(id: string, body: {
        name?: string;
        subject?: string;
        description?: string;
        period?: string;
    }, req: any): Promise<{
        _count: {
            students: number;
        };
    } & {
        id: string;
        name: string;
        createdAt: Date;
        teacherId: string;
        description: string | null;
        subject: string | null;
        period: string | null;
        code: string;
        lessonPlanId: string | null;
        updatedAt: Date;
    }>;
    deleteClass(id: string, req: any): Promise<{
        message: string;
    }>;
    cloneClass(id: string, req: any): Promise<{
        _count: {
            students: number;
        };
    } & {
        id: string;
        name: string;
        createdAt: Date;
        teacherId: string;
        description: string | null;
        subject: string | null;
        period: string | null;
        code: string;
        lessonPlanId: string | null;
        updatedAt: Date;
    }>;
    getPerformance(id: string, req: any): Promise<{
        classId: string;
        className: string;
        classAverage: number | null;
        studentsAtRisk: number;
        examResults: {
            roomId: string;
            roomName: string;
            examTitle: string;
            finishedAt: Date | null;
            grades: Record<string, {
                finalGrade: number | null;
                status: string;
            }>;
        }[];
        activityResults: {
            activityId: string;
            activityTitle: string;
            activityType: string;
            submitted: Record<string, {
                submitted: boolean;
                grade: number | null;
            }>;
        }[];
        students: {
            studentId: string;
            studentName: string;
            studentEmail: string;
            average: number | null;
            examCount: number;
            activitiesDone: number;
            totalActivities: number;
            atRisk: boolean;
        }[];
    }>;
    addStudent(id: string, body: {
        name: string;
        email: string;
    }, req: any): Promise<{
        id: string;
        email: string;
        name: string;
        classId: string;
        joinedAt: Date;
    }>;
    bulkAddStudents(id: string, body: {
        students: {
            name: string;
            email: string;
        }[];
    }, req: any): Promise<{
        added: number;
        skipped: number;
    }>;
    removeStudent(classId: string, studentId: string, req: any): Promise<{
        message: string;
    }>;
}
