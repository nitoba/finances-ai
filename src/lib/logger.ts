import pino, {
	type Logger,
	type LoggerOptions,
	type ParseLogFnArgs,
} from 'pino'

// Interfaces para tipagem
interface DatabaseLogData {
	operation: string
	table: string
	duration?: string
	error?: Error | null
}

interface PerformanceLogData {
	operation: string
	duration: string
	[key: string]: unknown
}

interface SecurityLogData {
	event: string
	user?: string | null
	ip?: string | null
	[key: string]: unknown
}

interface BusinessLogData {
	event: string
	user?: string | null
	[key: string]: unknown
}

interface RequestLogData {
	req: Partial<{ method: string; url: string }>
	res: Partial<{ statusCode: number }>
	responseTime?: string
}

interface BaseLogData {
	env: string
	version: string
}

interface AppLoggerConfig {
	level?: string
	environment?: 'development' | 'production' | 'test'
	version?: string
}

// Configurações do Pino para desenvolvimento
const developmentConfig: LoggerOptions = {
	level: process.env.LOG_LEVEL || 'info',
	transport: {
		target: 'pino-pretty',
		options: {
			colorize: true,
			translateTime: 'SYS:dd-mm-yyyy HH:MM:ss',
			ignore: 'pid,hostname',
			levelFirst: true,
			singleLine: false,
		},
	},
	base: {
		env: process.env.NODE_ENV || 'development',
		version: process.env.npm_package_version || '1.0.0',
	} as BaseLogData,
	serializers: {
		req: pino.stdSerializers.req,
		res: pino.stdSerializers.res,
		err: pino.stdSerializers.err,
	},
}

// Configurações do Pino para produção
const productionConfig: LoggerOptions = {
	level: process.env.LOG_LEVEL || 'warn',
	base: {
		env: process.env.NODE_ENV || 'production',
		version: process.env.npm_package_version || '1.0.0',
	} as BaseLogData,
	serializers: {
		req: pino.stdSerializers.req,
		res: pino.stdSerializers.res,
		err: pino.stdSerializers.err,
	},
}

// Factory para criar loggers
function createLogger(config?: AppLoggerConfig): Logger {
	const environment =
		config?.environment || process.env.NODE_ENV || 'development'
	const loggerConfig =
		environment === 'production' ? productionConfig : developmentConfig

	if (config?.level) {
		loggerConfig.level = config.level
	}

	if (config?.version) {
		;(loggerConfig.base as BaseLogData).version = config.version
	}

	return pino(loggerConfig)
}

// Logger principal (removido pois não é usado)
// const logger = createLogger()

// Tipo para dados de log genéricos
type LogData = Record<string, unknown>

// Interface para Child Logger
interface ChildLogger {
	debug<TMsg>(
		obj: LogData,
		msg?: string,
		...args: ParseLogFnArgs<TMsg> | []
	): void
	debug<TMsg>(msg: string, ...args: ParseLogFnArgs<TMsg> | []): void
	info<TMsg>(
		obj: LogData,
		msg?: string,
		...args: ParseLogFnArgs<TMsg> | []
	): void
	info<TMsg>(msg: string, ...args: ParseLogFnArgs<TMsg> | []): void
	warn<TMsg>(
		obj: LogData,
		msg?: string,
		...args: ParseLogFnArgs<TMsg> | []
	): void
	warn<TMsg>(msg: string, ...args: ParseLogFnArgs<TMsg> | []): void
	error<TMsg>(
		obj: LogData,
		msg?: string,
		...args: ParseLogFnArgs<TMsg> | []
	): void
	error<TMsg>(msg: string, ...args: ParseLogFnArgs<TMsg> | []): void
	fatal<TMsg>(
		obj: LogData,
		msg?: string,
		...args: ParseLogFnArgs<TMsg> | []
	): void
	fatal<TMsg>(msg: string, ...args: ParseLogFnArgs<TMsg> | []): void
}

// Interface principal do AppLogger
interface IAppLogger {
	// Métodos básicos com overloads
	debug<TMsg>(
		obj: LogData,
		msg?: string,
		...args: ParseLogFnArgs<TMsg> | []
	): void
	debug<TMsg>(msg: string, ...args: ParseLogFnArgs<TMsg> | []): void
	info<TMsg>(
		obj: LogData,
		msg?: string,
		...args: ParseLogFnArgs<TMsg> | []
	): void
	info<TMsg>(msg: string, ...args: ParseLogFnArgs<TMsg> | []): void
	warn<TMsg>(
		obj: LogData,
		msg?: string,
		...args: ParseLogFnArgs<TMsg> | []
	): void
	warn<TMsg>(msg: string, ...args: ParseLogFnArgs<TMsg> | []): void
	error<TMsg>(
		obj: LogData,
		msg?: string,
		...args: ParseLogFnArgs<TMsg> | []
	): void
	error<TMsg>(msg: string, ...args: ParseLogFnArgs<TMsg> | []): void
	fatal<TMsg>(
		obj: LogData,
		msg?: string,
		...args: ParseLogFnArgs<TMsg> | []
	): void
	fatal<TMsg>(msg: string, ...args: ParseLogFnArgs<TMsg> | []): void

	// Métodos especializados
	request(
		req: Partial<{ method: string; url: string }>,
		res: Partial<{ statusCode: number }>,
		responseTime?: number,
	): void
	database(
		operation: string,
		table: string,
		duration?: number,
		error?: Error | null,
	): void
	performance(operation: string, duration: number, metadata?: LogData): void
	security(
		event: string,
		user?: string | null,
		ip?: string | null,
		details?: LogData,
	): void
	business(event: string, user?: string | null, data?: LogData): void

