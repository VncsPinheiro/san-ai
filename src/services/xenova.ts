import { type FeatureExtractionPipeline, pipeline } from '@xenova/transformers'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'

export interface TextType {
	text: string
	origin: string
}

let embedder: FeatureExtractionPipeline | null = null

export async function loadEmbedder() {
	if (!embedder) {
		embedder = await pipeline(
			'feature-extraction',
			'Xenova/multilingual-e5-large'
		)
	}
	return embedder
}

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
	// console.log(chunks)

	return chunks.map((chunk) => {
		return {
			text: chunk.pageContent,
			origin: data[0].origin,
		}
	})
}

export async function generateEmbedding(data: TextType[], chunkOption = true) {
	const embed = await loadEmbedder()

	const chunks = chunkOption ? await createChunks(data) : data

	const result = await Promise.all(
		chunks.map(async (chunk) => {
			const embedding = await embed(chunk.text, {
				pooling: 'mean',
				normalize: true,
			})
			return {
				embedding: Array.from(embedding.data),
				content: chunk.text,
				origin: chunk.origin,
			}
		})
	)
	return result
}
