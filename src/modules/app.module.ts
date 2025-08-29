import { Module } from '../core/container/module'
import { TYPES } from '../core/types'
import { AuthModule } from './auth/auth.module'
import { DiscordModule } from './discord/discord.module'
import { ExpenseModule } from './expense/expense.module'
import { LoggerModule } from './logger/logger.module'
import { PersistenceModule } from './shared/persistence/persistence.module'
import { HttpServer } from './shared/services/http-server'
import { NotificationService } from './shared/services/notification.service'
import { SharedModule } from './shared/shared.module'

@Module({
	imports: [
		PersistenceModule,
		LoggerModule,
		AuthModule,
		ExpenseModule,
		DiscordModule,
		SharedModule,
	],
	providers: [
		{ provide: TYPES.HttpServer, useClass: HttpServer, scope: 'singleton' },
		HttpServer,
		NotificationService,
	],
	exports: [
		TYPES.HttpServer,
		TYPES.NotificationService,
		HttpServer,
		NotificationService,
	],
})
export class AppModule {}
