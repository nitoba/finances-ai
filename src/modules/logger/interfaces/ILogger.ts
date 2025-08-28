export interface IAppLogger {
	debug(message: string, meta?: Record<string, unknown>): void
	info(message: string, meta?: Record<string, unknown>): void
	warn(message: string, meta?: Record<string, unknown>): void
	error(message: string, meta?: Record<string, unknown>): void
	fatal(message: string, meta?: Record<string, unknown>): void

	// Specialized logging methods
	request(
		req: { method: string; url: string },
		res: { statusCode: number },
		responseTime?: number,
	): void

	database(
		operation: string,
		table: string,
		duration?: number,
		error?: Error | null,
	): void

	performance(
		operation: string,
		duration: number,
		metadata?: Record<string, unknown>,
	): void

	security(
		event: string,
		user?: string | null,
		ip?: string | null,
		details?: Record<string, unknown>,
	): void

	business(
		event: string,
		user?: string | null,
		data?: Record<string, unknown>,
	): void

	child(bindings: Record<string, unknown>): IAppLogger
}
