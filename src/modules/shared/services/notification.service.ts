import { and, eq } from 'drizzle-orm'
import { inject, injectable } from 'inversify'
import { TYPES } from '../../../core/types'
import type { IAppLogger } from '../../logger/interfaces/ILogger'
import { users } from '../persistence/schemas/auth-schema'
import type { DatabaseService } from '../persistence/services/database.service'
import type { DiscordClientService } from './discord-client.service'

@injectable()
export class NotificationService {
	constructor(
		@inject(TYPES.Database)
		private readonly databaseService: DatabaseService<
			typeof import('../persistence/schemas/auth-schema')
		>,
		@inject(TYPES.DiscordClient)
		private readonly discordClient: DiscordClientService,
		@inject(TYPES.Logger) private readonly logger: IAppLogger,
	) {}

	async notifyUserLoginSuccess(userId: string) {
		try {
			// Buscar o Discord ID do usuário a partir do userId do banco
			const { accounts } = await import('../persistence/schemas/auth-schema')

			const account = await this.databaseService
				.getConnection()
				.select({
					accountId: accounts.accountId,
					userName: users.name,
				})
				.from(accounts)
				.innerJoin(users, eq(users.id, userId))
				.where(
					and(eq(accounts.userId, userId), eq(accounts.providerId, 'discord')),
				)
				.limit(1)

			if (!account[0]?.accountId) {
				this.logger.error(
					'❌ Não foi possível encontrar o Discord ID do usuário',
				)
				return
			}

			// Tentar enviar DM para o usuário
			const discordUser = await this.discordClient
				.getClient()
				.users.fetch(account[0].accountId)
			if (discordUser) {
				await discordUser.send(`🎉 **Login realizado com sucesso!**

Olá ${account[0]?.userName}! Sua conta Discord foi conectada ao sistema de finanças.

Agora você pode conversar comigo normalmente e eu vou ajudar com suas finanças! 💰

Digite qualquer mensagem para começar! 🚀`)

				this.logger.info('✅ Notificação enviada via DM para:', {
					nome: account[0]?.userName,
				})
			}
		} catch (error) {
			this.logger.error('❌ Erro ao enviar notificação via Discord:', { error })
			// Não falha silenciosamente - o login ainda funciona mesmo se a DM falhar
		}
	}
}
