import { Injectable, BadRequestException, Logger } from '@nestjs/common';

const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.0-flash-lite',
];

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  // ─── Direct REST call (no SDK — avoids version issues) ───────────────────────
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

    this.logger.log(`POST ${url.replace(apiKey, '***')}`);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      const detail = errBody.substring(0, 300);
      this.logger.warn(`${model} HTTP ${res.status}: ${detail}`);
      throw new Error(`HTTP ${res.status} — ${detail}`);
    }

    const data = await res.json();
    const text: string =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') ||
      '';

    if (!text) throw new Error('Resposta vazia do modelo.');
    return text;
  }

  // ─── PDF → Questions ──────────────────────────────────────────────────────────
  async parsePdfToQuestions(pdfBuffer: Buffer, userApiKey?: string, customPrompt?: string): Promise<any[]> {
    const apiKey = (userApiKey?.trim()) || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new BadRequestException('Nenhuma chave de API do Gemini configurada ou fornecida.');

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

    const pdfPart = {
      inline_data: { mime_type: 'application/pdf', data: pdfBuffer.toString('base64') },
    };

    this.logger.log(`PDF size: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);

    const errors: string[] = [];

    for (const model of GEMINI_MODELS) {
      try {
        this.logger.log(`Trying model: ${model}`);
        const raw = await this.callGeminiRest(apiKey, model, [pdfPart, { text: prompt }]);
        this.logger.log(`Success with ${model} (${raw.length} chars)`);
        return this.parseQuestionsFromText(raw);
      } catch (err: any) {
        const msg = err?.message || String(err);
        errors.push(`[${model}]: ${msg.substring(0, 200)}`);
        this.logger.warn(`${model} failed: ${msg.substring(0, 150)}`);

        // Stop only on auth errors
        if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid') || msg.includes('HTTP 400') || msg.includes('HTTP 401')) {
          break;
        }
      }
    }

    this.logger.error(`All models failed:\n${errors.join('\n')}`);
    throw new BadRequestException(
      `Não foi possível processar o PDF. Detalhes:\n${errors[0] || 'Erro desconhecido'}`,
    );
  }

  // ─── Topic → Questions ────────────────────────────────────────────────────────
  async generateQuestionsByTopic(topic: string, count: number = 5, userApiKey?: string): Promise<any[]> {
    const apiKey = (userApiKey?.trim()) || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new BadRequestException('Nenhuma chave de API do Gemini configurada ou fornecida.');

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
    for (const model of GEMINI_MODELS) {
      try {
        raw = await this.callGeminiRest(apiKey, model, [{ text: prompt }], { temperature: 0.7 });
        this.logger.log(`Success with ${model}`);
        break;
      } catch (err: any) {
        this.logger.warn(`${model} failed: ${err?.message?.substring(0, 100)}`);
      }
    }

    if (!raw) throw new BadRequestException('Falha ao comunicar com a inteligência artificial.');

    const blocks = raw.split('@@@').map((b: string) => b.trim()).filter((b: string) => b.length > 20);
    const generated: any[] = [];

    for (const block of blocks) {
      const enunciadoMatch = block.match(/\[ENUNCIADO\]([\s\S]*?)\[TIPO\]/i);
      if (!enunciadoMatch) continue;
      const statement = enunciadoMatch[1].trim();
      if (statement) {
        generated.push({ statement, type: 'TEXT', options: ['', ''] });
      }
    }

    if (generated.length === 0) throw new BadRequestException('A IA não retornou respostas em um formato válido.');
    return generated;
  }

  // ─── Parser ───────────────────────────────────────────────────────────────────
  private parseQuestionsFromText(raw: string): any[] {
    const blocks = raw.split('@@@').map((b: string) => b.trim()).filter((b: string) => b.length > 20);
    const parsedQuestions: any[] = [];

    for (const block of blocks) {
      try {
        const enunciadoMatch = block.match(/\[ENUNCIADO\]([\s\S]*?)\[PONTOS\]/i);
        const pontosMatch = block.match(/\[PONTOS\]([\s\S]*?)\[MODO\]/i);
        const modoMatch = block.match(/\[MODO\]([\s\S]*?)\[OPCOES\]/i);
        const opcoesMatch = block.match(/\[OPCOES\]([\s\S]*)$/i);

        if (!enunciadoMatch || !opcoesMatch) continue;

        const statement = enunciadoMatch[1].trim();
        const ptStr = pontosMatch ? pontosMatch[1].trim() : '1';
        const modoStr = modoMatch ? modoMatch[1].trim() : 'ANY_CORRECT';
        const pointValue = parseFloat(ptStr) || 1;
        const scoringMode = modoStr.includes('ALL') ? 'ALL_REQUIRED' : 'ANY_CORRECT';

        const lines = opcoesMatch[1].trim().split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
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
        this.logger.warn(`Failed to parse block: ${err}`);
      }
    }

    if (parsedQuestions.length === 0) {
      throw new Error('Não foi possível extrair nenhuma questão. Verifique se o PDF contém questões de múltipla escolha.');
    }

    return parsedQuestions;
  }
}
