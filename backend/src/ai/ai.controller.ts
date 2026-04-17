import {
  Controller, Post, UploadedFile, UseInterceptors,
  UseGuards, BadRequestException, Body, Request
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { memoryStorage } from 'multer';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly prisma: PrismaService,
  ) {}

  /** Get the teacher's stored API key from the database */
  private async getTeacherApiKey(userId: string): Promise<string | undefined> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { geminiApiKey: true },
    });
    return user?.geminiApiKey ?? undefined;
  }

  @Post('parse-pdf')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
      fileFilter: (_, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          return cb(new BadRequestException('Apenas arquivos PDF são aceitos.'), false);
        }
        cb(null, true);
      },
    }),
  )
  async parsePdf(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
    @Body('customPrompt') customPrompt?: string,
  ) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    const apiKey = await this.getTeacherApiKey(req.user.id);
    if (!apiKey) {
      throw new BadRequestException(
        'Chave da API Gemini não configurada. Acesse as Configurações de IA no seu painel para adicionar sua chave pessoal.',
      );
    }
    return this.aiService.parsePdfToQuestions(file.buffer, apiKey, customPrompt);
  }

  @Post('generate-activity')
  async generateActivity(
    @Request() req: any,
    @Body('topic') topic: string,
    @Body('count') count?: number,
  ) {
    if (!topic) throw new BadRequestException('Topic is required');
    const apiKey = await this.getTeacherApiKey(req.user.id);
    if (!apiKey) {
      throw new BadRequestException(
        'Chave da API Gemini não configurada. Configure nas Configurações de IA do seu painel.',
      );
    }
    return this.aiService.generateQuestionsByTopic(topic, count || 3, apiKey);
  }
}
