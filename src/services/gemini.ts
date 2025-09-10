import { GoogleGenAI } from '@google/genai'
import { env } from '../env.ts'
import type { Message } from '../types/Message.ts'
import type { Models } from '../types/Models.ts'
import type { Temperature } from '../types/Temperature.ts'

export const gemini = new GoogleGenAI({
	apiKey: env.API_KEY,
})

type HistoryType = Message[]

const defaultSystem =
	`Você é um chatbot médico, deve responder o usuário utilizando somente o texto fornecido abaixo. Use o contexto como base para sua resposta, mas deixe-a simples se possível.

  INSTRUÇÕES: 
    - Seu nome é San, a assistente virtual da Sanare (um app que ajuda os usuários a monitorarem sua saúde com base em registros vitais (frequencia cardiaca, pressão arterial, hidratação, emoções, etc));
    - Utilize uma linguagem humana, sempre se preocupando com o usuário. Caso o usuário pergunte sobre alguma doença, responda sobre e também pergunta se ele está com algum sintoma ou doença;
    - Seu escopo é médico, ou seja, responda apenas questões/afirmações médicas ou relacionadas ao usuário. Não responda perguntas como "Qual time venceu o Munidal de Clubes de 2025?" ou "Quando aconteceu a segunda guerra mundial?";
    - Quando não puder responder algo, diga algo como "Infelizmente não posso responder esse tipo de questão. Tem alguma questão relacionada a saúde?";
    - Você normalmente irá receber um contexto para responder a questão/afirmação, use somente ele para basear sua resposta;
    - Caso o contexto não seja fornecido, diga que não tem dados para responder a pergunta;
    - Nunca se refira ao contexto diretamente;
		- Você possui um histórico de convera com o usuário. Use esse histórico também como um contexto caso necessário. Por exemplo: se o usuário disse que tem câncer, tenha essa informação, e caso ele pergunte sobre suas doenças, responda usando o USER_INFORMATION e o histórico;
    - Não diga "Olá!" a cada interação com o usuário. Cumprimente-o somente caso necessário, como quando ele te cumprimenta;
		- Você pode receber diversas doenças em seu contexto. Faça sua resposta sempre girar em torno da informação mais comum. Por exemplo: se o usuário falar que está com dor de cabeça, você pode receber informações mais sérias como câncer e coqueluche, mas também enxaqueca e cefalia, informações mais simples, sempre de prioridade pra esse tipo de informação mais simples (enxaqueca e cefalia), e apenas cite as condições mais severas pra conhecimento.
		`.trim()

const defaultHistory: HistoryType = [
	{ role: 'user', parts: [{ text: defaultSystem }] },
]

// const history:  HistoryType = [
// 		...defaultHistory
// 	]


// Sempre que é iniciado pela primeria vez, deve receber o MedicalRecord o usuário para usar em Meus dados, e junto com isso, deve receber o histórico de conversas com o usuário, sendo sempre após a declaração do system e do Meus dados

export async function generateAnswer(
	question: string,
	contextRaw: string[],
	temperature: Temperature = 0.5,
	system?: string,
	medicalRecord?: Message,
	userHistory?: HistoryType,
	model: Models = 'gemini-2.5-flash'
) {
	if (system && system !== defaultHistory[0].parts[0].text) {
		defaultHistory[0].parts[0].text = system
	}

	if (medicalRecord && !defaultHistory[1]) {
		defaultHistory.push(medicalRecord)
	}

	if (
		medicalRecord &&
		defaultHistory[1].parts[0].text !== medicalRecord.parts[0].text
	) {
		defaultHistory[1] = medicalRecord
	}

	const history: HistoryType = userHistory
		? [...defaultHistory, ...userHistory]
		: [...defaultHistory]
	

	const context = contextRaw.join('\n\n')

	const prompt = `
  CONTEXTO:
  ${context}

  PERGUNTA:
  ${question}
  `.trim()

	const chat = gemini.chats.create({
		model,
		history,
		config: {
			temperature,
		},
	})

	const response = await chat.sendMessage({
		message: prompt,
	})

	if (!response.text) {
		throw new Error('Failed to generate answer')
	}

	history.push(
		{ role: 'model', parts: [{ text: response.text }] }
	)
	history.push(
		{ role: 'user', parts: [{ text: prompt }] }
	)

	return {
		yourAnswer: response.text,
		prompt,
		usage: response.usageMetadata,
		modelVersion: response.modelVersion,
		fullResponse: response
	}
}
