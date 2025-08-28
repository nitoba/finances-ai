import type { FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'
import type { IAppLogger } from '../../modules/logger/interfaces/ILogger'
import { AppError } from './AppError'

export class ErrorHandler {
	constructor(private readonly logger: IAppLogger) {}

	public handle(
		error: Error,
		request: FastifyRequest,
		reply: FastifyReply,
	): void {
		// Log the error with context
		this.logger.error('Request error', {
			error: error.message,
			stack: error.stack,
			url: request.url,
			method: request.method,
			userAgent: request.headers['user-agent'],
			ip: request.ip,
		})

		// Handle different error types
		if (error instanceof AppError) {
			this.handleAppError(error, reply)
		} else if (error instanceof ZodError) {
			this.handleValidationError(error, reply)
		} else {
			this.handleGenericError(error, reply)
		}
	}

	private handleAppError(error: AppError, reply: FastifyReply): void {
		const response = {
			error: {
				code: error.code,
				message: error.message,
				...(error.details && { details: error.details }),
			},
		}

		reply.status(error.statusCode).send(response)
	}

	private handleValidationError(error: ZodError, reply: FastifyReply): void {
		const response = {
			error: {
				code: 'VALIDATION_ERROR',
				message: 'Validation failed',
				details: error.errors.map((err) => ({
					field: err.path.join('.'),
					message: err.message,
					code: err.code,
				})),
			},
		}

		reply.status(422).send(response)
	}

	private handleGenericError(error: Error, reply: FastifyReply): void {
		const response = {
			error: {
				code: 'INTERNAL_ERROR',
				message:
					process.env.NODE_ENV === 'production'
						? 'Internal server error'
						: error.message,
			},
		}

		reply.status(500).send(response)
	}

	public createErrorHandler() {
		return (error: Error, request: FastifyRequest, reply: FastifyReply) => {
			this.handle(error, request, reply)
		}
	}
}
