import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;
  private readonly from: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.resend = new Resend(apiKey);
    this.from = process.env.RESEND_FROM || 'LeanPulse <no-reply@leanpulse.com.br>';

    if (apiKey) {
      this.logger.log(`Email configurado via Resend (${this.from})`);
    } else {
      this.logger.warn('RESEND_API_KEY não configurado — emails não serão enviados!');
    }
  }

  /** Send individual exam report with Excel attachment */
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
        <div style="background: linear-gradient(90deg, #0FA4AF, #0B1E3F); padding: 32px; text-align: center;">
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
            <p style="margin: 0; font-size: 36px; font-weight: 900; color: #0FA4AF;">${finalGrade.toFixed(2)}</p>
          </div>
          <p style="color: #64748b; font-size: 13px;">O gabarito detalhado com cada questão, resposta correta e sua resposta está no arquivo Excel em anexo.</p>
        </div>
        <div style="background: #1e293b; padding: 16px 32px; text-align: center;">
          <p style="margin: 0; color: #4b5563; font-size: 12px;">Este e-mail foi gerado automaticamente pelo sistema LeanPulse • <a href="https://www.leanpulse.com.br" style="color: #0FA4AF;">www.leanpulse.com.br</a></p>
        </div>
      </div>
    `;

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.from,
        to,
        subject: `Seu resultado — ${examTitle}`,
        html,
        attachments: [
          {
            filename: fileName,
            content: excelBuffer,
          },
        ],
      });

      if (error) {
        this.logger.error(`Falha ao enviar email para ${to}:`, error);
        throw new Error(error.message);
      }

      this.logger.log(`Email enviado para ${to}: ${data?.id}`);
      return data;
    } catch (err) {
      this.logger.error('Erro no envio de email:', err);
      throw err;
    }
  }
}
