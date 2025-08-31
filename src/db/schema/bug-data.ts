import {
	json,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
} from 'drizzle-orm/pg-core'

const statusEnum = pgEnum('status', ['completed', 'open'])

export const bugData = pgTable('bug', {
	id: uuid().primaryKey().defaultRandom(),
	cause: text().notNull(),
	history: json().$type<string>(),
	config: json().$type<string>(),
	status: statusEnum().default('open'),
	solution: text(),
	createdAt: timestamp().defaultNow(),
	completedAt: timestamp(),
})
