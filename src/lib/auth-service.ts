/** biome-ignore-all lint/complexity/noStaticOnlyClass: Service class with static methods */
import { and, eq } from 'drizzle-orm'
import { db } from './db/db'
import { accounts } from './db/schemas/auth-schema'
import { users } from './schemas/auth-schema'

type Response = {
	userId: string
	userName: string
}

export class AuthService {
	/**
	 * Verifica se um usuário Discord está autenticado no sistema
	 * @param discordUserId - ID do usuário no Discord
	 * @returns Promise<string | null> - Retorna o userId do sistema se autenticado, null caso contrário
	 */
	static async getUserByDiscordId(
		discordUserId: string,
	): Promise<Response | null> {
		try {
			const account = await db
				.select({
					userId: accounts.userId,
					userName: users.name,
				})
				.from(accounts)
				.innerJoin(users, eq(users.id, accounts.userId))
				.where(
					and(
						eq(accounts.accountId, discordUserId),
						eq(accounts.providerId, 'discord'),
					),
				)
				.limit(1)

			if (account.length === 0) {
				return null
			}

			return {
				userId: account[0].userId,
				userName: account[0].userName,
			}
		} catch (error) {
			console.error('Erro ao verificar usuário Discord:', error)
			return null
		}
	}

	/**
	 * Gera o link de login com Discord
	 */
	static getLoginUrl(): string {
		const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:8080'
		return `${baseUrl}/login/discord`
	}

	/**
	 * Verifica se o usuário está autenticado e retorna mensagem apropriada
	 */
	static async checkAuthAndGetMessage(discordUserId: string): Promise<{
		isAuthenticated: boolean
		userId?: string
		userName?: string
		message?: string
	}> {
		const user = await AuthService.getUserByDiscordId(discordUserId)

		if (!user) {
			return {
				isAuthenticated: false,
				message: `🔐 **Você precisa fazer login primeiro!**

Para usar o bot, faça login com sua conta Discord:
👉 	[REALIZAR LOGIN](${AuthService.getLoginUrl()})

Após o login, volte aqui e envie seu comando novamente.`,
			}
		}

		return {
			isAuthenticated: true,
			...user,
		}
	}
}
