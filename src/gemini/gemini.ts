import { GoogleGenAI } from "@google/genai";
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

// interface CreateMedicalReportData {
//   bloodPressure: { status: string, average: string, systolicAverage: number, diastolicAverage: number, totalLogs: number}
//   symptoms: { countSymptoms: Record<string, number>, totalLogs: number }
//   bloodSugar: {
//     averageBloodSugar: number,
//     minBloodSugar: number,
//     maxBloodSugar: number,
//     totalLogs: number
//   }
//   mood: { countHumor: Record<string, number>, totalLogs: number }
//   hydratation: { averageLitersHydration: number, totalLogs: number }
//   heartRate: {
//     averageHeartRate: number,
//     minHeartRate: number,
//     maxHeartRate: number,
//     totalLogs: number
//   }
//   timeRegistered: {
//     firstDate: Date,
//     lastDate: Date,
//     diffDays: number,
//     year: number,
//     month: string
//     totalLogs: number
//   }
//   month: number
//   year: number
// }

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

  async chat(data: {
    message: string
    userData?: string
    userHistory?: HistoryType
    config?: { temperature?: Temperature, model?: Models, system?: string }
  }) {
    const systemInstruction = getCurrentSystemInstruction()
    const context = await this.retriveContext(data.message)

    const history: HistoryType = []
    if (data.userData) history.push({ role: 'user', parts: [{ text: data.userData }] })
    if (data.userHistory) history.push(...data.userHistory)

    const chat = this.gemini.chats.create({
      model: data.config?.model ?? 'gemini-3.0-pro-preview',
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
    .limit(5);

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