import { z } from 'zod'
import { config } from 'dotenv'
config()

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().startsWith('postgresql://'),
  API_KEY: z.string(),
  SAN_MODEL: z.enum(['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-flash-pro', 'gemini-3.0-pro-preview']).default('gemini-2.5-flash')
})

export const env = envSchema.parse(process.env)
