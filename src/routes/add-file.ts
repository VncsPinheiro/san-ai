import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import PdfParse from 'pdf-parse'
import z from 'zod'
import { db } from '../db/connection.ts'
import { schema } from '../db/schema/schema.ts'
import type { TextType } from '../services/ollama.ts'
import { generateEmbedding } from '../services/xenova.ts'

const textTypeSchema = z.object({
	text: z.string(),
	origin: z.string(),
})

export const addFileRoute: FastifyPluginCallbackZod = (app) => {
	app.post(
		'/file',
		{
			schema: {
				body: z.union([z.array(textTypeSchema).optional(), z.null()]),
				querystring: z.object({
					createChunks: z.enum(['true', 'false']).optional(),
				}),
			},
		},
		async (request, response) => {
			const createChunks = request.query.createChunks !== 'false'

			const file = await request.file().catch(() => null)

			let fullText: string
			let fileBuffer: Buffer
			let fileBase64: string
			let filename: string
			let body: TextType[] | undefined

			if (file) {
				fileBuffer = await file.toBuffer()
				fullText = (await PdfParse(fileBuffer)).text
				fileBase64 = fileBuffer.toString('base64')
				filename = file.filename
			} else if (request.body?.[0]) {
				// Transformar em pdf
				body = request.body
				fullText = body
					.map((item) => {
						return item.text
					})
					.join('\n')
				filename = body[0].origin
				fileBuffer = Buffer.from(fullText, 'utf-8')
				fileBase64 = fileBuffer.toString('base64')
			} else {
				return response.status(400).send('Não foi possível usar seus dados')
			}

			const resultMedicalFile = await db
				.insert(schema.medicalFile)
				.values({
					name: filename,
					file: fileBase64,
					mimetype: 'appllication/pdf',
					size: fileBuffer.length.toString(),
				})
				.returning()

			if (!resultMedicalFile[0]) {
				throw new Error('Cannot create file')
			}

			const toPass = body
				? body
				: [
						{
							text: fullText,
							origin: filename,
						},
					]

			const embeddingsResult = await generateEmbedding(toPass, createChunks)
			// await sendEmbeddings(toPass)

			const resultMedicalData = embeddingsResult.map(async (item) => {
				return await db
					.insert(schema.medicalData)
					.values({
						fileId: resultMedicalFile[0].id,
						embeddings: item.embedding,
						content: item.content,
						origin: filename,
					})
					.returning()
			})

			if (!resultMedicalData[0]) {
				throw new Error('Cannot create file')
			}

			response.status(201).send({
				id: resultMedicalFile[0].id,
				name: resultMedicalFile[0].name,
				size: resultMedicalFile[0].size,
			})
		}
	)
}
