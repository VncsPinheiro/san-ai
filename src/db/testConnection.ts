/** biome-ignore-all lint/suspicious/noConsole: <dev only> */
import { sql } from './connection.ts'

try {
	await sql`SELECT 1 AS connected`
	console.log('Conexão OK ✅')
} catch {
	console.error('Erro na conexão ❌')
} finally {
	await sql.end()
}
