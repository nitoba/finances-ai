import { inject, injectable } from 'inversify'
import { AppError } from '../../../core/errors/AppError'
import { TYPES } from '../../../core/types'
import type { IAppLogger } from '../../logger/interfaces/ILogger'
import type { AuthRepository } from '../repositories/auth.repository'

export interface AuthCheckResult {
	isAuthenticated: boolean
	userId?: string
	userName?: string
	message?: string
}

@injectable()
export class AuthService {
	constructor(
		@inject(TYPES.AuthRepository)
		private readonly authRepository: AuthRepository,
		@inject(TYPES.Logger) private readonly logger: IAppLogger,
	) {}

	async checkAuthAndGetMessage(discordId: string): Promise<AuthCheckResult> {
		try {
			const session = await this.authRepository.getUserSession(discordId)

			if (!session) {
				return {
					isAuthenticated: false,
					message: `🔐 **Você precisa fazer login primeiro!**

Para usar o bot, faça login com sua conta Discord:
👉 	[REALIZAR LOGIN](${this.getLoginUrl()})

Após o login, volte aqui e envie seu comando novamente.`,
				}
			}

			return {
				isAuthenticated: true,
				userId: session.userId,
				userName: session.userName || 'Usuário',
				message: `✅ Autenticado como ${session.userName || 'Usuário'}`,
			}
		} catch (error) {
			this.logger.error('Auth check failed', { discordId, error })
			return {
				isAuthenticated: false,
				message: '❌ Erro ao verificar autenticação. Tente novamente.',
			}
		}
	}

	private getLoginUrl(): string {
		const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3333'
		return `${baseUrl}/login/discord`
	}

	async getUserById(userId: string) {
		try {
			const user = await this.authRepository.findById(userId)

			if (!user) {
				throw AppError.notFound('User not found')
			}

			return user
		} catch (error) {
			this.logger.error('Failed to get user by ID', { userId, error })
			throw error
		}
	}

	async getUserByDiscordId(discordId: string) {
		try {
			const user = await this.authRepository.findUserByDiscordId(discordId)

			if (!user) {
				throw AppError.notFound('User not found')
			}

			return user
		} catch (error) {
			this.logger.error('Failed to get user by Discord ID', {
				discordId,
				error,
			})
			throw error
		}
	}
}
