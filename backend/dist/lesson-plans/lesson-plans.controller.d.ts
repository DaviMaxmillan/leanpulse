import { LessonPlansService } from './lesson-plans.service';
export declare class LessonPlansController {
    private readonly lessonPlansService;
    constructor(lessonPlansService: LessonPlansService);
    createPlan(body: {
        title: string;
        subject?: string;
        description?: string;
    }, req: any): Promise<{
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
    getMyPlans(req: any): Promise<({
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
    getPlan(id: string, req: any): Promise<{
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
    updatePlan(id: string, body: {
        title?: string;
        subject?: string;
        description?: string;
    }, req: any): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        teacherId: string;
        description: string | null;
        subject: string | null;
        updatedAt: Date;
    }>;
    deletePlan(id: string, req: any): Promise<{
        message: string;
    }>;
    assignToClass(planId: string, classId: string, req: any): Promise<{
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
    unassignFromClass(classId: string, req: any): Promise<{
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
    addLesson(planId: string, body: {
        title: string;
        topic?: string;
        objectives?: string;
    }, req: any): Promise<{
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
    updateLesson(lessonId: string, body: {
        title?: string;
        topic?: string;
        objectives?: string;
        status?: string;
    }, req: any): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        status: string;
        order: number;
        topic: string | null;
        planId: string;
        objectives: string | null;
    }>;
    deleteLesson(lessonId: string, req: any): Promise<{
        message: string;
    }>;
    createFolder(lessonId: string, body: {
        name: string;
    }, req: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        lessonId: string;
    }>;
    deleteFolder(folderId: string, req: any): Promise<{
        message: string;
    }>;
    addLink(lessonId: string, body: {
        type: string;
        title: string;
        url: string;
        folderId?: string;
    }, req: any): Promise<{
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
    uploadFile(lessonId: string, body: {
        title?: string;
        folderId?: string;
    }, file: any, req: any): Promise<{
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
    deleteMaterial(materialId: string, req: any): Promise<{
        message: string;
    }>;
}