	// Child logger
	child(bindings: LogData): ChildLogger
}

// Implementação do AppLogger
class AppLogger implements IAppLogger {
	private logger: Logger

	constructor(config?: AppLoggerConfig) {
		this.logger = createLogger(config)
	}

	debug<TMsg>(
		obj: LogData | string,
		msg?: string,
		...args: ParseLogFnArgs<TMsg> | []
	): void {
		if (typeof obj === 'string') {
			this.logger.debug(obj, ...args)
		} else {
			this.logger.debug(obj, msg)
		}
	}

	info<TMsg>(
		obj: LogData | string,
		msg?: string,
		...args: ParseLogFnArgs<TMsg> | []
	): void {
		if (typeof obj === 'string') {
			this.logger.info(obj, ...args)
		} else {
			this.logger.info(obj, msg)
		}
	}

	warn<TMsg>(
		obj: LogData | string,
		msg?: string,
		...args: ParseLogFnArgs<TMsg> | []
	): void {
		if (typeof obj === 'string') {
			this.logger.warn(obj, ...args)
		} else {
			this.logger.warn(obj, msg)
		}
	}

	error<TMsg>(
		obj: LogData | string,
		msg?: string,
		...args: ParseLogFnArgs<TMsg> | []
	): void {
		if (typeof obj === 'string') {
			this.logger.error(obj, ...args)
		} else {
			this.logger.error(obj, msg)
		}
	}

	fatal<TMsg>(
		obj: LogData | string,
		msg?: string,
		...args: ParseLogFnArgs<TMsg> | []
	): void {
		if (typeof obj === 'string') {
			this.logger.fatal(obj, ...args)
		} else {
			this.logger.fatal(obj, msg)
		}
	}

	// Métodos especializados
	request(
		req: Partial<{ method: string; url: string }>,
		res: Partial<{ statusCode: number }>,
		responseTime?: number,
	): void {
		const logData: RequestLogData = {
			req,
			res,
			responseTime: responseTime ? `${responseTime}ms` : undefined,
		}

		this.logger.info(
			logData,
			`${req.method || 'UNKNOWN'} ${req.url || 'UNKNOWN'} - ${res.statusCode || 'UNKNOWN'}`,
		)
	}

	database(
		operation: string,
		table: string,
		duration?: number,
		error?: Error | null,
	): void {
		const logData: DatabaseLogData = {
			operation,
			table,
			duration: duration ? `${duration}ms` : undefined,
			error,
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
		metadata: LogData = {},
	): void {
		const logData: PerformanceLogData = {
			operation,
			duration: `${duration}ms`,
			...metadata,
		}

		this.logger.info(logData, `Performance: ${operation} took ${duration}ms`)
	}

	security(
		event: string,
		user?: string | null,
		ip?: string | null,
		details: LogData = {},
	): void {
		const logData: SecurityLogData = {
			event,
			user,
			ip,
			...details,
		}

		this.logger.warn(logData, `Security event: ${event}`)
	}

	business(event: string, user?: string | null, data: LogData = {}): void {
		const logData: BusinessLogData = {
			event,
			user,
			...data,
		}

		this.logger.info(logData, `Business event: ${event}`)
	}

	// Child logger
	child(bindings: LogData): ChildLogger {
		const childLogger = this.logger.child(bindings)

		return {
			debug: <TMsg>(
				obj: LogData | string,
				msg?: string,
				...args: ParseLogFnArgs<TMsg> | []
			) => {
				if (typeof obj === 'string') {
					childLogger.debug(obj, ...args)
				} else {
					childLogger.debug(obj, msg)
				}
			},
			info: <TMsg>(
				obj: LogData | string,
				msg?: string,
				...args: ParseLogFnArgs<TMsg> | []
			) => {
				if (typeof obj === 'string') {
					childLogger.info(obj, ...args)
				} else {
					childLogger.info(obj, msg)
				}
			},
			warn: <TMsg>(
				obj: LogData | string,
				msg?: string,
				...args: ParseLogFnArgs<TMsg> | []
			) => {
				if (typeof obj === 'string') {
					childLogger.warn(obj, ...args)
				} else {
					childLogger.warn(obj, msg)
				}
			},
			error: <TMsg>(
				obj: LogData | string,
				msg?: string,
				...args: ParseLogFnArgs<TMsg> | []
			) => {
				if (typeof obj === 'string') {
					childLogger.error(obj, ...args)
				} else {
					childLogger.error(obj, msg)
				}
			},
			fatal: <TMsg>(
				obj: LogData | string,
				msg?: string,
				...args: ParseLogFnArgs<TMsg> | []
			) => {
				if (typeof obj === 'string') {
					childLogger.fatal(obj, ...args)
				} else {
					childLogger.fatal(obj, msg)
				}
			},
		}
	}
}

// Instância padrão do logger
const appLogger = new AppLogger()

// Função para criar novos loggers com configuração específica
export const createAppLogger = (config?: AppLoggerConfig): AppLogger => {
	return new AppLogger(config)
}

// Exports
export {
	AppLogger,
	type IAppLogger,
	type LogData,
	type AppLoggerConfig,
	appLogger,
}
export type {
	DatabaseLogData,
	PerformanceLogData,
	SecurityLogData,
	BusinessLogData,
	RequestLogData,
	ChildLogger,
}
