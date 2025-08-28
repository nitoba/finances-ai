import { Module } from '../../core/container/module'
import { TYPES } from '../../core/types'
import { LoggerModule } from '../logger/logger.module'
import { PersistenceModule } from './persistence/persistence.module'
import { ExpenseAgentService } from './services/expense-agent.service'
import { MCPServerManagerService } from './services/mcp-server-manager.service'
import { NotificationService } from './services/notification.service'

@Module({
	imports: [LoggerModule, PersistenceModule],
	providers: [
		{
			provide: TYPES.ExpenseAgent,
			useClass: ExpenseAgentService,
		},
		{
			provide: TYPES.MCPServerManager,
			useClass: MCPServerManagerService,
			scope: 'singleton',
		},
		{
			provide: TYPES.NotificationService,
			useClass: NotificationService,
		},
	],
	exports: [
		TYPES.DiscordClient,
		TYPES.ExpenseAgent,
		TYPES.MCPServerManager,
		TYPES.NotificationService,
		ExpenseAgentService,
		MCPServerManagerService,
		NotificationService,
	],
})
export class SharedModule {}
