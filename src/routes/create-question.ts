import { sql } from 'drizzle-orm'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import z from 'zod'
import { db } from '../db/connection.ts'
import { schema } from '../db/schema/schema.ts'
import { generateAnswer } from '../services/gemini.ts'
import { generateEmbedding } from '../services/ollama.ts'

const PartSchema = z.object({
	text: z.string(),
})

const HistoryItemSchema = z.object({
	role: z.enum(['user', 'model']),
	parts: z.array(PartSchema),
})

export const HistorySchema = z.array(HistoryItemSchema)

export const createQuestionRoute: FastifyPluginCallbackZod = (app) => {
	app.post(
		'/chat',
		{
			schema: {
				body: z.object({
					question: z.string(),
					history: HistorySchema.optional(),
					medicalRecord: HistoryItemSchema.optional(),
					model: z
						.enum([
							'gemini-2.5-flash',
							'gemini-2.5-flash-lite',
							'gemini-2.5-pro',
						])
						.default('gemini-2.5-flash'),
					system: z.string().optional(),
				}),
				querystring: z.object({
					chunksNum: z.coerce.number().optional(),
					similarity: z.coerce.number().optional(),
					temperature: z.coerce
						.number()
						.pipe(
							z.union([
								z.literal(0.0),
								z.literal(0.1),
								z.literal(0.2),
								z.literal(0.3),
								z.literal(0.4),
								z.literal(0.5),
								z.literal(0.6),
								z.literal(0.7),
								z.literal(0.8),
								z.literal(0.9),
								z.literal(1.0),
							])
						)
						.optional(),
				}),
			},
		},
		async (request, response) => {
			const { question, history, medicalRecord, model, system } = request.body
			const { chunksNum, similarity, temperature } = request.query

			const questionEmbedding = await generateEmbedding(
				[
					{
						text: question,
						origin: 'user',
					},
				],
				false
			)

			const embeddingsAsString = `[${questionEmbedding[0].embedding.join(',')}]`
			// console.log(embeddingsAsString)

			const chunks = await db
				.select({
					id: schema.medicalData.id,
					content: schema.medicalData.content,
					similarity: sql<number>`1 - (${schema.medicalData.embeddings} <=> ${embeddingsAsString}::vector)`,
				})
				.from(schema.medicalData)
				.where(
					sql`1 - (${schema.medicalData.embeddings}::vector <=> ${embeddingsAsString}::vector) > ${similarity ?? 0.1}`
				)
				.orderBy(
					sql`${schema.medicalData.embeddings} <=> ${embeddingsAsString}::vector`
				)
				.limit(chunksNum ?? 10)

			const context = chunks.map((chunk) => chunk.content)
			// const t = chunks.map((item) => ({
			// 	...item,
			// 	similarity: item.similarity.toFixed(2)
			// }))
			// console.log(t)

			const { yourAnswer, usage, modelVersion } =
				await generateAnswer(
					question,
					context,
					temperature,
					system,
					medicalRecord,
					history,
					model
				)

			response.status(200).send({
				yourAnswer,
				config: {
					temperature,
					medicalRecord: medicalRecord?.parts[0].text,
					system,
					similarity,
					chunksNum,
					model: modelVersion,
				},
				// context,
				chunks,
				usage,
				// fullResponse,
				
			})
		}
	)
}
