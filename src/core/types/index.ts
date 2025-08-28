import 'reflect-metadata'

// Service identifiers for dependency injection
export const TYPES = {
	// Core services
	Logger: Symbol.for('Logger'),
	Database: Symbol.for('Database'),
	Config: Symbol.for('Config'),

	// Auth services
	AuthService: Symbol.for('AuthService'),
	AuthRepository: Symbol.for('AuthRepository'),

	// Expense services
	ExpenseRepository: Symbol.for('ExpenseRepository'),
	ExpenseUseCase: Symbol.for('ExpenseUseCase'),

	// External services
	DiscordClient: Symbol.for('DiscordClient'),
	ExpenseAgent: Symbol.for('ExpenseAgent'),
	MCPServerManager: Symbol.for('MCPServerManager'),
	NotificationService: Symbol.for('NotificationService'),

	// Discord bot services
	DiscordBotHandler: Symbol.for('DiscordBotHandler'),
	MessageProcessingService: Symbol.for('MessageProcessingService'),
	AudioProcessingService: Symbol.for('AudioProcessingService'),
	DiscordMessageUseCase: Symbol.for('DiscordMessageUseCase'),

	// HTTP services
	HttpServer: Symbol.for('HttpServer'),
	RouteHandler: Symbol.for('RouteHandler'),
} as const

// Common interfaces
export interface IService {
	initialize(): Promise<void>
	dispose(): Promise<void>
}

export interface IUseCase<TInput, TOutput> {
	execute(input: TInput): Promise<TOutput>
}

// Error types
export interface IAppError {
	code: string
	message: string
	statusCode: number
	details?: Record<string, unknown>
}
