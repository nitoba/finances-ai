// biome-ignore lint/style/useImportType: <explanation>
import { IAppError } from '../types'

export class AppError extends Error implements IAppError {
	public readonly code: string
	public readonly statusCode: number
	public readonly details?: Record<string, unknown>

	constructor(
		code: string,
		message: string,
		statusCode: number = 500,
		details?: Record<string, unknown>,
	) {
		super(message)
		this.name = 'AppError'
		this.code = code
		this.statusCode = statusCode
		this.details = details

		// Maintains proper stack trace for where our error was thrown
		Error.captureStackTrace(this, this.constructor)
	}

	// Predefined error types
	static badRequest(
		message: string,
		details?: Record<string, unknown>,
	): AppError {
		return new AppError('BAD_REQUEST', message, 400, details)
	}

	static unauthorized(message: string = 'Unauthorized'): AppError {
		return new AppError('UNAUTHORIZED', message, 401)
	}

	static forbidden(message: string = 'Forbidden'): AppError {
		return new AppError('FORBIDDEN', message, 403)
	}

	static notFound(message: string = 'Resource not found'): AppError {
		return new AppError('NOT_FOUND', message, 404)
	}

	static conflict(
		message: string,
		details?: Record<string, unknown>,
	): AppError {
		return new AppError('CONFLICT', message, 409, details)
	}

	static validationError(
		message: string,
		details?: Record<string, unknown>,
	): AppError {
		return new AppError('VALIDATION_ERROR', message, 422, details)
	}

	static internal(message: string = 'Internal server error'): AppError {
		return new AppError('INTERNAL_ERROR', message, 500)
	}

	static database(
		message: string,
		details?: Record<string, unknown>,
	): AppError {
		return new AppError('DATABASE_ERROR', message, 500, details)
	}

	static externalService(
		message: string,
		details?: Record<string, unknown>,
	): AppError {
		return new AppError('EXTERNAL_SERVICE_ERROR', message, 502, details)
	}
}
