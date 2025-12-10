import { GoogleGenAI, HarmBlockThreshold, HarmCategory } from "@google/genai";
import { env } from "../env";
import { getCurrentSystemInstruction } from "./default-system-instruction";
import { HistoryType } from "../types/History";
import { desc, eq, sql, gt } from 'drizzle-orm'
import { medicalData } from "../db/schema/medical-data";
import { medicalFile } from "../db/schema/medical-file";
import { db } from "../db/connection";
import { schema } from "../db/schema/schema";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { createMedicalReportsFunctionDeclaration } from "./create-medical-report";
import { Models } from "../types/Models";
import { Temperature } from "../types/Temperature";

let instance: GeminiManager | null = null

class GeminiManager {
  private gemini: GoogleGenAI

  private constructor() {
    this.gemini = new GoogleGenAI({
      apiKey: env.API_KEY
    })
  }

  static getInstance() {
    if (!instance) instance = new GeminiManager()
      return instance
  }

  private async refineMessage(message: string, userHistory?: HistoryType, userData?: string) {
    if (!userHistory || userHistory.length === 0) return message

    const refinerInstruction = `
    ROLE: Você é um EXTRATOR DE QUERY PARA RAG.
    Sua função é transformar a entrada do usuário em uma frase de busca técnica.

    === PRONTUÁRIO ATIVO DO USUÁRIO ===
    ${userData ? userData : "Nenhum dado clínico registrado."}
    ===================================

    DIRETRIZES DE SUBSTITUIÇÃO (PRIORIDADE MÁXIMA):
    1. SE o usuário disser "minha doença", "meu problema" ou "tenho isso":
       - OLHE no "PRONTUÁRIO ATIVO" acima.
       - SUBSTITUA o termo genérico pelo nome exato da doença listada.
       - EXEMPLO: Se o prontuário tem "Diabetes" e o user diz "O que comer pra minha doença?", o Output DEVE SER "Dieta recomendada para Diabetes".
    
    2. SE o Prontuário estiver VAZIO ou não tiver a doença:
       - Output: "Consultar lista de doenças do paciente".

    3. DESAMBIGUAÇÃO PADRÃO:
       - Substitua "ela/ele/isso" pelo sujeito da mensagem anterior.

    4. NEUTRALIZAÇÃO:
       - Remova "socorro", "por favor", "acho que".

    EXEMPLOS DE COMPORTAMENTO (Apenas referência de formato):
    Input: "Meu Deus, acho que vou morrer de infarto!" -> Output: Sintomas de infarto agudo
    Input: "Quais são minhas doenças?" -> Output: Doenças crônicas listadas no prontuário
    Input: "Grávida pode tomar ela?" -> Output: Grávida pode tomar Dipirona?
    Input: "Socorro, meu filho bebeu cândida!" -> Output: Primeiros socorros ingestão de água sanitária
    `.trim()

    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE},
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE},
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE }
    ]

    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout limit reached')), 2000); // 2000ms = 2s
    })

    const refinerChat = this.gemini.chats.create({
      model: 'gemini-2.5-flash-lite', 
      history: userHistory,
      config: {
        safetySettings,
        temperature: 0.0,
        topK: 1,
        systemInstruction: refinerInstruction,
      }
    })
    try {
      const result: any = await Promise.race([
          refinerChat.sendMessage({ message }),
          timeoutPromise
        ])
        console.log('Resultado da geração do modelo: ', result.text)
        return result.text?.trim() ?? message

    } catch (err) {
        console.warn('Erro no refinamento, usando mensagem original:', err)
        return message
    }
  }

  async chat(data: {
    message: string
    userData?: string
    userHistory?: HistoryType
    config?: { temperature?: Temperature, model?: Models, system?: string }
  }) {
    const refinedMessage = await this.refineMessage(data.message, data.userHistory)
    console.log(refinedMessage)

    const systemInstruction = getCurrentSystemInstruction()
    const context = await this.retriveContext(refinedMessage)

    const history: HistoryType = []
    if (data.userData) history.push({ role: 'user', parts: [{ text: data.userData }] })
    if (data.userHistory) history.push(...data.userHistory)

    const chat = this.gemini.chats.create({
      model: data.config?.model ?? env.SAN_MODEL,
      history,
      config: {
        temperature: data.config?.temperature ?? 1,
        topP: 0.9,
        systemInstruction: data.config?.system ?? systemInstruction,
        responseMimeType: "application/json",
      }
    })

		const message = `Use as informações abaixo como sua fonte de verdade médica, se aplicável:\n\nCONTEXTO:\n${context}\n\n---\nPERGUNTA DO USUÁRIO:\n${data.message}`

    const response = await chat.sendMessage({
      message,
    })

    if (!response.text) {
				throw new Error('gemini error')
		}

    return {
			text: response.text,
      context,
      refinedMessage,
		}
  }

  async checkPostContent (
  contents: string
) {
  const response = await this.gemini.models.generateContent({
    model: 'gemini-2.5-flash',
    contents,
    config: {
      systemInstruction: 'Você deve verificar a mensagem recebida e avaliar sua linguagem e significado. Veja se ela possui conteúdo inapropriado como xingamentos, palavrões, injúrias raciais, etc. Fique atento também com palavras censuradas como "pqp", "vtnc", "fdp", etc. Ao fim da sua análise retorne "true" ou "false", sendo "true" para a aprovação da mensagem e "false" pra seu descarte.'
    }
  })
  return response.text === 'true' ? true : false
  }

  async createMedicalReport (data: string) {
    const response = await this.gemini.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [data],
      config: {
        systemInstruction: `Você é um motor de processamento de dados médicos (Medical Data Analyst).
Sua função é receber logs brutos de saúde em formato JSON, analisar as métricas de acordo com diretrizes médicas (SBC/SBD) e estruturar os dados para a geração de um relatório PDF chamando a função 'create_report.

### REGRAS DE EXECUÇÃO:

1.  **Análise Clínica:**
    - Avalie a Pressão Arterial (SBC): Normal (<120/80), Elevada (120-139/80-89) ou Hipertensão (>=140/90).
    - Avalie a Glicemia (SBD): Se não houver contexto, assuma valores padrão. >100 mg/dL requer atenção.
    - Avalie a Hidratação: Meta base de 2.0 Litros/dia.

2.  **Geração de Texto (Campos 'message'):**
    - Gere textos em Português do Brasil (PT-BR).
    - O tom deve ser **neutro, profissional e informativo**.
    - Evite a primeira pessoa (não use "Eu acho...", use "Os dados indicam...").
    - Seja direto: Diagnóstico estatístico + Recomendação breve.
    - Exemplo de tom: "A média pressórica encontra-se elevada. Recomenda-se monitoramento contínuo e redução de sódio."

3.  **Formatação de Listas (Campos 'List'):**
    - Converta objetos de contagem em strings de texto legíveis.
    - Formato padrão: "Item A (X), Item B (Y)".
    - Exemplo Input: { "headache": 2, "nausea": 1 }
    - Exemplo Output: "Dor de cabeça (2), Náusea (1)".

4.  **Tratamento de Dados:**
    - Copie os valores numéricos (médias, mins, maxs) exatos do input para os argumentos da função. Não arredonde ou altere valores a menos que solicitado.
    - Converta nomes de meses para PT-BR (ex: November -> Novembro).

### OBJETIVO FINAL:
Sua única saída deve ser a invocação da ferramenta 'create_report' com todos os campos obrigatórios preenchidos corretamente.`.trim(),
        tools: [
          {
            functionDeclarations: [createMedicalReportsFunctionDeclaration]
          }
        ]
      }
    })
    if (!response.functionCalls || !response.functionCalls[0]) { throw new Error('bla')}
    return response.functionCalls[0]
  }

  async previewOrDownload(fileId: string) {
    const file = await db
				.select({
          name: schema.medicalFile.name,
					base64: schema.medicalFile.file,
				})
				.from(schema.medicalFile)
				.where(eq(schema.medicalFile.id, fileId))

			if (!file[0]) {
				throw new Error('File does not exists')
      }
			return file[0]
  }

  async addFile(data: {
    filename: string
    base64: string
    buffer: Buffer
    text: string
  }) {
    const resultMedicalFile = await db
      .insert(schema.medicalFile)
      .values({
        name: data.filename,
        file: data.base64,
        size: data.buffer.length.toString(),
      })
      .returning()

    if (!resultMedicalFile[0]) {
      throw new Error('Cannot create file')
    }

    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 800, chunkOverlap: 150 })
    
		const docs = await splitter.createDocuments([data.text])

    const chunksData = await Promise.all(docs.map(async (doc, i) => {
      const vector = await this.createEmbeddings(doc.pageContent, 'RETRIEVAL_DOCUMENT')

      return {
        fileId: resultMedicalFile[0].id,
        embeddings: vector,
        content: doc.pageContent,
        metadata: { chunkIndex: i }
      }
    }))

    await db.insert(medicalData).values(chunksData)

    return {
      id: resultMedicalFile[0].id,
      name: resultMedicalFile[0].name,
      size: resultMedicalFile[0].size
    }
  }

  async deleteFile(fileId: string) {
    if (!fileId) {
				throw new Error('FileId undefined')
    }

    const resultMedicalData = await db
      .delete(schema.medicalData)
      .where(eq(schema.medicalData.fileId, fileId))
      .returning()

    if (!resultMedicalData[0]) {
      throw new Error('Cannot create file')
    }

    const resultMedicalFile = await db
      .delete(schema.medicalFile)
      .where(eq(schema.medicalFile.id, fileId))
      .returning()

    if (!resultMedicalFile[0]) {
      throw new Error('Cannot create file')
    }
  }

  async getFiles(fileId?: string) {
    if (!fileId) {
      const files = await db
        .select({
          id: schema.medicalFile.id,
          name: schema.medicalFile.name,
          size: schema.medicalFile.size
        })
        .from(schema.medicalFile)

      return files
		}

	  if (fileId) {
      const file = await db
        .select({
          id: schema.medicalFile.id,
          name: schema.medicalFile.name,
          size: schema.medicalFile.size
        })
        .from(schema.medicalFile)
        .where(eq(schema.medicalFile.id, fileId))

      return file 
    }
  }

  private async retriveContext(message: string) {
    const messageEmbedding = await this.createEmbeddings(message, 'RETRIEVAL_QUERY')
    const similarity = sql<number>`1 - (${medicalData.embeddings} <=> ${JSON.stringify(messageEmbedding)})`;
    
    const results = await db
    .select({ content: medicalData.content, fileName: medicalFile.name, similarity })
    .from(medicalData)
    .leftJoin(medicalFile, eq(medicalData.fileId, medicalFile.id))
    .where(gt(similarity, 0.5))
    .orderBy(desc(similarity))
    .limit(10);

    return results.map(r => `FONTE: ${r.fileName}\nCONTEÚDO: ${r.content}`).join("\n---\n")
  }

  private async createEmbeddings(text: string, taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY') {
    const response = await this.gemini.models.embedContent({
          model: 'text-embedding-004',
          contents: { role: 'user', parts: [{ text }] },
          config: {
            taskType,
          }
      });

    if (!response.embeddings?.[0].values) {
      throw new Error('Failed to generate embbedings')
    }

    return response.embeddings[0].values
  }
}

