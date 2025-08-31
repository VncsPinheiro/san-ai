import { pgTable, uuid, text, timestamp, numeric } from 'drizzle-orm/pg-core'

export const medicalFile = pgTable('medical-file', {
	id: uuid().primaryKey().defaultRandom(),
	name: text().notNull(),
	file: text().notNull(), //Base64
	mimetype: text().default('application/pdf'),
	size: numeric().notNull(),
	createAt: timestamp().defaultNow(),
})
