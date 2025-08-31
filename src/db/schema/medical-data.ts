// import {  vector } from "drizzle-orm/pg-core";
import { pgTable, text, timestamp, uuid, vector } from 'drizzle-orm/pg-core'
import { medicalFile } from './medical-file.ts'

export const medicalData = pgTable('medical_data', {
	id: uuid().primaryKey().defaultRandom(),
	fileId: uuid()
		.references(() => medicalFile.id)
		.notNull(),
	embeddings: vector({ dimensions: 1024 }).notNull(),
	content: text().notNull(),
	origin: text().notNull(),
	createdAt: timestamp().defaultNow(),
})
