import { fastify } from 'fastify'
import { fastifyMultipart } from '@fastify/multipart'
import {
	serializerCompiler,
	validatorCompiler,
	type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import './db/connection'
import { env } from './env'
import { addFileRoute } from './routes/add-file'
import { createQuestionRoute } from './routes/create-question'
import { downloadFileRoute } from './routes/download-file'
import { deleteFileRoute } from './routes/delete-file'
import cors from '@fastify/cors';
import { getFileRoute } from './routes/get-file'
import { postCheckRoute } from './routes/post-check'
import { createMedicalReportRoute } from './routes/create-medical-report'
import { healthCheckRoute } from './routes/health-check'

const app = fastify({
	bodyLimit: 50 * 1024 * 1024 // 50 MB
}).withTypeProvider<ZodTypeProvider>()

// app.server.headersTimeout = 1_200_000

app.register(cors, {
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

app.get('/', () => {
	return 'OK'
})
app.register(healthCheckRoute)

app.register(addFileRoute)
app.register(createQuestionRoute)
app.register(downloadFileRoute)
app.register(deleteFileRoute)
app.register(getFileRoute)
app.register(postCheckRoute)
app.register(createMedicalReportRoute)

app.listen({
	port: env.PORT,
})
