// import { OllamaEmbeddings } from '@langchain/ollama'
// biome-ignore lint/style/useImportType: <one type one function>
import { FeatureExtractionPipeline, pipeline } from '@xenova/transformers'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'

// const llmEmbeddings = new OllamaEmbeddings({
// 	model: 'mxbai-embed-large:latest',
// })

// export async function generateEmbedding(data: TextType[], chunkOption = true) {
// 	const chunks = chunkOption ? await createChunks(data) : data

// 	const embeddingResults = await Promise.all(
// 		chunks.map(async (chunk) => {
// 			const embedding = await llmEmbeddings.embedDocuments([chunk.text])
// 			// console.log(embedding, chunk.origin)
// 			return {
// 				embedding: embedding[0],
// 				content: chunk.text,
// 				origin: chunk.origin,
// 			}
// 		})
// 	)
// 	// console.log(embeddingResults)
// 	return embeddingResults
// }

export interface TextType {
	text: string
	origin: string
}


let embedder: FeatureExtractionPipeline | null = null

export async function loadEmbedder() {
	if (!embedder) {
		embedder = await pipeline(
			'feature-extraction',
			'Xenova/multilingual-e5-large',
			// 'Xenova/bge-large-en-v1.5',
			// 'tokenizer_js',
			// {
			// 	local_files_only: true
			// }
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
	// console.log(result)
	return result
}

// async function createChunks(data: string) {
// 	const splitter = new RecursiveCharacterTextSplitter({
// 		chunkSize: 500,
// 		chunkOverlap: 50,
// 	})
// 	const chunks = await splitter.createDocuments([data])

// 	return chunks.map(chunk => chunk.pageContent)
// }

// export async function generateEmbedding(text: string) {
// 	// biome-ignore lint/suspicious/noConsole: <dev only>
// 	console.log('gerando embeddings')
// 	const embed = await loadEmbedder()
// 	const chunks = await createChunks(text)

// 	const result = await Promise.all(
// 		chunks.map(async (chunk) => {
// 			const embedding = await embed(chunk, {
// 				pooling: 'mean',
// 				normalize: true,
// 			})
// 			return {
// 				embedding: Array.from(embedding.data),
// 				content: chunk,
// 			}
// 		})
// 	)
// 	// biome-ignore lint/suspicious/noConsole: <dev only>
// 	console.log('embeddings gerados')
// 	return result
// }
