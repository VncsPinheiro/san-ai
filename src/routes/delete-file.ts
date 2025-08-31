import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import z from 'zod'
import { db } from '../db/connection.ts'
import { schema } from '../db/schema/schema.ts'
import { eq } from 'drizzle-orm'

export const deleteFileRoute: FastifyPluginCallbackZod = (app) => {
	app.delete(
		'/file/:fileId',
		{
			schema: {
				params: z.object({
					fileId: z.string(),
				}),
			},
		},
		async (request, response) => {
			const fileId = request.params.fileId

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

      response.status(200)
		}
	)
}
