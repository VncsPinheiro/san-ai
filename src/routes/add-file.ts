import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import PdfParse from 'pdf-parse'
import { gemini } from '../gemini/gemini'

export const addFileRoute: FastifyPluginCallbackZod = (app) => {
	app.post(
		'/file',
		{},
		async (request, response) => {
			const file = await request.file().catch(() => null)

			if (!file) throw new Error('Error to parse the file')

			const buffer = await file.toBuffer()
			const text = (await PdfParse(buffer)).text
			const base64 = buffer.toString('base64')
			const filename = file.filename

			const resultMedicalData = await gemini.addFile({
				text,
				base64,
				buffer,
				filename,
			})

			response.status(201).send(resultMedicalData)
		}
	)
}
