import { PrismaService } from '../prisma/prisma.service';
export declare class LessonPlansService {
    private prisma;
    constructor(prisma: PrismaService);
    private assertPlanOwner;
    createPlan(teacherId: string, data: {
        title: string;
        subject?: string;
        description?: string;
    }): Promise<{
        _count: {
            classes: number;
            lessons: number;
        };
    } & {
        id: string;
        createdAt: Date;
        title: string;
        teacherId: string;
        description: string | null;
        subject: string | null;
        updatedAt: Date;
    }>;
    getTeacherPlans(teacherId: string): Promise<({
        classes: {
            id: string;
            name: string;
            subject: string | null;
        }[];
        _count: {
            classes: number;
            lessons: number;
        };
    } & {
        id: string;
        createdAt: Date;
        title: string;
        teacherId: string;
        description: string | null;
        subject: string | null;
        updatedAt: Date;
    })[]>;
    getPlanById(planId: string, teacherId: string): Promise<{
        classes: {
            id: string;
            name: string;
            subject: string | null;
        }[];
        _count: {
            lessons: number;
        };
        lessons: ({
            materials: {
                id: string;
                createdAt: Date;
                title: string;
                type: string;
                filename: string | null;
                lessonId: string;
                folderId: string | null;
                url: string | null;
                filesize: number | null;
                mimetype: string | null;
            }[];
            folders: ({
                materials: {
                    id: string;
                    createdAt: Date;
                    title: string;
                    type: string;
                    filename: string | null;
                    lessonId: string;
                    folderId: string | null;
                    url: string | null;
                    filesize: number | null;
                    mimetype: string | null;
                }[];
            } & {
                id: string;
                name: string;
                createdAt: Date;
                lessonId: string;
            })[];
        } & {
            id: string;
            createdAt: Date;
            title: string;
            status: string;
            order: number;
            topic: string | null;
            planId: string;
            objectives: string | null;
        })[];
    } & {
        id: string;
        createdAt: Date;
        title: string;
        teacherId: string;
        description: string | null;
        subject: string | null;
        updatedAt: Date;
    }>;
    updatePlan(planId: string, teacherId: string, data: {
        title?: string;
        subject?: string;
        description?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        teacherId: string;
        description: string | null;
        subject: string | null;
        updatedAt: Date;
    }>;
    deletePlan(planId: string, teacherId: string): Promise<{
        message: string;
    }>;
    assignPlanToClass(planId: string, classId: string, teacherId: string): Promise<{
        lessonPlan: {
            id: string;
            title: string;
        } | null;
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
    unassignPlanFromClass(classId: string, teacherId: string): Promise<{
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
    addLesson(planId: string, teacherId: string, data: {
        title: string;
        topic?: string;
        objectives?: string;
    }): Promise<{
        materials: {
            id: string;
            createdAt: Date;
            title: string;
            type: string;
            filename: string | null;
            lessonId: string;
            folderId: string | null;
            url: string | null;
            filesize: number | null;
            mimetype: string | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        title: string;
        status: string;
        order: number;
        topic: string | null;
        planId: string;
        objectives: string | null;
    }>;
    updateLesson(lessonId: string, teacherId: string, data: {
        title?: string;
        topic?: string;
        objectives?: string;
        status?: string;
        order?: number;
    }): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        status: string;
        order: number;
        topic: string | null;
        planId: string;
        objectives: string | null;
    }>;
    deleteLesson(lessonId: string, teacherId: string): Promise<{
        message: string;
    }>;
    createFolder(lessonId: string, teacherId: string, data: {
        name: string;
    }): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        lessonId: string;
    }>;
    deleteFolder(folderId: string, teacherId: string): Promise<{
        message: string;
    }>;
    addLinkMaterial(lessonId: string, teacherId: string, data: {
        type: string;
        title: string;
        url: string;
        folderId?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        type: string;
        filename: string | null;
        lessonId: string;
        folderId: string | null;
        url: string | null;
        filesize: number | null;
        mimetype: string | null;
    }>;
    addFileMaterial(lessonId: string, teacherId: string, file: any, title?: string, folderId?: string): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        type: string;
        filename: string | null;
        lessonId: string;
        folderId: string | null;
        url: string | null;
        filesize: number | null;
        mimetype: string | null;
    }>;
    deleteMaterial(materialId: string, teacherId: string): Promise<{
        message: string;
    }>;
    private deleteFile;
}
