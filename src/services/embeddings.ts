// import { FeatureExtractionPipeline, pipeline } from '@xenova/transformers'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { gemini } from './gemini.ts'
import type { TextType } from './ollama.ts'

// const model = gemini.models.embedContent({
//     model: "gemini-embedding-001"
//   })

async function createChunks(data: TextType[]) {
	const fullText = data
		.map((item) => {
			return item.text
		})
		.join('\n')

	const splitter = new RecursiveCharacterTextSplitter({
		chunkSize: 500,
		chunkOverlap: 50,
	})
	const chunks = await splitter.createDocuments([fullText])

	return chunks.map((chunk) => {
		return {
			text: chunk.pageContent,
			origin: data[0].origin,
		}
	})
}

export async function createEmbeddings(text: string) {
	// const response = await gemini.models.embedContent({
	// 	model: 'text-embedding-004',
	// 	contents: [{ text }],
	// 	config: {
	// 		taskType: 'RETRIEVAL_DOCUMENT',
	// 	},
	// })

	const response = await gemini.models.embedContent({
        model: 'gemini-embedding-001',
        contents: text,
    });

	if (!response.embeddings?.[0].values) {
		throw new Error('Failed to generate embbedings')
	}

	return response.embeddings[0].values
}

export async function sendEmbeddings(text: TextType[], chunkOption = true) {
	const chunks = chunkOption ? await createChunks(text) : text
	// const textFormated = chunks.map((item) => item.text)

	const result = await Promise.all(
		chunks.map(async (chunk) => {
			const embedding = await createEmbeddings(chunk.text)
			return {
				embedding,
				content: chunk.text,
				origin: chunk.origin
			}
		})
	)

	console.log(result)
	return result
	// console.log(result)


}
