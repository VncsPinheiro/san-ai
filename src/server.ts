import { fastify } from 'fastify'
import { fastifyMultipart } from '@fastify/multipart'
import {
	serializerCompiler,
	validatorCompiler,
	type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import './db/connection.ts'
import { env } from './env.ts'
import { addFileRoute } from './routes/add-file.ts'
import './services/ollama.ts'
import { createQuestionRoute } from './routes/create-question.ts'
import { downloadFileRoute } from './routes/download-file.ts'
import { deleteFileRoute } from './routes/delete-file.ts'
import cors from '@fastify/cors';
import { getFileRoute } from './routes/get-file.ts'
import { createBugRoute } from './routes/create-bug.ts'
import { getBugsRoute } from './routes/get-bugs.ts'
import { updateBugRoute } from './routes/update-bug.ts'

const app = fastify({
	bodyLimit: 50 * 1024 * 1024 // 50 MB
}).withTypeProvider<ZodTypeProvider>()

await app.register(cors, {
  origin: "*",
	methods: ["GET", "POST", "PUT", "DELETE",]
});

app.register(fastifyMultipart, {
	limits: {
		fileSize: 20 * 1024 * 1024, // 20MB
	},
})

app.setSerializerCompiler(serializerCompiler)
app.setValidatorCompiler(validatorCompiler)

app.get('/health', () => {
	return 'OK'
})

app.register(addFileRoute)
app.register(createQuestionRoute)
app.register(downloadFileRoute)
app.register(deleteFileRoute)
app.register(getFileRoute)
app.register(createBugRoute)
app.register(getBugsRoute)
app.register(updateBugRoute)

app.listen({
	port: env.PORT,
})
