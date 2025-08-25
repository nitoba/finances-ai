import type { Tool } from '@mastra/core'
import { MCPClient } from '@mastra/mcp'
import z from 'zod'
import { env } from '../../lib/env'
import { appLogger, type LogData } from '../../lib/logger'

/**
 * Schema para informações de ferramentas MCP
 */
export const MCPToolInfoSchema = z.object({
	name: z.string(),
	description: z.string().optional(),
	mcpServer: z.enum(['mysql', 'chart', 'browser', 'excel']),
	tool: z.record(z.string(), z.any()),
})

export type MCPToolInfo = z.infer<typeof MCPToolInfoSchema>

/**
 * Schema para ferramentas organizadas por servidor MCP
 */
export const MCPServerToolsSchema = z.object({
	dbTools: z.record(z.string(), z.any()),
})

export type MCPServerTools = z.infer<typeof MCPServerToolsSchema>

/**
 * Exceção para erros de inicialização do MCP
 */
export class MCPInitializationError extends Error {
	constructor(
		message: string,
		public cause?: Error,
	) {
		super(message)
		this.name = 'MCPInitializationError'
	}
}

/**
 * Exceção para quando o servidor MCP não está pronto
 */
export class MCPServerNotReadyError extends Error {
	constructor(message = 'MCP Server is not ready. Call initialize() first.') {
		super(message)
		this.name = 'MCPServerNotReadyError'
	}
}

/**
 * Gerenciador de servidores MCP para o agente Mari
 *
 * Responsável por:
 * - Inicializar e gerenciar conexões com servidores MCP
 * - Organizar ferramentas por tipo de servidor
 * - Fornecer interface unificada para acesso às ferramentas
 */
export class MCPServerManager {
	private static instance: MCPServerManager | null = null

	private client: MCPClient | null = null
	private organizedTools: MCPServerTools = {
		dbTools: {},
	}
	private initialized = false
	private initializationError: MCPInitializationError | null = null
	private requiredServers: Set<string> = new Set(['db']) // MySQL sempre necessário

	private constructor() {}

	/**
	 * Obtém a instância singleton do MCPServerManager
	 */
	static async getInstance(): Promise<MCPServerManager> {
		if (MCPServerManager.instance) {
			return MCPServerManager.instance
		}

		MCPServerManager.instance = new MCPServerManager()
		try {
			await MCPServerManager.instance.initialize()
			return MCPServerManager.instance
		} catch (error) {
			MCPServerManager.instance = null
			throw error
		}
	}

	/**
	 * Inicializa os servidores MCP conforme a configuração
	 */
	private async initialize(): Promise<void> {
		if (this.initialized) {
			if (this.initializationError) {
				throw this.initializationError
			}
			return
		}

		try {
			appLogger.info('Iniciando MCPServerManager...')

			// Cria uma única instância do MCPClient com todos os servidores necessários
			await this.createAndInitializeClient()

			this.initialized = true

			this.logToolsSummary()
		} catch (error) {
			try {
				await this.cleanup()
			} catch (cleanupError) {
				appLogger.error(
					cleanupError as LogData,
					'Erro durante cleanup após falha na inicialização:',
				)
			}

			this.initializationError = new MCPInitializationError(
				'Falha ao inicializar servidores MCP',
				error instanceof Error ? error : new Error(String(error)),
			)
			throw this.initializationError
		}
	}

	/**
	 * Cria e inicializa o cliente MCP com todos os servidores necessários
	 */
	private async createAndInitializeClient(): Promise<void> {
		try {
			appLogger.info(
				'Criando instância MCPClient com servidores:',
				Array.from(this.requiredServers).join(', '),
			)

			// Configuração dos servidores
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			const serversConfig: Record<string, any> = {}

			// MySQL sempre necessário
			serversConfig.db = {
				command: 'pnpm',
				args: ['exec', 'mcp-libsql', '--url', env.DATABASE_URL],
				env: {
					LIBSQL_AUTH_TOKEN: env.DATABASE_AUTH_TOKEN,
				},
			}

			// Cria única instância do cliente
			this.client = new MCPClient({
				id: 'mcp-manager', // ID único fixo
				servers: serversConfig,
			})

			const toolsById = (await this.client.getTools()) as Record<string, Tool>

			for (const [key, tool] of Object.entries(toolsById)) {
				// Determinar o servidor baseado no nome da ferramenta e configuração
				let serverType: 'db' | null = null

				if (
					key.startsWith('db_') ||
					key.includes('query') ||
					key.includes('sql')
				) {
					serverType = 'db'
				} else {
					// Fallback: tentar pelo prefixo original
					const [server] = key.split('_', 2)
					serverType = server as 'db'
				}

				if (serverType) {
					const toolServerName = `${serverType}Tools` as const
					this.organizedTools[toolServerName] = {
						...this.organizedTools[toolServerName],
						[key]: tool,
					}
				}
			}

			appLogger.info('MCPClient inicializado com sucesso')
		} catch (error) {
			appLogger.error(error as LogData, 'Erro ao criar/inicializar MCPClient:')
			throw error
		}
	}

	/**
	 * Retorna todas as ferramentas disponíveis
	 */
	getAllTools(): Tool[] {
		this.ensureReady()

		// TODO: Converter MCPToolInfo para Tool do Mastra
		const allTools: Tool[] = []

		// Adicionar todas as ferramentas
		// Object.values(this.organizedTools).forEach((serverTools) => {
		// allTools.push(...serverTools.map(this.convertMCPToolToMastraTool));
		// })

		return allTools
	}

	/**
	 * Retorna as ferramentas organizadas por servidor
	 */
	getOrganizedTools(): MCPServerTools {
		this.ensureReady()
		return { ...this.organizedTools }
	}

	/**
	 * Retorna ferramentas de um servidor específico
	 */
	getToolsByServer(
		serverType: 'db',
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	): Record<string, any> {
		this.ensureReady()

		switch (serverType) {
			case 'db':
				return this.organizedTools.dbTools
			default:
				return {}
		}
	}

	/**
	 * Verifica se o servidor está pronto para uso
	 */
	isReady(): boolean {
		return this.initialized && this.initializationError === null
	}

	/**
	 * Retorna o erro de inicialização, se houver
	 */
	getInitializationError(): MCPInitializationError | null {
		return this.initializationError
	}

	/**
	 * Limpa recursos e fecha conexões
	 */
	async cleanup(): Promise<void> {
		try {
			if (this.client) {
				appLogger.info('Fechando conexão com MCPClient...')
				await this.client.disconnect()
				this.client = null
			}

			// Limpa as ferramentas
			this.organizedTools = {
				dbTools: {},
			}

			this.initialized = false
			this.initializationError = null

			appLogger.info('MCPServerManager limpo com sucesso')
		} catch (error) {
			appLogger.error(error as LogData, 'Erro ao limpar MCPServerManager:')
			throw error
		}
	}

	/**
	 * Assegura que o servidor está pronto
	 */
	private ensureReady(): void {
		if (!this.isReady()) {
			throw new MCPServerNotReadyError()
		}
	}

	/**
	 * Loga resumo das ferramentas disponíveis
	 */
	private logToolsSummary(): void {
		const summary = {
			db: Object.keys(this.organizedTools.dbTools).length,
		}

		for (const [server, count] of Object.entries(summary)) {
			appLogger.info(`Servidor ${server.toUpperCase()}: ${count} ferramentas`)
		}
	}
}
