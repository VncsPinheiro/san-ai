import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import z from 'zod'
import { gemini } from '../gemini/gemini'

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
					message: z.string(),
					userHistory: HistorySchema.optional(),
					userData: z.string().optional(),
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
			const { message, userHistory, userData, model, system } = request.body
			const { chunksNum, similarity, temperature } = request.query
			const chatInteractionResult = await gemini.chat({
				message,
				userHistory,
				userData,
				config: {
					temperature,
					system,
					model,
				}
			})
	
			response.status(200).send(JSON.parse(chatInteractionResult.text))
		}
	)
}
