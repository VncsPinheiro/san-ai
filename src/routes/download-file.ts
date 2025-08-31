import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import z from 'zod'
import { db } from '../db/connection.ts'
import { schema } from '../db/schema/schema.ts'
import { eq } from 'drizzle-orm'

export const downloadFileRoute: FastifyPluginCallbackZod = (app) => {
	app.get(
		'/preview/:fileId',
		{
			schema: {
				params: z.object({
					fileId: z.string(),
				}),
        querystring: z.object({
          action: z.literal('download').optional()
        })
			},
		},
		async (request, response) => {
			const fileId = request.params.fileId
      const actionParam = request.query.action

      const action = actionParam === 'download' ? 'attachment' : 'inline'

			const file = await db
				.select({
          name: schema.medicalFile.name,
					file: schema.medicalFile.file,
				})
				.from(schema.medicalFile)
				.where(eq(schema.medicalFile.id, fileId))

			if (!file[0]) {
				throw new Error('File does not exists')
			}
			const { file: fileBase64, name: fileName } = file[0]
			const fileBuffer = Buffer.from(fileBase64, 'base64')

			response.header('Content-Type', 'application/pdf')
			response.header('Content-Disposition', `${action}; filename="${fileName}"`)

			return response.send(fileBuffer)
		}
	)
}
