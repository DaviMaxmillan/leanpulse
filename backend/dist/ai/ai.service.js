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
var AiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const generative_ai_1 = require("@google/generative-ai");
let AiService = AiService_1 = class AiService {
    logger = new common_1.Logger(AiService_1.name);
    constructor() { }
    async parsePdfToQuestions(pdfBuffer, userApiKey, customPrompt) {
        const apiKey = userApiKey || process.env.GEMINI_API_KEY;
        if (!apiKey)
            throw new common_1.BadRequestException('Nenhuma chave de API do Gemini configurada ou fornecida.');
        const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        const attempts = [
            { model: 'gemini-2.5-flash', apiVersion: 'v1beta' },
            { model: 'gemini-2.0-flash', apiVersion: 'v1beta' },
            { model: 'gemini-2.0-flash-lite', apiVersion: 'v1beta' },
            { model: 'gemini-2.5-pro', apiVersion: 'v1beta' },
        ];
        const errors = [];
        for (const attempt of attempts) {
            try {
                this.logger.log(`Trying ${attempt.model} (${attempt.apiVersion})...`);
                const model = genAI.getGenerativeModel({
                    model: attempt.model,
                    generationConfig: {
                        maxOutputTokens: 8192,
                        temperature: 0.1
                    }
                }, { apiVersion: attempt.apiVersion });
                const result = await this.callGemini(model, pdfBuffer, customPrompt);
                this.logger.log(`Success with ${attempt.model} (${attempt.apiVersion})`);
                return result;
            }
            catch (err) {
                const msg = err?.message || String(err);
                this.logger.warn(`${attempt.model}/${attempt.apiVersion} failed: ${msg.substring(0, 150)}`);
                errors.push(`[${attempt.model}/${attempt.apiVersion}]: ${msg.substring(0, 120)}`);
                const isRetryable = msg.includes('not found') || msg.includes('404') ||
                    msg.includes('429') || msg.includes('quota') ||
                    msg.includes('UNAVAILABLE') || msg.includes('503');
                if (!isRetryable)
                    break;
            }
        }
        const summary = errors.join('\n');
        this.logger.error(`All Gemini attempts failed:\n${summary}`);
        throw new common_1.BadRequestException(`Não foi possível processar o PDF. Detalhes:\n${errors[0] || 'Erro desconhecido'}`);
    }
    async callGemini(model, pdfBuffer, customPrompt) {
        const basePrompt = `Você é um robô extrator de dados de provas. Sua ÚNICA tarefa é extrair ABSOLUTAMENTE TODAS as questões de múltipla escolha do documento.

O PDF pode conter muitas questões. VOCÊ ESTÁ PROIBIDO DE PARAR ANTES DO FIM DO ARQUIVO.
NÃO GERE JSON! GERE TEXTO PURAMENTE ESTRUTURADO COM O DELIMITADOR "@@@".

Formatação EXIGIDA para CADA questão:
@@@
[ENUNCIADO]
Texto do enunciado transcrito EXACTAMENTE como no original, sem cortes.
[PONTOS]
1
[MODO]
ANY_CORRECT
[OPCOES]
(F) Texto da alternativa errada
(V) Texto da alternativa certa
(F) Outra errada
@@@

Regras:
- Separe CADA questão usando "@@@" no início.
- [ENUNCIADO]: Coloque a pergunta completa.
- [PONTOS]: Geralmente 1.
- [MODO]: "ANY_CORRECT" (apenas 1 certa) ou "ALL_REQUIRED" (múltiplas certas).
- [OPCOES]: Prefixe com "(V) " para a correta e "(F) " para as incorretas.
- Se não identificar o gabarito no PDF, marque a letra A como (V) e coloque "(verificar)" no texto.
- Extraia TODAS as questões até o fim da última página.`;
        const instructionsToAi = customPrompt
            ? `${basePrompt}\n\nINSTRUÇÕES ADICIONAIS DO PROFESSOR:\n${customPrompt}`
            : basePrompt;
        this.logger.log(`Sending PDF (${(pdfBuffer.length / 1024).toFixed(1)} KB) to Gemini...`);
        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType: 'application/pdf',
                    data: pdfBuffer.toString('base64'),
                },
            },
            { text: instructionsToAi },
        ]);
        const raw = result.response.text().trim();
        this.logger.log(`Response received (${raw.length} chars)`);
        const blocks = raw.split('@@@').map((b) => b.trim()).filter((b) => b.length > 20);
        const parsedQuestions = [];
        for (const block of blocks) {
            try {
                const enunciadoMatch = block.match(/\[ENUNCIADO\]([\s\S]*?)\[PONTOS\]/i);
                const pontosMatch = block.match(/\[PONTOS\]([\s\S]*?)\[MODO\]/i);
                const modoMatch = block.match(/\[MODO\]([\s\S]*?)\[OPCOES\]/i);
                const opcoesMatch = block.match(/\[OPCOES\]([\s\S]*)$/i);
                if (!enunciadoMatch || !opcoesMatch)
                    continue;
                const statement = enunciadoMatch[1].trim();
                const ptStr = pontosMatch ? pontosMatch[1].trim() : '1';
                const modoStr = modoMatch ? modoMatch[1].trim() : 'ANY_CORRECT';
                const pointValue = parseFloat(ptStr) || 1;
                const scoringMode = modoStr.includes('ALL') ? 'ALL_REQUIRED' : 'ANY_CORRECT';
                const lines = opcoesMatch[1].trim().split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
                const options = [];
                for (const line of lines) {
                    if (line.toUpperCase().startsWith('(V)')) {
                        options.push({ text: line.substring(3).trim(), isCorrect: true });
                    }
                    else if (line.toUpperCase().startsWith('(F)')) {
                        options.push({ text: line.substring(3).trim(), isCorrect: false });
                    }
                    else if (line.length > 2 && options.length > 0) {
                        options[options.length - 1].text += ' ' + line;
                    }
                }
                if (statement && options.length >= 2) {
                    parsedQuestions.push({ statement, pointValue, scoringMode, options });
                }
            }
            catch (err) {
                this.logger.warn(`Failed to parse a question block: ${err}`);
            }
        }
        if (parsedQuestions.length === 0) {
            throw new Error('Não foi possível extrair nenhuma questão com a formatação solicitada.');
        }
        return parsedQuestions;
    }
    async generateQuestionsByTopic(topic, count = 5, userApiKey) {
        const apiKey = userApiKey || process.env.GEMINI_API_KEY;
        if (!apiKey)
            throw new common_1.BadRequestException('Nenhuma chave de API do Gemini configurada ou fornecida.');
        const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        const modelObj = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: { temperature: 0.7 }
        }, { apiVersion: 'v1beta' });
        const prompt = `Você é um professor especializado em criar atividades acadêmicas.
Sua tarefa é criar exatos ${count} tópicos de desenvolvimento (questões discursivas abertas) sobre o seguinte tópico: "${topic}".
Para CADA exercício, você DEVE propor um ponto para o aluno pesquisar, escrever ou desenvolver, não utilize múltipla escolha. 
GERE O TEXTO PURAMENTE ESTRUTURADO COM O DELIMITADOR "@@@".

Formatação EXIGIDA para CADA questão:
@@@
[ENUNCIADO]
Texto claro da pergunta discursiva.
[TIPO]
TEXT
@@@

Regras estritas:
- Comece CADA questão com "@@@".
- Retorne EXATAMENTE ${count} questões relevantes ao tópico.`;
        this.logger.log(`Generating ${count} questions for topic: ${topic}`);
        let raw = '';
        try {
            const result = await modelObj.generateContent(prompt);
            raw = result.response.text().trim();
        }
        catch (err) {
            throw new common_1.BadRequestException('Falha ao comunicar com a inteligência artificial: ' + (err?.message || err));
        }
        const blocks = raw.split('@@@').map((b) => b.trim()).filter((b) => b.length > 20);
        const generated = [];
        for (const block of blocks) {
            const enunciadoMatch = block.match(/\[ENUNCIADO\]([\s\S]*?)\[TIPO\]/i);
            const tipoMatch = block.match(/\[TIPO\]([\s\S]*?)(?:\[OPCOES\]|$)/i);
            const opcoesMatch = block.match(/\[OPCOES\]([\s\S]*)$/i);
            if (!enunciadoMatch)
                continue;
            const statement = enunciadoMatch[1].trim();
            const typeStr = tipoMatch ? tipoMatch[1].trim() : 'TEXT';
            const type = typeStr.includes('MULTIPLE_CHOICE') ? 'MULTIPLE_CHOICE' : 'TEXT';
            let options = [];
            if (type === 'MULTIPLE_CHOICE' && opcoesMatch) {
                const lines = opcoesMatch[1].trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
                for (const line of lines) {
                    if (line.toUpperCase().startsWith('(V)')) {
                        options.push(line.substring(3).trim());
                    }
                    else if (line.toUpperCase().startsWith('(F)')) {
                        options.push(line.substring(3).trim());
                    }
                }
            }
            if (statement) {
                generated.push({ statement, type, options: options.length > 0 ? options : ['', ''] });
            }
        }
        if (generated.length === 0) {
            throw new common_1.BadRequestException('A IA não retornou respostas em um formato válido.');
        }
        return generated;
    }
};
exports.AiService = AiService;
exports.AiService = AiService = AiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], AiService);
//# sourceMappingURL=ai.service.js.map