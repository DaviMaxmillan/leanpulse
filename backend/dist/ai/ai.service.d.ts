export declare class AiService {
    private readonly logger;
    constructor();
    parsePdfToQuestions(pdfBuffer: Buffer, userApiKey?: string, customPrompt?: string): Promise<any[]>;
    private callGemini;
    generateQuestionsByTopic(topic: string, count?: number, userApiKey?: string): Promise<any[]>;
}
