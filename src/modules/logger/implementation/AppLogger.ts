import { injectable } from 'inversify'
import pino from 'pino'
import type { IAppLogger } from '../interfaces/ILogger'

@injectable()
export class AppLogger implements IAppLogger {
	private logger: pino.Logger

	constructor() {
		this.logger = pino({
			level: process.env.LOG_LEVEL || 'info',
			transport:
				process.env.NODE_ENV !== 'production'
					? {
							target: 'pino-pretty',
							options: {
								colorize: true,
								translateTime: 'SYS:dd-mm-yyyy HH:MM:ss',
								ignore: 'pid,hostname',
								levelFirst: true,
								singleLine: false,
							},
						}
					: undefined,
			base: {
				env: process.env.NODE_ENV || 'development',
				version: process.env.npm_package_version || '1.0.0',
			},
		})
	}

	debug(message: string, meta?: Record<string, unknown>): void {
		this.logger.debug(meta || {}, message)
	}

	info(message: string, meta?: Record<string, unknown>): void {
		this.logger.info(meta || {}, message)
	}

	warn(message: string, meta?: Record<string, unknown>): void {
		this.logger.warn(meta || {}, message)
	}

	error(message: string, meta?: Record<string, unknown>): void {
		this.logger.error(meta || {}, message)
	}

	fatal(message: string, meta?: Record<string, unknown>): void {
		this.logger.fatal(meta || {}, message)
	}

	request(
		req: { method: string; url: string },
		res: { statusCode: number },
		responseTime?: number,
	): void {
		this.logger.info(
			{
				req,
				res,
				responseTime: responseTime ? `${responseTime}ms` : undefined,
			},
			`${req.method} ${req.url} - ${res.statusCode}`,
		)
	}

	database(
		operation: string,
		table: string,
		duration?: number,
		error?: Error | null,
	): void {
		const logData = {
			operation,
			table,
			duration: duration ? `${duration}ms` : undefined,
			error: error?.message,
		}

		if (error) {
			this.logger.error(logData, `Database ${operation} failed on ${table}`)
		} else {
			this.logger.info(logData, `Database ${operation} on ${table}`)
		}
	}

	performance(
		operation: string,
		duration: number,
		metadata?: Record<string, unknown>,
	): void {
		this.logger.info(
			{
				operation,
				duration: `${duration}ms`,
				...metadata,
			},
			`Performance: ${operation} took ${duration}ms`,
		)
	}

	security(
		event: string,
		user?: string | null,
		ip?: string | null,
		details?: Record<string, unknown>,
	): void {
		this.logger.warn(
			{
				event,
				user,
				ip,
				...details,
			},
			`Security event: ${event}`,
		)
	}

	business(
		event: string,
		user?: string | null,
		data?: Record<string, unknown>,
	): void {
		this.logger.info(
			{
				event,
				user,
				...data,
			},
			`Business event: ${event}`,
		)
	}

	child(bindings: Record<string, unknown>): IAppLogger {
		const childLogger = this.logger.child(bindings)
		const childAppLogger = new AppLogger()
		childAppLogger.logger = childLogger
		return childAppLogger
	}
}
