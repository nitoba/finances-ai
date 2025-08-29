import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import fastify, { type FastifyInstance } from 'fastify'
import { inject, injectable } from 'inversify'
import { ErrorHandler } from '../../../core/errors/ErrorHandler'
import { TYPES } from '../../../core/types'
import type { IAppLogger } from '../../logger/interfaces/ILogger'

@injectable()
export class HttpServer {
	private app: FastifyInstance
	private errorHandler: ErrorHandler

	constructor(@inject(TYPES.Logger) private readonly logger: IAppLogger) {
		this.app = fastify({
			logger: false, // We'll use our custom logger
			disableRequestLogging: true,
		})

		this.errorHandler = new ErrorHandler(this.logger)
		this.setupMiddleware()
		this.setupErrorHandler()
	}

	private setupMiddleware(): void {
		// CORS
		this.app.register(cors, {
			credentials: true,
			origin: true,
		})

		this.app.register(cookie, { hook: 'onRequest' })

		// Request logging middleware
		this.app.addHook('onRequest', (request, _, done) => {
			this.logger.info('Incoming request', {
				method: request.method,
				url: request.url,
				ip: request.ip,
				userAgent: request.headers['user-agent'],
			})
			done()
		})

		// Response logging middleware
		this.app.addHook('onResponse', (request, reply, done) => {
			this.logger.info('Request completed', {
				method: request.method,
				url: request.url,
				statusCode: reply.statusCode,
				responseTime: reply.elapsedTime,
			})
			done()
		})
	}

	private setupErrorHandler(): void {
		this.app.setErrorHandler(this.errorHandler.createErrorHandler())
	}

	public getApp(): FastifyInstance {
		return this.app
	}

	public async start(port: number = 3333): Promise<void> {
		try {
			await this.app.listen({ port, host: '0.0.0.0' })
			this.logger.info(`HTTP server started on port ${port}`)
		} catch (error) {
			this.logger.error('Failed to start HTTP server', { port, error })
			throw error
		}
	}

	public async stop(): Promise<void> {
		try {
			await this.app.close()
			this.logger.info('HTTP server stopped')
		} catch (error) {
			this.logger.error('Failed to stop HTTP server', { error })
			throw error
		}
	}

	// Health check endpoint
	public setupHealthCheck(): void {
		this.app.get('/health', async (request, reply) => {
			return {
				status: 'ok',
				timestamp: new Date().toISOString(),
				uptime: process.uptime(),
			}
		})
	}
}
