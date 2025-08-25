import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { createAuthMiddleware } from 'better-auth/api'
import type { Client } from 'discord.js'
import { db } from './db/db'
import { users } from './db/schemas'
import { env } from './env'

let discordClient: Client | null = null

export const setDiscordClient = (client: Client) => {
	discordClient = client
}

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'sqlite',
		usePlural: true,
	}),
	socialProviders: {
		discord: {
			clientId: env.DISCORD_CLIENT_ID,
			clientSecret: env.DISCORD_CLIENT_SECRET,
		},
	},
	databaseHooks: {
		account: {
			create: {
				after: async ({ userId }) => {
					await notifyUserLoginSuccess(userId)
				},
			},
		},
		session: {},
	},

	trustedOrigins: ['http://localhost:8080'],
})

async function notifyUserLoginSuccess(userId: string) {
	try {
		if (!discordClient) {
			console.log(
				'❌ Discord client não está disponível para enviar notificação',
			)
			return
		}

		// Buscar o Discord ID do usuário a partir do userId do banco
		const { accounts } = await import('./db/schemas/auth-schema.js')
		const { eq, and } = await import('drizzle-orm')

		const account = await db
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
			console.log('❌ Não foi possível encontrar o Discord ID do usuário')
			return
		}

		// Tentar enviar DM para o usuário
		const discordUser = await discordClient.users.fetch(account[0].accountId)
		if (discordUser) {
			await discordUser.send(`🎉 **Login realizado com sucesso!**

Olá ${account[0]?.userName}! Sua conta Discord foi conectada ao sistema de finanças.

Agora você pode conversar comigo normalmente e eu vou ajudar com suas finanças! 💰

Digite qualquer mensagem para começar! 🚀`)

			console.log('✅ Notificação enviada via DM para:', account[0]?.userName)
		}
	} catch (error) {
		console.error('❌ Erro ao enviar notificação via Discord:', error)
		// Não falha silenciosamente - o login ainda funciona mesmo se a DM falhar
	}
}
