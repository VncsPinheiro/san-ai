import { db } from "../db/connection"
import { sql } from 'drizzle-orm'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

export const healthCheckRoute: FastifyPluginCallbackZod = (app) => {
  app.get(
    '/health', {},
    async (request, response) => {
      try {
        await db.execute(sql`SELECT 1`)

        response.status(200).send({
          message: 'awake'
        })
      } catch (error) {
        response.status(500).send({
          message: 'asleep'
        })
      }
    }
  )
}
