import type { Tool } from '@mastra/core'
import { MCPClient } from '@mastra/mcp'
import { inject, injectable } from 'inversify'
import z from 'zod'
import { type IService, TYPES } from '../../../core/types'
import { env } from '../../env'
import type { IAppLogger } from '../../logger/interfaces/ILogger'

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

@injectable()
export class MCPServerManagerService implements IService {
	private client: MCPClient | null = null

	private organizedTools: MCPServerTools = {
		dbTools: {},
	}

	constructor(@inject(TYPES.Logger) private readonly logger: IAppLogger) {}

	async initialize(): Promise<void> {
		try {
			this.createAndInitializeClient()
		} catch (error) {
			this.logger.error('Failed to initialize MCP Server Manager', { error })
			throw error
		}
	}

	getToolsByServer(serverName: string) {
		switch (serverName) {
			case 'db':
				return this.organizedTools.dbTools
			default:
				break
		}
	}

	private async createAndInitializeClient(): Promise<void> {
		try {
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

			this.logger.info(
				`${Object.keys(this.organizedTools.dbTools).length} Ferramentas`,
			)

			this.logger.info('MCPClient inicializado com sucesso')
		} catch (error) {
			this.logger.error('Erro ao criar/inicializar MCPClient:')
			throw error
		}
	}

	async dispose(): Promise<void> {
		this.logger.info('MCP Server Manager disposed')
	}
}
