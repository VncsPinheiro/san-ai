import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import z from 'zod'
import { db } from '../db/connection.ts'
import { schema } from '../db/schema/schema.ts'
import { HistorySchema } from './create-question.ts'

export const createBugRoute: FastifyPluginCallbackZod = (app) => {
	app.post(
		'/bugs',
		{
			schema: {
				body: z.object({
					cause: z.string(),
					config: z
						.object({
							chunksPerContext: z.number().optional(),
							similarity: z.number().optional(),
							model: z.enum(['gemini-2.5-flash', 'gemini-2.5-flash-lite']),
						})
						.optional(),
					history: HistorySchema.optional(),
				}),
			},
		},
		async (req, res) => {
			const { cause, history, config } = req.body

			const response = await db.insert(schema.bugData).values({
				history: JSON.stringify(history),
				config: JSON.stringify(config),
				cause,
			}).returning()

      if(!response[0]) {
        throw new Error('Invalid data')
      }

      res.status(201).send(response)
		}
	)
}
