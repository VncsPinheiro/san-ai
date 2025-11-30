import { FastifyPluginCallbackZod } from "fastify-type-provider-zod";
import z from "zod";
import { gemini } from "../gemini/gemini";

export const postCheckRoute: FastifyPluginCallbackZod = (app) => {
  app.post(
    '/post-check',
    {
      schema: {
        body: z.object({
          content: z.string()
        })
      },
    },
    async (request, response)=> {
      const content = request.body.content
      const res = await gemini.checkPostContent(content)
      
      response.status(200).send({
        success: res
      })
    }
  )
}