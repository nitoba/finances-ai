import { Client, GatewayIntentBits, Partials } from 'discord.js'
import { inject, injectable } from 'inversify'
import { type IService, TYPES } from '../../../core/types'
import { env } from '../../env'
import type { IAppLogger } from '../../logger/interfaces/ILogger'

@injectable()
export class DiscordClientService implements IService {
	private client: Client

	constructor(@inject(TYPES.Logger) private readonly logger: IAppLogger) {
		this.client = new Client({
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.MessageContent,
				GatewayIntentBits.GuildVoiceStates,
				GatewayIntentBits.DirectMessages,
				GatewayIntentBits.DirectMessageReactions,
			],
			partials: [Partials.Message, Partials.Channel, Partials.Reaction],
		})
	}

	async initialize(): Promise<void> {
		this.setupEventListeners()
		this.logger.info('Discord client initialized')
	}

	private setupEventListeners(): void {
		this.client.once('clientReady', () => {
			this.logger.info(`✅ Discord bot logged in as ${this.client.user?.tag}`)
		})

		this.client.on('error', (error) => {
			this.logger.error('Discord client error', { error: error.message })
		})
	}

	async start(): Promise<void> {
		try {
			const token = env.DISCORD_BOT_TOKEN
			if (!token) {
				throw new Error('DISCORD_BOT_TOKEN is required')
			}

			await this.client.login(token)
			this.logger.info('Discord client started successfully')
		} catch (error) {
			this.logger.error('Failed to start Discord client', { error })
			throw error
		}
	}

	async stop(): Promise<void> {
		this.client.destroy()
		this.logger.info('Discord client stopped')
	}

	getClient(): Client {
		return this.client
	}

	async dispose(): Promise<void> {
		await this.stop()
	}
}
