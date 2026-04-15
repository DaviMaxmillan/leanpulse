"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LessonPlansModule = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const fs_1 = require("fs");
const lesson_plans_controller_1 = require("./lesson-plans.controller");
const lesson_plans_service_1 = require("./lesson-plans.service");
const prisma_module_1 = require("../prisma/prisma.module");
const uploadDir = process.env.UPLOAD_PATH || (0, path_1.join)(process.cwd(), 'uploads');
if (!(0, fs_1.existsSync)(uploadDir))
    (0, fs_1.mkdirSync)(uploadDir, { recursive: true });
let LessonPlansModule = class LessonPlansModule {
};
exports.LessonPlansModule = LessonPlansModule;
exports.LessonPlansModule = LessonPlansModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            platform_express_1.MulterModule.register({
                storage: (0, multer_1.diskStorage)({
                    destination: (_req, _file, cb) => cb(null, uploadDir),
                    filename: (_req, file, cb) => {
                        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
                        cb(null, `${unique}${(0, path_1.extname)(file.originalname)}`);
                    },
                }),
                limits: { fileSize: 10 * 1024 * 1024 },
            }),
        ],
        controllers: [lesson_plans_controller_1.LessonPlansController],
        providers: [lesson_plans_service_1.LessonPlansService],
        exports: [lesson_plans_service_1.LessonPlansService],
    })
], LessonPlansModule);
//# sourceMappingURL=lesson-plans.module.js.map