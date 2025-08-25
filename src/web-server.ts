import cors from '@fastify/cors'
import Fastify from 'fastify'
import { auth } from './lib/auth.js'
import { appLogger } from './lib/logger.js'

const server = Fastify({
	logger: {
		transport: {
			target: 'pino-pretty',
		},
	},
})

// Register CORS
await server.register(cors, {
	origin: true,
	credentials: true,
})

// Better Auth routes
server.route({
	method: ['GET', 'POST'],
	url: '/api/auth/*',
	async handler(request, reply) {
		try {
			// Construct request URL
			const url = new URL(request.url, `http://${request.headers.host}`)

			// Convert Fastify headers to standard Headers object
			const headers = new Headers()
			Object.entries(request.headers).forEach(([key, value]) => {
				if (value) {
					// Handle array of values
					if (Array.isArray(value)) {
						headers.append(key, value.join(', '))
					} else {
						headers.append(key, value.toString())
					}
				}
			})

			// Create Fetch API-compatible request
			const req = new Request(url.toString(), {
				method: request.method,
				headers,
				body: request.body ? JSON.stringify(request.body) : undefined,
			})

			// Process authentication request
			const response = await auth.handler(req)

			// Forward response to client
			reply.status(response.status)

			// Set response headers correctly
			response.headers.forEach((value, key) => {
				try {
					reply.header(key, value)
				} catch (err) {
					server.log.warn(`Failed to set header ${key}: ${value}`)
				}
			})

			// Handle response body
			if (response.body) {
				const contentType = response.headers.get('content-type')
				if (contentType?.includes('application/json')) {
					reply.type('application/json')
				} else if (contentType) {
					reply.type(contentType)
				}
				reply.send(await response.text())
			} else {
				reply.send(null)
			}
		} catch (error) {
			const err = error instanceof Error ? error.message : JSON.stringify(error)
			server.log.error(`Authentication Error: ${err}`)
			reply.status(500).send({
				error: 'Internal authentication error',
				code: 'AUTH_FAILURE',
			})
		}
	},
})

// Health check
server.get('/', async () => {
	return {
		message: 'Finance AI Web Server',
		status: 'ok',
		auth: 'better-auth enabled',
	}
})

// Discord login endpoint
server.get('/login/discord', async (request, reply) => {
	try {
		// Use better-auth's signInSocial API
		const callbackURL = `${request.protocol}://${request.headers.host}/login-success`
		console.log(callbackURL)
		const result = await auth.api.signInSocial({
			body: {
				provider: 'discord',
				requestSignUp: true,
				callbackURL: callbackURL,
			},
		})

		// Redirect to Discord OAuth
		if (result.url) {
			return reply.redirect(result.url)
		}

		return reply.status(400).send({
			error: 'Failed to initiate Discord login',
		})
	} catch (error) {
		const err = error instanceof Error ? error.message : JSON.stringify(error)
		server.log.error(`Discord Login Error: ${err}`)
		return reply.status(500).send({
			error: 'Internal login error',
		})
	}
})

// Login success page
server.get('/login-success', async (_, reply) => {
	const page = `
<!DOCTYPE html>
<html>
<head>
	<title>Login Realizado</title>
	<meta charset="utf-8">
	<style>
		body { 
			font-family: Arial, sans-serif; 
			text-align: center; 
			padding: 50px; 
			background: #f0f2f5;
		}
		.container { 
			background: white; 
			padding: 40px; 
			border-radius: 10px; 
			max-width: 500px; 
			margin: 0 auto;
			box-shadow: 0 4px 6px rgba(0,0,0,0.1);
		}
		h1 { color: #4CAF50; }
		p { color: #666; font-size: 18px; }
		.discord { color: #5865F2; font-weight: bold; }
	</style>
</head>
<body>
	<div class="container">
		<h1>✅ Login realizado com sucesso!</h1>
		<p>Sua conta Discord foi conectada com sucesso.</p>
		<p>Agora você pode voltar para o <span class="discord">Discord</span> e conversar com o bot!</p>
		<p><strong>Pode fechar esta página.</strong></p>
	</div>
</body>
</html>
	`.trim()
	return reply.type('text/html').send(page)
})

// Start server
const start = async () => {
	try {
		const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000
		const host = process.env.HOST || '0.0.0.0'

		await server.listen({ port, host })
		appLogger.info(`🚀 Servidor web rodando em http://localhost:${port}`)
	} catch (error) {
		const err = error instanceof Error ? error.message : JSON.stringify(error)
		appLogger.error('❌ Erro ao iniciar servidor web:', err)
		process.exit(1)
	}
}

// Graceful shutdown
const gracefulShutdown = async () => {
	appLogger.info('🛑 Parando servidor web...')
	await server.close()
	process.exit(0)
}

process.on('SIGINT', gracefulShutdown)
process.on('SIGTERM', gracefulShutdown)

export { server, start }

// Start if this file is run directly
if (import.meta.url === new URL(process.argv[1], 'file://').href) {
	start()
}
