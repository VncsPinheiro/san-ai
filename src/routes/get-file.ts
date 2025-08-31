import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import z from 'zod'
import { db } from '../db/connection.ts'
import { schema } from '../db/schema/schema.ts'
import { eq } from 'drizzle-orm'

export const getFileRoute: FastifyPluginCallbackZod = (app) => {
	app.get(
		'/file/:fileId',
		{
			schema: {
				params: z.object({
					fileId: z.string().optional(),
				}),
			},
		},
		async (request, response) => {
			const fileId = request.params.fileId

			if (!fileId) {
				const files = await db
					.select({
						id: schema.medicalFile.id,
						name: schema.medicalFile.name,
						size: schema.medicalFile.size
					})
					.from(schema.medicalFile)

				return response.status(200).send(files)
			}

			if (fileId) {
				try {
					const file = await db
						.select({
							id: schema.medicalFile.id,
							name: schema.medicalFile.name,
							size: schema.medicalFile.size
						})
						.from(schema.medicalFile)
						.where(eq(schema.medicalFile.id, fileId))

					return response.status(200).send(file)

				} catch {
          
					return response.status(400).send({
						message: 'File not found',
					})
				}
			}
		}
	)
}
