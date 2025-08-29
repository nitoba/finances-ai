import { EmbedBuilder } from 'discord.js'
import { and, eq } from 'drizzle-orm'
import { inject, injectable } from 'inversify'
import { AppError } from '../../../core/errors/AppError'
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

	private async getDiscordIdByUserId(userId: string) {
		const { accounts } = await import('../persistence/schemas/auth-schema')

		const [account] = await this.databaseService
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

		if (!account?.accountId) {
			this.logger.error('❌ Não foi possível encontrar o Discord ID do usuário')
			throw new AppError(
				'NOT FOUND',
				'❌ Não foi possível encontrar o Discord ID do usuário',
			)
		}

		return account
	}

	async notifyUserLoginSuccess(userId: string) {
		try {
			// Buscar o Discord ID do usuário a partir do userId do banco
			const account = await this.getDiscordIdByUserId(userId)
			// Tentar enviar DM para o usuário
			const discordUser = await this.discordClient
				.getClient()
				.users.fetch(account.accountId)
			if (discordUser) {
				const embed = new EmbedBuilder()
					.setColor('#00D4AA')
					.setTitle('🎉 Login realizado com sucesso!')
					.setDescription(
						`Olá **${account?.userName}**! Sua conta Discord foi conectada ao sistema de finanças.\n\nAgora você pode conversar comigo normalmente e eu vou ajudar com suas finanças! 💰\n\nDigite qualquer mensagem para começar! 🚀`,
					)
					.setFooter({ text: 'Finances[AI] Bot • Bem-vindo!' })
					.setTimestamp()

				await discordUser.send({ embeds: [embed] })

				this.logger.info('✅ Notificação enviada via DM para:', {
					nome: account?.userName,
				})
			}
		} catch (error) {
			this.logger.error('❌ Erro ao enviar notificação via Discord:', {
				error,
			})
			// Não falha silenciosamente - o login ainda funciona mesmo se a DM falhar
		}
	}

	async notifyUserLogoutSuccess(userId: string) {
		try {
			// Buscar o Discord ID do usuário a partir do userId do banco
			const account = await this.getDiscordIdByUserId(userId)
			// Tentar enviar DM para o usuário
			const discordUser = await this.discordClient
				.getClient()
				.users.fetch(account.accountId)
			if (discordUser) {
				const embed = new EmbedBuilder()
					.setColor('#FF6B6B')
					.setTitle('👋 Logout realizado com sucesso!')
					.setDescription(
						`Até logo **${account?.userName}**! Você saiu da sua conta do sistema de finanças.\n\nSua sessão foi encerrada com segurança. Para acessar novamente, faça login através do bot! 🔐\n\nObrigado por usar o Finances[AI]! 💙`,
					)
					.setFooter({ text: 'Finances[AI] Bot • Até a próxima!' })
					.setTimestamp()

				await discordUser.send({ embeds: [embed] })

				this.logger.info('✅ Notificação enviada via DM para:', {
					nome: account?.userName,
				})
			}
		} catch (error) {
			this.logger.error('❌ Erro ao enviar notificação via Discord:', {
				error,
			})
			// Não falha silenciosamente - o login ainda funciona mesmo se a DM falhar
		}
	}
}
