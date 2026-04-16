import { Injectable, BadRequestException, Logger } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string; numpages: number }>;


const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-2.0-flash-lite',
  'gemini-1.5-pro',
];

const QUESTION_FORMAT = `
Formatação OBRIGATÓRIA para CADA questão:
@@@
[ENUNCIADO]
Texto completo da pergunta, sem cortes.
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
- Separe CADA questão com "@@@" no início.
- [ENUNCIADO]: transcreva a pergunta completa.
- [PONTOS]: geralmente 1.
- [MODO]: "ANY_CORRECT" (1 certa) ou "ALL_REQUIRED" (múltiplas certas).
- [OPCOES]: prefixe certa com "(V) " e erradas com "(F) ".
- Se não identificar o gabarito, marque a alternativa A como (V).
- Extraia TODAS as questões até o fim.`;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  // ─── REST direct call to Gemini ───────────────────────────────────────────────
  private async callGeminiRest(
    apiKey: string,
    model: string,
    textPrompt: string,
  ): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const body = {
      contents: [{ parts: [{ text: textPrompt }] }],
      generationConfig: { maxOutputTokens: 8192, temperature: 0.1 },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      this.logger.warn(`${model} HTTP ${res.status}: ${errBody.substring(0, 300)}`);
      throw new Error(`HTTP ${res.status} - ${errBody.substring(0, 200)}`);
    }

    const data = await res.json();
    const text: string =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';

    if (!text) throw new Error('Resposta vazia do modelo.');
    return text;
  }

  // ─── Try all models in order ─────────────────────────────────────────────────
  private async tryModels(apiKey: string, prompt: string): Promise<string> {
    const errors: string[] = [];

    for (const model of GEMINI_MODELS) {
      try {
        this.logger.log(`Trying ${model}...`);
        const text = await this.callGeminiRest(apiKey, model, prompt);
        this.logger.log(`Success with ${model} (${text.length} chars)`);
        return text;
      } catch (err: any) {
        const msg = err?.message || String(err);
        errors.push(`[${model}]: ${msg.substring(0, 150)}`);
        this.logger.warn(`${model} failed: ${msg.substring(0, 100)}`);

        // Stop on auth errors; continue on quota/not-found
        const isAuthError = msg.includes('HTTP 401') || msg.includes('HTTP 403') ||
          msg.includes('API_KEY_INVALID') || msg.includes('API key not valid');
        if (isAuthError) break;
      }
    }

    const allQuota = errors.length > 0 && errors.every(e => e.includes('429'));
    if (allQuota) {
      throw new BadRequestException(
        'Cota da API Gemini esgotada (erro 429).\n\n' +
        '➡ Soluções:\n' +
        '1. Ative o faturamento gratuito no projeto em: https://console.cloud.google.com/billing\n' +
        '2. Ou crie uma chave em um projeto DIFERENTE do Google Cloud (não no mesmo projeto).\n' +
        '   O limite é por projeto, não por chave.',
      );
    }

    throw new BadRequestException(
      `Não foi possível processar o PDF. Erros:\n${errors.join('\n') || 'Erro desconhecido'}`,
    );
  }

  // ─── PDF → Questions ──────────────────────────────────────────────────────────
  async parsePdfToQuestions(pdfBuffer: Buffer, userApiKey?: string, customPrompt?: string): Promise<any[]> {
    const apiKey = userApiKey?.trim() || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new BadRequestException('Nenhuma chave da API Gemini configurada. Configure GEMINI_API_KEY no servidor.');

    // Extract text from PDF (sends TEXT tokens, not binary — ~95% fewer tokens)
    let pdfText = '';
    try {
      const parsed = await pdfParse(pdfBuffer);
      pdfText = parsed.text?.trim() || '';
      this.logger.log(`PDF text extracted: ${pdfText.length} chars, ${parsed.numpages} pages`);
    } catch (err: any) {
      this.logger.warn(`PDF text extraction failed: ${err?.message} — will attempt inline`);
    }

    if (!pdfText || pdfText.length < 50) {
      throw new BadRequestException(
        'Não foi possível extrair texto do PDF. Certifique-se de que o PDF contém texto legível (não é uma imagem escaneada).',
      );
    }

    // Truncate if too long (keep within ~100K chars = ~25K tokens to be safe)
    const maxChars = 90_000;
    if (pdfText.length > maxChars) {
      this.logger.warn(`PDF text truncated from ${pdfText.length} to ${maxChars} chars`);
      pdfText = pdfText.substring(0, maxChars);
    }

    const basePrompt = `Você é um extrator de questões de provas. Extraia ABSOLUTAMENTE TODAS as questões de múltipla escolha do texto abaixo.
NÃO GERE JSON. Use EXCLUSIVAMENTE o formato delimitado por "@@@".
${QUESTION_FORMAT}

Extraia TODAS as questões encontradas neste texto de prova:
--- INÍCIO DO TEXTO ---
${pdfText}
--- FIM DO TEXTO ---`;

    const prompt = customPrompt
      ? `${basePrompt}\n\nINSTRUÇÕES ADICIONAIS DO PROFESSOR:\n${customPrompt}`
      : basePrompt;

    const raw = await this.tryModels(apiKey, prompt);
    return this.parseQuestionsFromText(raw);
  }

  // ─── Topic → Questions ────────────────────────────────────────────────────────
  async generateQuestionsByTopic(topic: string, count: number = 5, userApiKey?: string): Promise<any[]> {
    const apiKey = userApiKey?.trim() || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new BadRequestException('Nenhuma chave da API Gemini configurada.');

    const prompt = `Você é um professor especializado em criar atividades acadêmicas.
Crie exatos ${count} questões discursivas abertas sobre: "${topic}".
NÃO use múltipla escolha. Cada questão deve propor um ponto para o aluno pesquisar ou desenvolver.

Formatação OBRIGATÓRIA:
@@@
[ENUNCIADO]
Texto claro da pergunta discursiva.
[TIPO]
TEXT
@@@

Retorne EXATAMENTE ${count} questões.`;

    const raw = await this.tryModels(apiKey, prompt);

    const blocks = raw.split('@@@').map(b => b.trim()).filter(b => b.length > 20);
    const generated: any[] = [];

    for (const block of blocks) {
      const match = block.match(/\[ENUNCIADO\]([\s\S]*?)(?:\[TIPO\]|$)/i);
      if (match && match[1].trim()) {
        generated.push({ statement: match[1].trim(), type: 'TEXT', options: ['', ''] });
      }
    }

    if (generated.length === 0) throw new BadRequestException('A IA não retornou respostas em formato válido.');
    return generated;
  }

  // ─── Text parser ─────────────────────────────────────────────────────────────
  private parseQuestionsFromText(raw: string): any[] {
    const blocks = raw.split('@@@').map(b => b.trim()).filter(b => b.length > 20);
    const parsedQuestions: any[] = [];

    for (const block of blocks) {
      try {
        const enunciadoMatch = block.match(/\[ENUNCIADO\]([\s\S]*?)\[PONTOS\]/i);
        const pontosMatch    = block.match(/\[PONTOS\]([\s\S]*?)\[MODO\]/i);
        const modoMatch      = block.match(/\[MODO\]([\s\S]*?)\[OPCOES\]/i);
        const opcoesMatch    = block.match(/\[OPCOES\]([\s\S]*)$/i);

        if (!enunciadoMatch || !opcoesMatch) continue;

        const statement   = enunciadoMatch[1].trim();
        const pointValue  = parseFloat(pontosMatch?.[1]?.trim() || '1') || 1;
        const scoringMode = (modoMatch?.[1]?.trim() || '').includes('ALL') ? 'ALL_REQUIRED' : 'ANY_CORRECT';

        const lines = opcoesMatch[1].trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const options: any[] = [];

        for (const line of lines) {
          const upper = line.toUpperCase();
          if (upper.startsWith('(V)')) {
            options.push({ text: line.substring(3).trim(), isCorrect: true });
          } else if (upper.startsWith('(F)')) {
            options.push({ text: line.substring(3).trim(), isCorrect: false });
          } else if (line.length > 2 && options.length > 0) {
            options[options.length - 1].text += ' ' + line;
          }
        }

        if (statement && options.length >= 2) {
          parsedQuestions.push({ statement, pointValue, scoringMode, options });
        }
      } catch (err) {
        this.logger.warn(`Block parse error: ${err}`);
      }
    }

    if (parsedQuestions.length === 0) {
      throw new BadRequestException(
        'Nenhuma questão foi extraída. Verifique se o PDF contém questões de múltipla escolha com formato legível (não imagem escaneada).',
      );
    }

    return parsedQuestions;
  }
}
