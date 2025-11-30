import { index, jsonb, pgTable, text, timestamp, uuid, vector } from 'drizzle-orm/pg-core'
import { medicalFile } from './medical-file'
import { relations } from 'drizzle-orm'

export const medicalData = pgTable('medical_data', {
	id: uuid().primaryKey().defaultRandom(),
	fileId: uuid()
		.references(() => medicalFile.id, { onDelete: "cascade" })
		.notNull(),
	embeddings: vector({ dimensions: 768 }).notNull(),
	metadata: jsonb("metadata"),
	content: text().notNull(),
	createdAt: timestamp().defaultNow()
}, (table) => ({
  // 1. ÍNDICE HNSW (Crucial para performance da busca vetorial)
  // Usa o operador 'vector_cosine_ops' (<=>) que é o padrão para textos
  	embeddingIndex: index("chunk_embedding_hnsw_index").using("hnsw", table.embeddings.op("vector_cosine_ops")),
  // 2. Índice para buscar chunks de um arquivo específico rapidamente
  	fileIdIndex: index("chunk_file_id_idx").on(table.fileId),
}))

export const medicalDataRelation = relations(medicalData, ({ one }) => ({
	fileId: one(medicalFile, {
		fields: [medicalData.fileId],
		references: [medicalFile.id]
	})
}))
