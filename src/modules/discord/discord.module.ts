import { Module } from '../../core/container/module'
import { TYPES } from '../../core/types'
import { AuthModule } from '../auth/auth.module'
import { LoggerModule } from '../logger/logger.module'
import { PersistenceModule } from '../shared/persistence/persistence.module'
import { DiscordClientService } from '../shared/services/discord-client.service'
import { ExpenseAgentService } from '../shared/services/expense-agent.service'
import { AudioProcessingService } from './services/audio-processing.service'
import { DiscordBotHandlerService } from './services/discord-bot-handler.service'
import { MessageProcessingService } from './services/message-processing.service'
import { DiscordMessageUseCase } from './use-cases/discord-message.use-case'

@Module({
	imports: [LoggerModule, AuthModule, PersistenceModule],
	providers: [
		{
			provide: TYPES.DiscordClient,
			useClass: DiscordClientService,
		},

		{
			provide: TYPES.AudioProcessingService,
			useClass: AudioProcessingService,
		},
		{
			provide: TYPES.MessageProcessingService,
			useClass: MessageProcessingService,
		},
		{
			provide: TYPES.DiscordMessageUseCase,
			useClass: DiscordMessageUseCase,
		},
		{
			provide: TYPES.DiscordBotHandler,
			useClass: DiscordBotHandlerService,
		},
	],
	exports: [
		TYPES.DiscordClient,
		TYPES.ExpenseAgent,
		TYPES.MCPServerManager,
		TYPES.DiscordBotHandler,
		TYPES.AudioProcessingService,
		TYPES.MessageProcessingService,
		TYPES.DiscordMessageUseCase,
		DiscordClientService,
		ExpenseAgentService,
		DiscordBotHandlerService,
		AudioProcessingService,
		MessageProcessingService,
		DiscordMessageUseCase,
	],
})
export class DiscordModule {}
