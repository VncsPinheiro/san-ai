import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import z from 'zod'
import { gemini } from '../gemini/gemini'

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
      const type = request.query.action === 'download' ? 'attachment' : 'inline'
			const file = await gemini.previewOrDownload(fileId)

			response.header('Content-Type', 'application/pdf')
			response.header('Content-Disposition', `${type}; filename="${file.name}"`)

			const buffer = Buffer.from(file.base64, 'base64')

			return response.send(buffer)
		}
	)
}
