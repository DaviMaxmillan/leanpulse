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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const nodemailer = __importStar(require("nodemailer"));
let EmailService = EmailService_1 = class EmailService {
    transporter;
    logger = new common_1.Logger(EmailService_1.name);
    constructor() {
        this.initializeTransporter();
    }
    initializeTransporter() {
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;
        if (smtpUser && smtpPass) {
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: parseInt(process.env.SMTP_PORT || '465'),
                secure: process.env.SMTP_SECURE === 'true',
                auth: { user: smtpUser, pass: smtpPass },
            });
            this.logger.log(`Email Transporter configurado: Gmail (${smtpUser})`);
        }
        else {
            nodemailer.createTestAccount().then((account) => {
                this.transporter = nodemailer.createTransport({
                    host: account.smtp.host,
                    port: account.smtp.port,
                    secure: account.smtp.secure,
                    auth: { user: account.user, pass: account.pass },
                });
                this.logger.log(`[DEV] Email Transporter (Ethereal): ${account.user}`);
            });
        }
    }
    get from() {
        return process.env.SMTP_FROM || '"LeanPulse" <no-reply@leanpulse.com>';
    }
    async sendExamReport(to, studentName, examTitle, rawScore, finalGrade, weight, excelBuffer, fileName) {
        const multiplier = (weight / 10).toFixed(2);
        const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 620px; margin: auto; background: #0f172a; color: #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(90deg, #6366f1, #8b5cf6); padding: 32px; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 28px; letter-spacing: 1px;">LeanPulse</h1>
          <p style="margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">Resultado da Avaliação</p>
        </div>
        <div style="padding: 32px;">
          <p style="font-size: 17px;">Olá, <strong>${studentName}</strong>!</p>
          <p style="color: #94a3b8;">Sua avaliação <strong style="color: #e2e8f0;">${examTitle}</strong> foi corrigida. Veja seu resultado abaixo:</p>
          <div style="background: #1e293b; border-radius: 10px; padding: 24px; margin: 24px 0; text-align: center;">
            <p style="margin: 0 0 8px; color: #94a3b8; font-size: 13px;">PONTOS OBTIDOS</p>
            <p style="margin: 0 0 16px; font-size: 22px; font-weight: bold;">${rawScore.toFixed(1)}</p>
            <p style="margin: 0 0 8px; color: #94a3b8; font-size: 13px;">NOTA FINAL (peso ${weight} × ${multiplier})</p>
            <p style="margin: 0; font-size: 36px; font-weight: 900; color: #818cf8;">${finalGrade.toFixed(2)}</p>
          </div>
          <p style="color: #64748b; font-size: 13px;">O gabarito detalhado com cada questão, resposta correta e sua resposta está no arquivo Excel em anexo.</p>
        </div>
        <div style="background: #1e293b; padding: 16px 32px; text-align: center;">
          <p style="margin: 0; color: #4b5563; font-size: 12px;">Este e-mail foi gerado automaticamente pelo sistema LeanPulse.</p>
        </div>
      </div>
    `;
        const info = await this.transporter.sendMail({
            from: this.from,
            to,
            subject: `Seu resultado — ${examTitle}`,
            html,
            attachments: [
                { filename: fileName, content: excelBuffer, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
            ],
        });
        this.logger.log(`Email enviado para ${to}: ${info.messageId}`);
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl)
            this.logger.log(`Preview: ${previewUrl}`);
        return info;
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], EmailService);
//# sourceMappingURL=email.service.js.map