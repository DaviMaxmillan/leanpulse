import { PrismaService } from '../prisma/prisma.service';
export declare function todayBrazil(): string;
export declare class AttendanceService {
    private prisma;
    constructor(prisma: PrismaService);
    private assertClassOwner;
    createRecord(classId: string, teacherId: string, data: {
        date: string;
        topic?: string;
        notes?: string;
    }): Promise<{
        entries: {
            id: string;
            studentId: string;
            studentName: string;
            present: boolean;
            recordId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        classId: string;
        updatedAt: Date;
        date: string;
        topic: string | null;
        notes: string | null;
    }>;
    getClassRecords(classId: string, teacherId: string): Promise<({
        _count: {
            entries: number;
        };
        entries: {
            id: string;
            studentId: string;
            studentName: string;
            present: boolean;
            recordId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        classId: string;
        updatedAt: Date;
        date: string;
        topic: string | null;
        notes: string | null;
    })[]>;
    getRecord(recordId: string, teacherId: string): Promise<{
        class: {
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
        };
        entries: {
            id: string;
            studentId: string;
            studentName: string;
            present: boolean;
            recordId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        classId: string;
        updatedAt: Date;
        date: string;
        topic: string | null;
        notes: string | null;
    }>;
    updateRecord(recordId: string, teacherId: string, data: {
        topic?: string;
        notes?: string;
        date?: string;
    }): Promise<{
        entries: {
            id: string;
            studentId: string;
            studentName: string;
            present: boolean;
            recordId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        classId: string;
        updatedAt: Date;
        date: string;
        topic: string | null;
        notes: string | null;
    }>;
    updateEntry(recordId: string, studentId: string, teacherId: string, present: boolean): Promise<{
        id: string;
        studentId: string;
        studentName: string;
        present: boolean;
        recordId: string;
    }>;
    deleteRecord(recordId: string, teacherId: string): Promise<{
        message: string;
    }>;
    getAttendanceSummary(classId: string, teacherId: string): Promise<{
        totalClasses: number;
        students: {
            name: string;
            present: number;
            absent: number;
            pct: number;
            id: string;
        }[];
    }>;
}
