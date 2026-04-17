import { Injectable, BadRequestException, Logger } from '@nestjs/common';

// Fallback list if ListModels fails
const GEMINI_MODELS_FALLBACK = [
  'gemini-2.5-flash-preview-04-17',
  'gemini-2.5-pro-preview-03-25',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-1.5-flash-8b',
];

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  // ─── Discover models available for this API key ─────────────────────────────
  private async listAvailableModels(apiKey: string): Promise<string[]> {
    try {
      const res = await fetch(`${GEMINI_BASE}/models?key=${apiKey}`);
      if (!res.ok) {
        this.logger.warn(`ListModels failed HTTP ${res.status}, using fallback list`);
        return GEMINI_MODELS_FALLBACK;
      }
      const data = await res.json();
      const models: string[] = (data.models ?? [])
        .filter((m: any) =>
          Array.isArray(m.supportedGenerationMethods) &&
          m.supportedGenerationMethods.includes('generateContent'),
        )
        .map((m: any) => (m.name as string).replace('models/', ''));

      if (models.length === 0) return GEMINI_MODELS_FALLBACK;
      this.logger.log(`Available models for this key (${models.length}): ${models.slice(0, 5).join(', ')}...`);
      return models;
    } catch (err: any) {
      this.logger.warn(`ListModels error: ${err?.message}`);
      return GEMINI_MODELS_FALLBACK;
    }
  }

  // ─── Core REST call with camelCase fields (required by Gemini REST API) ──────
  private async callGemini(
    apiKey: string,
    model: string,
    parts: any[],
    temperature = 0.1,
  ): Promise<string> {
    const url = `${GEMINI_BASE}/models/${model}:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { maxOutputTokens: 8192, temperature },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} - ${errText.substring(0, 300)}`);
    }

    const data = await res.json();
    const text: string =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text ?? '')
        .join('') ?? '';

    if (!text) throw new Error('Resposta vazia do modelo.');
    return text;
  }

  // ─── Try available models in order ─────────────────────────────────────────
  private async tryModels(
    apiKey: string,
    parts: any[],
    temperature = 0.1,
  ): Promise<string> {
    const models = await this.listAvailableModels(apiKey);
    this.logger.log(`Will try ${models.length} models: ${models.slice(0,4).join(', ')}...`);
    const errors: string[] = [];

    for (const model of models) {
      try {
        this.logger.log(`Trying ${model}...`);
        const text = await this.callGemini(apiKey, model, parts, temperature);
        this.logger.log(`✓ Success with ${model} (${text.length} chars)`);
        return text;
      } catch (err: any) {
        const msg: string = err?.message ?? String(err);
        errors.push(`[${model}]: ${msg.substring(0, 250)}`);
        this.logger.warn(`✗ ${model} failed: ${msg.substring(0, 120)}`);

        // Stop only on auth errors
        const isAuth = msg.includes('HTTP 401') || msg.includes('HTTP 403') ||
          msg.includes('API_KEY_INVALID') || msg.includes('API key not valid');
        if (isAuth) break;
      }
    }

    this.logger.error(`All models failed:\n${errors.join('\n')}`);

    if (errors.every(e => e.includes('429'))) {
      throw new BadRequestException(
        'Cota da API Gemini esgotada (429). A cota é por projeto Google.\n' +
        'Solução: acesse console.cloud.google.com → Billing e habilite o faturamento ' +
        '(não gera cobrança dentro do free tier, mas desbloqueia os limites).',
      );
    }

    throw new BadRequestException(
      `Não foi possível processar o PDF:\n${errors.join('\n')}`,
    );
  }

  // ─── PDF → Questions ──────────────────────────────────────────────────────────
  async parsePdfToQuestions(
    pdfBuffer: Buffer,
    userApiKey?: string,
    customPrompt?: string,
  ): Promise<any[]> {
    const apiKey = userApiKey?.trim() || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new BadRequestException(
        'Nenhuma chave da API Gemini configurada. Acesse as Configurações de IA no painel.',
      );
    }

    const keyHint = apiKey.length > 8
      ? `${apiKey.substring(0, 8)}...${apiKey.slice(-4)}`
      : '(curta)';
    const keySource = userApiKey?.trim() ? 'DB (professor)' : 'ENV';
    this.logger.log(`API key from ${keySource}: ${keyHint}`);
    this.logger.log(`PDF size: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);

    const basePrompt = `Você é um extrator de questões de provas. Extraia TODAS as questões de múltipla escolha do documento.
NÃO GERE JSON. Use EXCLUSIVAMENTE o delimitador "@@@".

Formatação OBRIGATÓRIA para CADA questão:
@@@
[ENUNCIADO]
Texto completo da pergunta, exatamente como no original.
[PONTOS]
1
[MODO]
ANY_CORRECT
[OPCOES]
(F) Alternativa errada
(V) Alternativa certa
(F) Outra errada
@@@

Regras:
- Use "@@@" para SEPARAR cada questão.
- [MODO]: "ANY_CORRECT" (1 certa) ou "ALL_REQUIRED" (múltiplas certas).
- [OPCOES]: "(V) " para certa, "(F) " para errada.
- Se não souber o gabarito, marque a primeira opção como "(V)" e adicione "(verificar)".
- Extraia TODAS as questões até o fim do documento.`;

    const prompt = customPrompt
      ? `${basePrompt}\n\nINSTRUÇÕES ADICIONAIS:\n${customPrompt}`
      : basePrompt;

    // ⚠️ IMPORTANT: camelCase is required by Gemini REST API
    //   inlineData / mimeType / data  (NOT inline_data / mime_type)
    const parts = [
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: pdfBuffer.toString('base64'),
        },
      },
      { text: prompt },
    ];

    const raw = await this.tryModels(apiKey, parts, 0.1);
    return this.parseQuestionsFromText(raw);
  }

  // ─── Topic → Questions ────────────────────────────────────────────────────────
  async generateQuestionsByTopic(
    topic: string,
    count = 5,
    userApiKey?: string,
  ): Promise<any[]> {
    const apiKey = userApiKey?.trim() || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new BadRequestException('Nenhuma chave da API Gemini configurada.');

    const prompt =
      `Crie exatos ${count} questões discursivas abertas sobre: "${topic}".
NÃO use múltipla escolha. Cada questão deve propor algo para o aluno pesquisar ou desenvolver.
Use o delimitador "@@@".

@@@
[ENUNCIADO]
Texto claro da pergunta discursiva.
[TIPO]
TEXT
@@@

Retorne EXATAMENTE ${count} questões.`;

    const parts = [{ text: prompt }];
    const raw = await this.tryModels(apiKey, parts, 0.7);

    const blocks = raw.split('@@@').map(b => b.trim()).filter(b => b.length > 20);
    const generated = blocks
      .map(block => {
        const m = block.match(/\[ENUNCIADO\]([\s\S]*?)(?:\[TIPO\]|$)/i);
        return m?.[1]?.trim()
          ? { statement: m[1].trim(), type: 'TEXT', options: ['', ''] }
          : null;
      })
      .filter(Boolean);

    if (generated.length === 0) {
      throw new BadRequestException('A IA não retornou respostas em formato válido.');
    }
    return generated;
  }

  // ─── Parser ───────────────────────────────────────────────────────────────────
  private parseQuestionsFromText(raw: string): any[] {
    const blocks = raw.split('@@@').map(b => b.trim()).filter(b => b.length > 20);
    const questions: any[] = [];

    for (const block of blocks) {
      try {
        const enunciadoMatch = block.match(/\[ENUNCIADO\]([\s\S]*?)\[PONTOS\]/i);
        const pontosMatch    = block.match(/\[PONTOS\]([\s\S]*?)\[MODO\]/i);
        const modoMatch      = block.match(/\[MODO\]([\s\S]*?)\[OPCOES\]/i);
        const opcoesMatch    = block.match(/\[OPCOES\]([\s\S]*)$/i);

        if (!enunciadoMatch || !opcoesMatch) continue;

        const statement   = enunciadoMatch[1].trim();
        const pointValue  = parseFloat(pontosMatch?.[1]?.trim() ?? '1') || 1;
        const scoringMode = (modoMatch?.[1]?.trim() ?? '').includes('ALL')
          ? 'ALL_REQUIRED'
          : 'ANY_CORRECT';

        const lines = opcoesMatch[1].trim()
          .split('\n')
          .map(l => l.trim())
          .filter(l => l.length > 0);

        const options: any[] = [];
        for (const line of lines) {
          const up = line.toUpperCase();
          if (up.startsWith('(V)')) {
            options.push({ text: line.substring(3).trim(), isCorrect: true });
          } else if (up.startsWith('(F)')) {
            options.push({ text: line.substring(3).trim(), isCorrect: false });
          } else if (line.length > 2 && options.length > 0) {
            options[options.length - 1].text += ' ' + line;
          }
        }

        if (statement && options.length >= 2) {
          questions.push({ statement, pointValue, scoringMode, options });
        }
      } catch {
        // skip malformed block
      }
    }

    if (questions.length === 0) {
      throw new BadRequestException(
        'Nenhuma questão foi extraída. Verifique se o PDF contém questões de múltipla escolha com texto legível.',
      );
    }

    return questions;
  }
}
