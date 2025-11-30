import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import z from 'zod'
import { gemini } from '../gemini/gemini'

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
			const files = await gemini.getFiles(fileId)

			response.status(200).send({
				files,
			})
		}
	)
}
