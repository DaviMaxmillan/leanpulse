import { Injectable, BadRequestException, Logger } from '@nestjs/common';

// Models to try in order — text-capable first, multimodal for PDF
const GEMINI_MODELS_MULTIMODAL = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.0-flash-lite',
];

const GEMINI_MODELS_TEXT = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-2.0-flash-lite',
  'gemini-1.5-pro',
];

const GEMINI_BASE = 'https://generativelanguage.googleapis.com';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  // ─── Step 1: Upload PDF via Gemini File API ──────────────────────────────────
  private async uploadPdfToFileApi(apiKey: string, pdfBuffer: Buffer): Promise<string> {
    const numBytes = pdfBuffer.length;
    this.logger.log(`Uploading PDF (${(numBytes / 1024).toFixed(1)} KB) via File API...`);

    // Start resumable upload — get the upload URL
    const initRes = await fetch(`${GEMINI_BASE}/upload/v1beta/files?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': String(numBytes),
        'X-Goog-Upload-Header-Content-Type': 'application/pdf',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file: { display_name: 'exam.pdf' } }),
    });

    if (!initRes.ok) {
      const err = await initRes.text().catch(() => '');
      throw new Error(`File API init failed HTTP ${initRes.status}: ${err.substring(0, 200)}`);
    }

    const uploadUrl = initRes.headers.get('x-goog-upload-url');
    if (!uploadUrl) throw new Error('File API did not return an upload URL.');

    // Upload the actual bytes
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Length': String(numBytes),
        'X-Goog-Upload-Offset': '0',
        'X-Goog-Upload-Command': 'upload, finalize',
      },
      body: pdfBuffer,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text().catch(() => '');
      throw new Error(`File API upload failed HTTP ${uploadRes.status}: ${err.substring(0, 200)}`);
    }

    const fileData = await uploadRes.json();
    const fileUri = fileData?.file?.uri;
    if (!fileUri) throw new Error('File API upload succeeded but returned no URI.');

    this.logger.log(`File uploaded: ${fileUri}`);
    return fileUri;
  }

  // ─── Step 2: Generate content using uploaded file URI ────────────────────────
  private async callGeminiWithFileUri(
    apiKey: string,
    model: string,
    fileUri: string,
    prompt: string,
  ): Promise<string> {
    const url = `${GEMINI_BASE}/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const body = {
      contents: [{
        parts: [
          { file_data: { mime_type: 'application/pdf', file_uri: fileUri } },
          { text: prompt },
        ],
      }],
      generationConfig: { maxOutputTokens: 8192, temperature: 0.1 },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      this.logger.warn(`${model} HTTP ${res.status}: ${errBody.substring(0, 200)}`);
      throw new Error(`HTTP ${res.status} - ${errBody.substring(0, 200)}`);
    }

    const data = await res.json();
    const text: string =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';

    if (!text) throw new Error('Resposta vazia do modelo.');
    return text;
  }

  // ─── Generic text call ───────────────────────────────────────────────────────
  private async callGeminiText(apiKey: string, model: string, prompt: string, temp = 0.1): Promise<string> {
    const url = `${GEMINI_BASE}/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 8192, temperature: temp },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} - ${errBody.substring(0, 200)}`);
    }

    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
  }

  // ─── Try all models in order ─────────────────────────────────────────────────
  private isAuthError(msg: string): boolean {
    return msg.includes('HTTP 401') || msg.includes('HTTP 403') ||
      msg.includes('API_KEY_INVALID') || msg.includes('API key not valid');
  }

  // ─── PDF → Questions (File API approach) ─────────────────────────────────────
  async parsePdfToQuestions(pdfBuffer: Buffer, userApiKey?: string, customPrompt?: string): Promise<any[]> {
    const apiKey = userApiKey?.trim() || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new BadRequestException('Nenhuma chave da API Gemini configurada. Configure em Configurações de IA.');

    // Diagnostic log — shows which key is being used (never logs the full key)
    const keyHint = apiKey.length > 8 ? `${apiKey.substring(0, 8)}...${apiKey.slice(-4)}` : '(curta)';
    const keySource = userApiKey?.trim() ? 'DB (professor)' : 'ENV (GEMINI_API_KEY)';
    this.logger.log(`Using API key from ${keySource}: ${keyHint}`);


    const basePrompt = `Você é um robô extrator de dados de provas. Sua ÚNICA tarefa é extrair ABSOLUTAMENTE TODAS as questões de múltipla escolha do documento.
NÃO GERE JSON! GERE TEXTO PURAMENTE ESTRUTURADO COM O DELIMITADOR "@@@".

Formatação EXIGIDA para CADA questão:
@@@
[ENUNCIADO]
Texto do enunciado transcrito EXATAMENTE como no original, sem cortes.
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
- Se não identificar o gabarito, marque a letra A como (V) e coloque "(verificar)".
- Extraia TODAS as questões até o fim da última página.`;

    const prompt = customPrompt ? `${basePrompt}\n\nINSTRUÇÕES ADICIONAIS:\n${customPrompt}` : basePrompt;

    // Step 1: Upload PDF via File API
    let fileUri: string;
    try {
      fileUri = await this.uploadPdfToFileApi(apiKey, pdfBuffer);
    } catch (uploadErr: any) {
      const msg = uploadErr?.message || String(uploadErr);
      this.logger.error(`File API upload failed: ${msg}`);
      throw new BadRequestException(
        `Falha ao enviar o PDF para a API Gemini.\n${msg}\n\nVerifique se sua chave API está ativa em aistudio.google.com`,
      );
    }

    // Step 2: Try models with the uploaded file
    const errors: string[] = [];
    for (const model of GEMINI_MODELS_MULTIMODAL) {
      try {
        this.logger.log(`Trying ${model} with File API...`);
        const raw = await this.callGeminiWithFileUri(apiKey, model, fileUri, prompt);
        this.logger.log(`Success with ${model} (${raw.length} chars)`);
        return this.parseQuestionsFromText(raw);
      } catch (err: any) {
        const msg = err?.message || String(err);
        errors.push(`[${model}]: ${msg.substring(0, 200)}`);
        this.logger.warn(`${model} failed: ${msg.substring(0, 100)}`);
        if (this.isAuthError(msg)) break;
      }
    }

    this.logger.error(`All models failed:\n${errors.join('\n')}`);

    const allQuota = errors.length > 0 && errors.every(e => e.includes('429'));
    if (allQuota) {
      throw new BadRequestException(
        'Cota da API Gemini esgotada (429).\n' +
        'A cota é por projeto Google, não por chave.\n' +
        'Solução: acesse console.cloud.google.com → Billing e habilite o faturamento ' +
        '(você não será cobrado pelo uso dentro do free tier).',
      );
    }

    throw new BadRequestException(
      `Não foi possível processar o PDF:\n${errors.join('\n') || 'Erro desconhecido'}`,
    );
  }

  // ─── Topic → Questions ────────────────────────────────────────────────────────
  async generateQuestionsByTopic(topic: string, count: number = 5, userApiKey?: string): Promise<any[]> {
    const apiKey = userApiKey?.trim() || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new BadRequestException('Nenhuma chave da API Gemini configurada.');

    const prompt = `Você é um professor especializado em criar atividades acadêmicas.
Crie exatos ${count} questões discursivas abertas sobre: "${topic}".
NÃO use múltipla escolha. Cada questão deve propor algo para o aluno pesquisar ou desenvolver.
GERE TEXTO ESTRUTURADO COM O DELIMITADOR "@@@".

@@@
[ENUNCIADO]
Texto claro da pergunta discursiva.
[TIPO]
TEXT
@@@

Retorne EXATAMENTE ${count} questões.`;

    const errors: string[] = [];
    for (const model of GEMINI_MODELS_TEXT) {
      try {
        const raw = await this.callGeminiText(apiKey, model, prompt, 0.7);
        if (!raw) continue;
        const blocks = raw.split('@@@').map(b => b.trim()).filter(b => b.length > 20);
        const generated = blocks
          .map(block => {
            const match = block.match(/\[ENUNCIADO\]([\s\S]*?)(?:\[TIPO\]|$)/i);
            return match?.[1]?.trim() ? { statement: match[1].trim(), type: 'TEXT', options: ['', ''] } : null;
          })
          .filter(Boolean);
        if (generated.length > 0) return generated;
      } catch (err: any) {
        const msg = err?.message || String(err);
        errors.push(`[${model}]: ${msg.substring(0, 100)}`);
        if (this.isAuthError(msg)) break;
      }
    }

    throw new BadRequestException(`Falha ao gerar questões: ${errors[0] || 'Erro desconhecido'}`);
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
      throw new BadRequestException('Nenhuma questão foi extraída. Verifique se o PDF contém questões de múltipla escolha com texto legível.');
    }

    return parsedQuestions;
  }
}
