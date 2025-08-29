import {
	type ChatInputCommandInteraction,
	type Message,
	MessageFlags,
	type OmitPartialGroupDMChannel,
} from 'discord.js'
import { inject, injectable } from 'inversify'
import { type IService, TYPES } from '../../../core/types'
import type { IAppLogger } from '../../logger/interfaces/ILogger'
import type { DiscordClientService } from '../../shared/services/discord-client.service'
import type { DiscordMessageUseCase } from '../use-cases/discord-message.use-case'
import type { AudioProcessingService } from './audio-processing.service'
import type { CommandHandlerService } from './command-handler.service'

@injectable()
export class DiscordBotHandlerService implements IService {
	constructor(
		@inject(TYPES.Logger) private readonly logger: IAppLogger,
		@inject(TYPES.DiscordClient)
		private readonly discordClient: DiscordClientService,
		@inject(TYPES.AudioProcessingService)
		private readonly audioProcessingService: AudioProcessingService,
		@inject(TYPES.DiscordMessageUseCase)
		private readonly messageUseCase: DiscordMessageUseCase,
		@inject(TYPES.CommandHandlerService)
		private readonly commandHandler: CommandHandlerService,
	) {}

	async initialize(): Promise<void> {
		this.discordClient.initialize()
		this.setupEventListeners()
		this.logger.info('Discord bot handler initialized')
	}

	private setupEventListeners(): void {
		const client = this.discordClient.getClient()

		client.on('messageCreate', async (message) => {
			await this.handleMessage(message)
		})

		client.on('interactionCreate', async (interaction) => {
			if (!interaction.isChatInputCommand()) return
			await this.handleSlashCommand(interaction)
		})
	}

	private async handleMessage(
		message: OmitPartialGroupDMChannel<Message>,
	): Promise<void> {
		try {
			// Ignore bot messages
			if (message.author.bot) return

			// Only process DM messages, ignore guild/channel messages
			if (message.guild !== null) {
				this.logger.debug('Ignoring guild message', {
					messageId: message.id,
					guildId: message.guild.id,
					guildName: message.guild.name,
					channelType: message.channel.type,
				})
				return
			}

			this.logger.info('DM message received', {
				messageId: message.id,
				authorId: message.author.id,
				authorTag: message.author.tag,
				channelType: message.channel.type,
				hasAttachments: message.attachments.size > 0,
				contentLength: message.content.length,
			})

			// Handle audio attachments first
			if (message.attachments.size > 0) {
				for (const attachment of message.attachments.values()) {
					if (
						attachment.name &&
						this.audioProcessingService.isAudioFile(attachment.name)
					) {
						await this.messageUseCase.handleAudioMessage({
							message,
							audioUrl: attachment.url,
						})
						return // Process only audio, not text
					}
				}
			}

			// Handle text messages
			if (message.content.trim()) {
				const content = message.content.trim()

				// Check if it's a command first
				if (this.commandHandler.isCommand(content)) {
					const { command, args } = this.commandHandler.parseCommand(content)
					const result = await this.commandHandler.handleTextCommand(
						message,
						command,
						args,
					)

					const replyOptions: any = {}

					if (result.embed) {
						replyOptions.embeds = [result.embed]
					}
					if (result.message) {
						replyOptions.content = result.message
					}
					if (result.components) {
						replyOptions.components = result.components
					}

					await message.reply(replyOptions)
					return
				}

				// Otherwise, handle as regular AI message
				await this.messageUseCase.handleTextMessage({
					message,
					content,
				})
			}
		} catch (error) {
			this.logger.error('Failed to handle message', {
				messageId: message.id,
				authorId: message.author.id,
				error: error instanceof Error ? error.message : String(error),
			})

			// Try to send error message to user
			try {
				await message.reply(
					'❌ Ocorreu um erro inesperado. Nossa equipe foi notificada.',
				)
			} catch (replyError) {
				this.logger.error('Failed to send error reply', {
					messageId: message.id,
					error:
						replyError instanceof Error
							? replyError.message
							: String(replyError),
				})
			}
		}
	}

	private async handleSlashCommand(
		interaction: ChatInputCommandInteraction,
	): Promise<void> {
		try {
			await this.commandHandler.handleSlashCommand(interaction)
		} catch (error) {
			this.logger.error('Failed to handle slash command', {
				commandName: interaction.commandName,
				userId: interaction.user.id,
				error: error instanceof Error ? error.message : String(error),
			})

			if (!interaction.replied) {
				await interaction.reply({
					content:
						'❌ Ocorreu um erro ao processar o comando. Tente novamente.',
					flags: MessageFlags.Ephemeral,
				})
			}
		}
	}

	async start(): Promise<void> {
		await this.discordClient.start()
		this.logger.info('Discord bot started successfully')
	}

	async stop(): Promise<void> {
		await this.discordClient.stop()
		this.logger.info('Discord bot stopped')
	}

	async dispose(): Promise<void> {
		await this.stop()
	}
}
