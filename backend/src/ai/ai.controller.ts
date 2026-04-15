import {
  Controller, Post, UploadedFile, UseInterceptors,
  UseGuards, BadRequestException, Body
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { memoryStorage } from 'multer';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

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
    @Body('apiKey') apiKey?: string,
    @Body('customPrompt') customPrompt?: string,
  ) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    return this.aiService.parsePdfToQuestions(file.buffer, apiKey, customPrompt);
  }

  @Post('generate-activity')
  async generateActivity(
    @Body('topic') topic: string,
    @Body('count') count?: number,
    @Body('apiKey') apiKey?: string,
  ) {
    if (!topic) throw new BadRequestException('Topic is required');
    return this.aiService.generateQuestionsByTopic(topic, count || 3, apiKey);
  }
}
