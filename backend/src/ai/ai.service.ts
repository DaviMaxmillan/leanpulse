import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor() {}

  async parsePdfToQuestions(pdfBuffer: Buffer, userApiKey?: string, customPrompt?: string): Promise<any[]> {
    const apiKey = userApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new BadRequestException('Nenhuma chave de API do Gemini configurada ou fornecida.');
    const genAI = new GoogleGenerativeAI(apiKey);

    // Try combinations of model + API version
    const attempts = [
      { model: 'gemini-2.5-flash',       apiVersion: 'v1beta' },
      { model: 'gemini-2.0-flash',       apiVersion: 'v1beta' },
      { model: 'gemini-2.0-flash-lite',  apiVersion: 'v1beta' },
      { model: 'gemini-2.5-pro',         apiVersion: 'v1beta' },
    ];

    const errors: string[] = [];

    for (const attempt of attempts) {
      try {
        this.logger.log(`Trying ${attempt.model} (${attempt.apiVersion})...`);
        const model = genAI.getGenerativeModel(
          { 
            model: attempt.model,
            generationConfig: { 
              maxOutputTokens: 8192, 
              temperature: 0.1
            }
          },
          { apiVersion: attempt.apiVersion } as any,
        );
        const result = await this.callGemini(model, pdfBuffer, customPrompt);
        this.logger.log(`Success with ${attempt.model} (${attempt.apiVersion})`);
        return result;
      } catch (err: any) {
        const msg = err?.message || String(err);
        this.logger.warn(`${attempt.model}/${attempt.apiVersion} failed: ${msg.substring(0, 150)}`);
        errors.push(`[${attempt.model}/${attempt.apiVersion}]: ${msg.substring(0, 120)}`);
        // Only retry on model-availability errors
        const isRetryable = msg.includes('not found') || msg.includes('404') ||
                            msg.includes('429') || msg.includes('quota') ||
                            msg.includes('UNAVAILABLE') || msg.includes('503');
        if (!isRetryable) break; // Non-retryable error — stop immediately
      }
    }

    // All attempts failed — surface real errors
    const summary = errors.join('\n');
    this.logger.error(`All Gemini attempts failed:\n${summary}`);
    throw new BadRequestException(
      `Não foi possível processar o PDF. Detalhes:\n${errors[0] || 'Erro desconhecido'}`
    );
  }

  private async callGemini(model: any, pdfBuffer: Buffer, customPrompt?: string): Promise<any[]> {
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

    const blocks = raw.split('@@@').map((b: string) => b.trim()).filter((b: string) => b.length > 20);
    const parsedQuestions: any[] = [];

    for (const block of blocks) {
      try {
        const enunciadoMatch = block.match(/\[ENUNCIADO\]([\s\S]*?)\[PONTOS\]/i);
        const pontosMatch = block.match(/\[PONTOS\]([\s\S]*?)\[MODO\]/i);
        const modoMatch = block.match(/\[MODO\]([\s\S]*?)\[OPCOES\]/i);
        const opcoesMatch = block.match(/\[OPCOES\]([\s\S]*)$/i);

        if (!enunciadoMatch || !opcoesMatch) continue; // Skip incomplete blocks (e.g., if cut off at the end)

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
            // Se o texto teve quebra de linha nativa, junta na opção anterior
            options[options.length - 1].text += ' ' + line;
          }
        }

        if (statement && options.length >= 2) {
          parsedQuestions.push({ statement, pointValue, scoringMode, options });
        }
      } catch (err) {
        this.logger.warn(`Failed to parse a question block: ${err}`);
      }
    }

    if (parsedQuestions.length === 0) {
      throw new Error('Não foi possível extrair nenhuma questão com a formatação solicitada.');
    }

    return parsedQuestions;
  }

  async generateQuestionsByTopic(topic: string, count: number = 5, userApiKey?: string): Promise<any[]> {
    const apiKey = userApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new BadRequestException('Nenhuma chave de API do Gemini configurada ou fornecida.');
    const genAI = new GoogleGenerativeAI(apiKey);

    const modelObj = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: { temperature: 0.7 } 
    }, { apiVersion: 'v1beta' } as any);

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
    } catch (err: any) {
      throw new BadRequestException('Falha ao comunicar com a inteligência artificial: ' + (err?.message || err));
    }

    const blocks = raw.split('@@@').map((b: string) => b.trim()).filter((b: string) => b.length > 20);
    const generated: any[] = [];

    for (const block of blocks) {
      const enunciadoMatch = block.match(/\[ENUNCIADO\]([\s\S]*?)\[TIPO\]/i);
      const tipoMatch = block.match(/\[TIPO\]([\s\S]*?)(?:\[OPCOES\]|$)/i);
      const opcoesMatch = block.match(/\[OPCOES\]([\s\S]*)$/i);

      if (!enunciadoMatch) continue;

      const statement = enunciadoMatch[1].trim();
      const typeStr = tipoMatch ? tipoMatch[1].trim() : 'TEXT';
      const type = typeStr.includes('MULTIPLE_CHOICE') ? 'MULTIPLE_CHOICE' : 'TEXT';

      let options: any[] = [];
      if (type === 'MULTIPLE_CHOICE' && opcoesMatch) {
        const lines = opcoesMatch[1].trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
        for (const line of lines) {
          if (line.toUpperCase().startsWith('(V)')) {
            options.push(line.substring(3).trim()); // O frontend da activity só quer array de strings para rascunho
          } else if (line.toUpperCase().startsWith('(F)')) {
            options.push(line.substring(3).trim());
          }
        }
      }

      if (statement) {
        generated.push({ statement, type, options: options.length > 0 ? options : ['', ''] });
      }
    }

    if (generated.length === 0) {
      throw new BadRequestException('A IA não retornou respostas em um formato válido.');
    }

    return generated;
  }
}
