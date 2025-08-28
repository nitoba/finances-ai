import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { getService } from '../../../../core/container/module'
import { TYPES } from '../../../../core/types'
import { env } from '../../../env'
import { db } from '../../../shared/persistence/db'
import type { NotificationService } from '../../../shared/services/notification.service'

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
					const noficiationService = getService<NotificationService>(
						TYPES.NotificationService,
					)

					await noficiationService.notifyUserLoginSuccess(userId)
				},
			},
		},
	},
	trustedOrigins: ['http://localhost:3333'],
})
