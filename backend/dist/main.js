"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const prisma_service_1 = require("./prisma/prisma.service");
const path_1 = require("path");
const fs_1 = require("fs");
const bcrypt = __importStar(require("bcrypt"));
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors({ origin: '*' });
    const uploadPath = process.env.UPLOAD_PATH || (0, path_1.join)(process.cwd(), 'uploads');
    if (!(0, fs_1.existsSync)(uploadPath))
        (0, fs_1.mkdirSync)(uploadPath, { recursive: true });
    app.useStaticAssets(uploadPath, { prefix: '/uploads' });
    const prisma = app.get(prisma_service_1.PrismaService);
    const admin = await prisma.user.findFirst({ where: { role: 'SUPERADMIN' } });
    if (!admin) {
        const defaultPassword = await bcrypt.hash('admin123', 10);
        await prisma.user.create({
            data: {
                name: 'Super Administrador',
                email: 'admin',
                password: defaultPassword,
                role: 'SUPERADMIN',
            },
        });
        console.log('Super Administrador criado. Credenciais -> Login: admin / Senha: admin123');
    }
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    const addresses = [];
    for (const k in networkInterfaces) {
        for (const k2 in networkInterfaces[k]) {
            const address = networkInterfaces[k][k2];
            if (address.family === 'IPv4' && !address.internal) {
                addresses.push(address.address);
            }
        }
    }
    await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
    const port = process.env.PORT ?? 3001;
    console.log(`\n✅ Backend LeanPulse rodando na porta: ${port}`);
    addresses.forEach(ip => {
        console.log(`📡 Acesso via rede local: http://${ip}:${port}`);
    });
    console.log("");
}
bootstrap();
//# sourceMappingURL=main.js.map