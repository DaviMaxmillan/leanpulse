import { AiService } from './ai.service';
export declare class AiController {
    private readonly aiService;
    constructor(aiService: AiService);
    parsePdf(file: Express.Multer.File, apiKey?: string, customPrompt?: string): Promise<any[]>;
    generateActivity(topic: string, count?: number, apiKey?: string): Promise<any[]>;
}
