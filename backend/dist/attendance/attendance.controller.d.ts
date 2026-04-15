import { AttendanceService } from './attendance.service';
export declare class AttendanceController {
    private readonly attendanceService;
    constructor(attendanceService: AttendanceService);
    createRecord(classId: string, body: {
        date: string;
        topic?: string;
        notes?: string;
    }, req: any): Promise<{
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
    getClassRecords(classId: string, req: any): Promise<({
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
    getAttendanceSummary(classId: string, req: any): Promise<{
        totalClasses: number;
        students: {
            name: string;
            present: number;
            absent: number;
            pct: number;
            id: string;
        }[];
    }>;
    getRecord(id: string, req: any): Promise<{
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
    updateRecord(id: string, body: {
        date?: string;
        topic?: string;
        notes?: string;
    }, req: any): Promise<{
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
    updateEntry(recordId: string, studentId: string, body: {
        present: boolean;
    }, req: any): Promise<{
        id: string;
        studentId: string;
        studentName: string;
        present: boolean;
        recordId: string;
    }>;
    deleteRecord(id: string, req: any): Promise<{
        message: string;
    }>;
}
