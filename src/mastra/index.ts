import { Mastra } from '@mastra/core/mastra'
import { LibSQLStore } from '@mastra/libsql'
import { PinoLogger } from '@mastra/loggers'
import { expenseAgent } from './agents/expense.agents'
import { MCPServerManager } from './mcp/mcp-server-manager'

await MCPServerManager.getInstance()

export const mastra = new Mastra({
	server: {
		port: 3333,
	},
	workflows: {},
	agents: {
		expense: expenseAgent,
	},
	storage: new LibSQLStore({
		url: ':memory:',
	}),
	logger: new PinoLogger({
		name: 'Finances [AI]',
		level: 'info',
	}),
})
