import 'reflect-metadata'
import { getService } from './core/container/module'
import { TYPES } from './core/types'
import { AppModule } from './modules/app.module'
import { auth } from './modules/auth/infra/better-auth/auth'
import type { DiscordBotHandlerService } from './modules/discord/services/discord-bot-handler.service'
import { env } from './modules/env'
import type { IAppLogger } from './modules/logger/interfaces/ILogger'
import type { DatabaseService } from './modules/shared/persistence/services/database.service'
import type { HttpServer } from './modules/shared/services/http-server'
import type { MCPServerManagerService } from './modules/shared/services/mcp-server-manager.service'

// Initialize the AppModule to register all dependencies
new AppModule()

async function main() {
	try {
		// Get services from the DI container
		const logger = getService<IAppLogger>(TYPES.Logger)
		const httpServer = getService<HttpServer>(TYPES.HttpServer)
		const mcpManager = getService<MCPServerManagerService>(
			TYPES.MCPServerManager,
		)
		const discordBotHandler = getService<DiscordBotHandlerService>(
			TYPES.DiscordBotHandler,
		)

		// Start the Discord bot
		const database = getService<DatabaseService>(TYPES.Database)

		logger.info('🚀 Starting Finance AI')
		// Initialize MCP Server Manager
		await mcpManager.initialize()

		// Setup HTTP routes
		setupHttpRoutes(httpServer, logger)

		// Start HTTP server
		await httpServer.start(env.PORT)

		// Initialize Discord client
		await discordBotHandler.initialize()
		await discordBotHandler.start()
		logger.info('🎉 All services started successfully!')

		// Graceful shutdown
		setupGracefulShutdown(
			logger,
			discordBotHandler,
			httpServer,
			mcpManager,
			database,
		)
	} catch (error) {
		const logger = getService<IAppLogger>(TYPES.Logger)
		const err = error instanceof Error ? error.message : JSON.stringify(error)
		logger.error('❌ Error starting application:', { err })
		process.exit(1)
	}
}

function setupHttpRoutes(httpServer: HttpServer, logger: IAppLogger): void {
	// Health check
	httpServer.setupHealthCheck()

	// Better Auth routes
	httpServer.getApp().route({
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
						logger.warn(`Failed to set header ${key}: ${value}`, { err })
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
				const err =
					error instanceof Error ? error.message : JSON.stringify(error)
				logger.error(`Authentication Error: ${err}`)
				reply.status(500).send({
					error: 'Internal authentication error',
					code: 'AUTH_FAILURE',
				})
			}
		},
	})

	httpServer.getApp().get('/login/discord', async (request, reply) => {
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
			logger.error(`Discord Login Error: ${err}`)
			return reply.status(500).send({
				error: 'Internal login error',
			})
		}
	})

	httpServer.getApp().get('/login-success', async (_, reply) => {
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

	logger.info('📡 HTTP routes configured')
}

function setupGracefulShutdown(
	logger: IAppLogger,
	discordClient: DiscordBotHandlerService,
	httpServer: HttpServer,
	mcpManager: MCPServerManagerService,
	database: DatabaseService,
): void {
	const shutdown = async () => {
		logger.info('🛑 Shutting down all services...')

		try {
			await discordClient.stop()
			await httpServer.stop()
			await mcpManager.dispose()
			await database.close()

			logger.info('✅ All services stopped gracefully')
			process.exit(0)
		} catch (error) {
			logger.error('❌ Error during shutdown:', { error })
			process.exit(1)
		}
	}

	process.on('SIGINT', shutdown)
	process.on('SIGTERM', shutdown)
}

main()
