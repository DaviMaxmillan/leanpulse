import { Injectable, BadRequestException, Logger } from '@nestjs/common';

const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-2.0-flash-lite',
  'gemini-1.5-pro',
];

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  // ─── Direct REST call (no SDK) ────────────────────────────────────────────────
  private async callGeminiRest(
    apiKey: string,
    model: string,
    parts: any[],
    generationConfig?: any,
  ): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const body = {
      contents: [{ parts }],
      generationConfig: generationConfig || { maxOutputTokens: 8192, temperature: 0.1 },
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
  private async tryModels(apiKey: string, parts: any[], config?: any): Promise<string> {
    const errors: string[] = [];

    for (const model of GEMINI_MODELS) {
      try {
        this.logger.log(`Trying ${model}...`);
        const text = await this.callGeminiRest(apiKey, model, parts, config);
        this.logger.log(`Success with ${model} (${text.length} chars)`);
        return text;
      } catch (err: any) {
        const msg = err?.message || String(err);
        errors.push(`[${model}]: ${msg.substring(0, 200)}`);
        this.logger.warn(`${model} failed: ${msg.substring(0, 100)}`);

        // Stop on auth errors; continue on anything else
        const isAuthError = msg.includes('HTTP 401') || msg.includes('HTTP 403') ||
          msg.includes('API_KEY_INVALID') || msg.includes('API key not valid');
        if (isAuthError) break;
      }
    }

    this.logger.error(`All models failed:\n${errors.join('\n')}`);

    const allQuota = errors.length > 0 && errors.every(e => e.includes('429'));
    if (allQuota) {
      throw new BadRequestException(
        'Cota da API Gemini esgotada (erro 429). A cota é por projeto Google, não por chave.\n' +
        'Acesse https://console.cloud.google.com/billing para habilitar o faturamento e aumentar o limite.',
      );
    }

    throw new BadRequestException(
      `Não foi possível processar o PDF. Detalhes:\n${errors.join('\n') || 'Erro desconhecido'}`,
    );
  }

  // ─── PDF → Questions ──────────────────────────────────────────────────────────
  async parsePdfToQuestions(pdfBuffer: Buffer, userApiKey?: string, customPrompt?: string): Promise<any[]> {
    const apiKey = userApiKey?.trim() || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new BadRequestException('Nenhuma chave da API Gemini configurada.');

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

    const prompt = customPrompt
      ? `${basePrompt}\n\nINSTRUÇÕES ADICIONAIS DO PROFESSOR:\n${customPrompt}`
      : basePrompt;

    this.logger.log(`PDF size: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);

    const parts = [
      { inline_data: { mime_type: 'application/pdf', data: pdfBuffer.toString('base64') } },
      { text: prompt },
    ];

    const raw = await this.tryModels(apiKey, parts);
    return this.parseQuestionsFromText(raw);
  }

  // ─── Topic → Questions ────────────────────────────────────────────────────────
  async generateQuestionsByTopic(topic: string, count: number = 5, userApiKey?: string): Promise<any[]> {
    const apiKey = userApiKey?.trim() || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new BadRequestException('Nenhuma chave da API Gemini configurada.');

    const prompt = `Você é um professor especializado em criar atividades acadêmicas.
Crie exatos ${count} questões discursivas abertas sobre: "${topic}".
NÃO use múltipla escolha. Cada questão deve propor um ponto para o aluno pesquisar ou desenvolver.
GERE TEXTO PURAMENTE ESTRUTURADO COM O DELIMITADOR "@@@".

Formatação OBRIGATÓRIA:
@@@
[ENUNCIADO]
Texto claro da pergunta discursiva.
[TIPO]
TEXT
@@@

Retorne EXATAMENTE ${count} questões.`;

    this.logger.log(`Generating ${count} questions for topic: ${topic}`);

    const raw = await this.tryModels(apiKey, [{ text: prompt }], { temperature: 0.7 });

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
          if (line.toUpperCase().startsWith('(V)')) {
            options.push({ text: line.substring(3).trim(), isCorrect: true });
          } else if (line.toUpperCase().startsWith('(F)')) {
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
      throw new BadRequestException('Nenhuma questão foi extraída. Verifique se o PDF contém questões de múltipla escolha.');
    }

    return parsedQuestions;
  }
}
