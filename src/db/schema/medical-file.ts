import { relations } from 'drizzle-orm'
import { pgTable, uuid, text, timestamp, numeric } from 'drizzle-orm/pg-core'
import { medicalData } from './medical-data'

export const medicalFile = pgTable('medical-file', {
	id: uuid().primaryKey().defaultRandom(),
	name: text().notNull(),
	file: text().notNull(), //Base64
	size: numeric().notNull(),
	createAt: timestamp().defaultNow(),
})

export const medicalFileRelation = relations(medicalFile, ({ many }) => ({
	chunks: many(medicalData)
}))
