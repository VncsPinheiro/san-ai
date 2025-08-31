import { eq } from 'drizzle-orm'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import z from 'zod'
import { db } from '../db/connection.ts'
import { schema } from '../db/schema/schema.ts'

export const getBugsRoute: FastifyPluginCallbackZod = (app) => {
	app.get(
		'/bugs/:bugId',
		{
			schema: {
				params: z.object({
					bugId: z.string().optional(),
				}),
			},
		},
		async (req, res) => {
			const bugId = req.params.bugId

			try {
				if (bugId) {
					const bugsResponse = await db
						.select({
							id: schema.bugData.id,
							cause: schema.bugData.cause,
							history: schema.bugData.history,
							config: schema.bugData.config,
							status: schema.bugData.status,
							createdAt: schema.bugData.createdAt,
							completedAt: schema.bugData.completedAt,
              solution: schema.bugData.solution,
						})
						.from(schema.bugData)
						.where(eq(schema.bugData.id, bugId))

					res.status(200).send(bugsResponse[0])
				}

				const bugsResponse = await db
					.select({
						id: schema.bugData.id,
						cause: schema.bugData.cause,
						history: schema.bugData.history,
						config: schema.bugData.config,
						status: schema.bugData.status,
						createdAt: schema.bugData.createdAt,
						completedAt: schema.bugData.completedAt,
            solution: schema.bugData.solution,
					})
					.from(schema.bugData)
					.orderBy(schema.bugData.createdAt)

				res.status(200).send(bugsResponse)

			} catch {
				res.status(400).send({
          error: `Could not found file by id: ${bugId}`
        })
			}
		}
	)
}
