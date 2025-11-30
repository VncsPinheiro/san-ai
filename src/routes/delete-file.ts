import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import z from 'zod'
import { gemini } from '../gemini/gemini'

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
			await gemini.deleteFile(request.params.fileId)
      response.status(204)
		}
	)
}