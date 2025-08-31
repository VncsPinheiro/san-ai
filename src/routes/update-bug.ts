import { eq } from 'drizzle-orm'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import z from 'zod'
import { db } from '../db/connection.ts'
import { schema } from '../db/schema/schema.ts'

export const updateBugRoute: FastifyPluginCallbackZod = (app) => {
	app.patch(
		'/bugs/:bugId',
		{
			schema: {
				params: z.object({
					bugId: z.string(),
				}),
				body: z.object({
					solution: z.string(),
				}),
			},
		},
		async (req, res) => {
			const bugId = req.params.bugId
			const solution = req.body.solution

			try {
				if (!bugId) {
					throw new Error('aa')
				}

				const bug = await db
					.select({
						id: schema.bugData.id,
						cause: schema.bugData.cause,
						history: schema.bugData.history,
						config: schema.bugData.config,
						status: schema.bugData.status,
						createdAt: schema.bugData.createdAt,
						completedAt: schema.bugData.completedAt,
					})
					.from(schema.bugData)
					.where(eq(schema.bugData.id, bugId))

				if (!bug[0]) {
					throw new Error('Could not find bug')
				}

				const bugResponse = await db
					.update(schema.bugData)
					.set({
						status: bug[0].status === 'open' ? 'completed' : 'open',
						solution: bug[0].status === 'open' ? solution : null,
						completedAt: bug[0].status === 'open' ? new Date() : null,
					})

					.where(eq(schema.bugData.id, bugId))
					.returning()

				res.status(200).send(bugResponse[0])
			} catch {
				console.log('aaa')
			}
		}
	)
}
