import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '../env'
import { schema } from './schema/schema'

export const sql = postgres(env.DATABASE_URL,
	//  { ssl: true}
	)
export const db = drizzle(sql, {
	schema,
	casing: 'snake_case',
})

