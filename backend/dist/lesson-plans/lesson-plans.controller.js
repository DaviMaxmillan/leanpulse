"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LessonPlansController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const lesson_plans_service_1 = require("./lesson-plans.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let LessonPlansController = class LessonPlansController {
    lessonPlansService;
    constructor(lessonPlansService) {
        this.lessonPlansService = lessonPlansService;
    }
    createPlan(body, req) {
        return this.lessonPlansService.createPlan(req.user.id, body);
    }
    getMyPlans(req) {
        return this.lessonPlansService.getTeacherPlans(req.user.id);
    }
    getPlan(id, req) {
        return this.lessonPlansService.getPlanById(id, req.user.id);
    }
    updatePlan(id, body, req) {
        return this.lessonPlansService.updatePlan(id, req.user.id, body);
    }
    deletePlan(id, req) {
        return this.lessonPlansService.deletePlan(id, req.user.id);
    }
    assignToClass(planId, classId, req) {
        return this.lessonPlansService.assignPlanToClass(planId, classId, req.user.id);
    }
    unassignFromClass(classId, req) {
        return this.lessonPlansService.unassignPlanFromClass(classId, req.user.id);
    }
    addLesson(planId, body, req) {
        return this.lessonPlansService.addLesson(planId, req.user.id, body);
    }
    updateLesson(lessonId, body, req) {
        return this.lessonPlansService.updateLesson(lessonId, req.user.id, body);
    }
    deleteLesson(lessonId, req) {
        return this.lessonPlansService.deleteLesson(lessonId, req.user.id);
    }
    createFolder(lessonId, body, req) {
        return this.lessonPlansService.createFolder(lessonId, req.user.id, body);
    }
    deleteFolder(folderId, req) {
        return this.lessonPlansService.deleteFolder(folderId, req.user.id);
    }
    addLink(lessonId, body, req) {
        return this.lessonPlansService.addLinkMaterial(lessonId, req.user.id, body);
    }
    async uploadFile(lessonId, body, file, req) {
        return this.lessonPlansService.addFileMaterial(lessonId, req.user.id, file, body.title, body.folderId);
    }
    deleteMaterial(materialId, req) {
        return this.lessonPlansService.deleteMaterial(materialId, req.user.id);
    }
};
exports.LessonPlansController = LessonPlansController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], LessonPlansController.prototype, "createPlan", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LessonPlansController.prototype, "getMyPlans", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LessonPlansController.prototype, "getPlan", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], LessonPlansController.prototype, "updatePlan", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LessonPlansController.prototype, "deletePlan", null);
__decorate([
    (0, common_1.Post)(':planId/assign/:classId'),
    __param(0, (0, common_1.Param)('planId')),
    __param(1, (0, common_1.Param)('classId')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], LessonPlansController.prototype, "assignToClass", null);
__decorate([
    (0, common_1.Delete)('class/:classId/unassign'),
    __param(0, (0, common_1.Param)('classId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LessonPlansController.prototype, "unassignFromClass", null);
__decorate([
    (0, common_1.Post)(':planId/lessons'),
    __param(0, (0, common_1.Param)('planId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], LessonPlansController.prototype, "addLesson", null);
__decorate([
    (0, common_1.Put)('lessons/:lessonId'),
    __param(0, (0, common_1.Param)('lessonId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], LessonPlansController.prototype, "updateLesson", null);
__decorate([
    (0, common_1.Delete)('lessons/:lessonId'),
    __param(0, (0, common_1.Param)('lessonId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LessonPlansController.prototype, "deleteLesson", null);
__decorate([
    (0, common_1.Post)('lessons/:lessonId/folders'),
    __param(0, (0, common_1.Param)('lessonId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], LessonPlansController.prototype, "createFolder", null);
__decorate([
    (0, common_1.Delete)('folders/:folderId'),
    __param(0, (0, common_1.Param)('folderId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LessonPlansController.prototype, "deleteFolder", null);
__decorate([
    (0, common_1.Post)('lessons/:lessonId/materials/link'),
    __param(0, (0, common_1.Param)('lessonId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], LessonPlansController.prototype, "addLink", null);
__decorate([
    (0, common_1.Post)('lessons/:lessonId/materials/upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.Param)('lessonId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFile)()),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], LessonPlansController.prototype, "uploadFile", null);
__decorate([
    (0, common_1.Delete)('materials/:materialId'),
    __param(0, (0, common_1.Param)('materialId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LessonPlansController.prototype, "deleteMaterial", null);
exports.LessonPlansController = LessonPlansController = __decorate([
    (0, common_1.Controller)('lesson-plans'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [lesson_plans_service_1.LessonPlansService])
], LessonPlansController);
//# sourceMappingURL=lesson-plans.controller.js.map