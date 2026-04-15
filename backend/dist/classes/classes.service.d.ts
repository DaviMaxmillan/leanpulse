import { PrismaService } from '../prisma/prisma.service';
export declare class ClassesService {
    private prisma;
    constructor(prisma: PrismaService);
    createClass(teacherId: string, data: {
        name: string;
        subject?: string;
        description?: string;
        period?: string;
    }): Promise<{
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
    getTeacherClasses(teacherId: string): Promise<({
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
    getClassById(id: string, teacherId: string): Promise<{
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
    getClassPerformance(id: string, teacherId: string): Promise<{
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
    updateClass(id: string, teacherId: string, data: {
        name?: string;
        subject?: string;
        description?: string;
        period?: string;
    }): Promise<{
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
    deleteClass(id: string, teacherId: string): Promise<{
        message: string;
    }>;
    cloneClass(id: string, teacherId: string): Promise<{
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
    addStudent(classId: string, teacherId: string, data: {
        name: string;
        email: string;
    }): Promise<{
        id: string;
        email: string;
        name: string;
        classId: string;
        joinedAt: Date;
    }>;
    removeStudent(classId: string, studentId: string, teacherId: string): Promise<{
        message: string;
    }>;
    bulkAddStudents(classId: string, teacherId: string, students: {
        name: string;
        email: string;
    }[]): Promise<{
        added: number;
        skipped: number;
    }>;
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
    joinByCode(code: string, data: {
        name: string;
        email: string;
    }): Promise<{
        id: string;
        email: string;
        name: string;
        classId: string;
        joinedAt: Date;
    }>;
}
