import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import z from 'zod'
import { gemini } from '../gemini/gemini'

export const createMedicalReportRoute: FastifyPluginCallbackZod = (app) => {
  app.post(
    '/medical-report',
    {
      schema: {
        body: z.object({
          data: z.string()
        })
      },
    },
    async (request, response) => {
      const { data } = request.body
      const medicalReportData = await gemini.createMedicalReport(data)
  
      response.status(200).send(medicalReportData)
    }
  )
}