export const gemini = GeminiManager.getInstance()


    // const refinerInstruction = `
    // ROLE: Você é um MOTOR DE BUSCA SEMÂNTICA (Database Query Extractor).
    // NÃO é um assistente, NÃO é um médico e NÃO deve dar conselhos.

    // OBJECTIVE: Converta a entrada do usuário em uma query de busca simples e direta para recuperar documentos técnicos.

    // RULES:
    // 1. IGNORE totalmente o estado emocional, dores ou medos do usuário.
    // 2. REMOVA saudações, pedidos de ajuda ou frases de conversa.
    // 3. SE o input for uma afirmação de doença ("Estou com X"), CONVERTA para "Sintomas de X" ou "Diagnóstico de X".
    // 4. Mantenha o idioma PT-BR.

    // EXEMPLOS DE "HARDENING":
    // Input: "Meu Deus, acho que vou morrer de infarto!"
    // Output: "Sintomas de infarto agudo"

    // Input: "Estou com muito medo de ter pegado AIDS."
    // Output: "Diagnóstico e transmissão da AIDS"

    // Input: "Minha cabeça vai explodir de dor."
    // Output: "Causas de dor de cabeça intensa"

    // Input: "Acho que estou com essa doença (AIDS)" (Contexto: AIDS)
    // Output: "Sintomas e diagnóstico da AIDS"

    // OUTPUT FINAL (Apenas a frase):
    // TASK: Reescreva a última mensagem do usuário para torná-la adequada ao RAG, substituindo pronomes pelo contexto do histórico.
    
    // EXEMPLOS DE COMPORTAMENTO:

    // Histórico: "Para que serve a Dipirona?"
    // Input: "Grávida pode tomar ela?"
    // Output: "Grávida pode tomar Dipirona?"

    // Histórico: "Como tratar gastrite nervosa?"
    // Input: "O que devo evitar comer?"
    // Output: "O que devo evitar comer se tenho gastrite nervosa?"

    // Histórico: "Estou sentindo uma dor no peito esquerdo."
    // Input: "Pode ser infarto?"
    // Output: "Dor no peito esquerdo pode ser infarto?"

    // Histórico: "A vacina da gripe dá reação?"
    // Input: "Quanto tempo dura isso?"
    // Output: "Quanto tempo dura a reação da vacina da gripe?"

    // Histórico: "O que é colesterol HDL?"
    // Input: "E qual a diferença pro LDL?"
    // Output: "Qual a diferença entre colesterol HDL e LDL?"

    // Histórico: "Obrigado, San."
    // Input: "Por nada."
    // Output: "Por nada."

    // REGRAS FINAIS:
    // - Mantenha o idioma original (PT-BR).
    // - Responda APENAS a frase reescrita. Nada de "Aqui está:".
    // 
    