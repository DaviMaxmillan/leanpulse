import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpUser && smtpPass) {
      // Real SMTP (Gmail)
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '465'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: smtpUser, pass: smtpPass },
      });
      this.logger.log(`Email Transporter configurado: Gmail (${smtpUser})`);
    } else {
      // Fallback: Ethereal test account
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

  private get from() {
    return process.env.SMTP_FROM || '"LeanPulse" <no-reply@leanpulse.com>';
  }

  /** Send individual report with Excel attachment */
  async sendExamReport(
    to: string,
    studentName: string,
    examTitle: string,
    rawScore: number,
    finalGrade: number,
    weight: number,
    excelBuffer: Buffer,
    fileName: string,
  ) {
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
    // Log Ethereal preview URL if using test account
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) this.logger.log(`Preview: ${previewUrl}`);
    return info;
  }
}
