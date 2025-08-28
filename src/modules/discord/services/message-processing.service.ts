import { stepCountIs } from 'ai'
import type { Message, OmitPartialGroupDMChannel } from 'discord.js'
import { inject, injectable } from 'inversify'
import { TYPES } from '../../../core/types'
import type { IAppLogger } from '../../logger/interfaces/ILogger'
import type { ExpenseAgentService } from '../../shared/services/expense-agent.service'
import type {
	IMessageProcessingService,
	MessageProcessingResult,
	ProcessMessageInput,
} from '../types/discord-bot.types'

@injectable()
export class MessageProcessingService implements IMessageProcessingService {
	constructor(
		@inject(TYPES.Logger) private readonly logger: IAppLogger,
		@inject(TYPES.ExpenseAgent)
		private readonly expenseAgent: ExpenseAgentService,
	) {}

	async processTextMessage(
		input: ProcessMessageInput,
		userId: string,
		userName: string,
	): Promise<MessageProcessingResult> {
		try {
			this.logger.info('Processing text message', {
				messageId: input.message.id,
				contentLength: input.content.length,
			})

			const agent = this.expenseAgent.getAgent()
			const response = await agent.generateVNext([
				{
					role: 'system',
					content: `Você responde a esse usuário: 
						- ID: ${userId}
						- Nome: ${userName}
					`.trim(),
				},
				{
					role: 'user',
					content: input.content,
				},
			])

			const reply =
				response.text || 'Desculpe, não consegui processar sua solicitação.'

			this.logger.info('Text message processing successful', {
				messageId: input.message.id,
				responseLength: reply.length,
			})

			return {
				response: reply,
				isSuccess: true,
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error)
			this.logger.error('Text message processing failed', {
				messageId: input.message.id,
				error: errorMessage,
			})

			return {
				response:
					'Ops! Ocorreu um erro ao processar sua mensagem. Tente novamente.',
				isSuccess: false,
				error: errorMessage,
			}
		}
	}

	async processAudioTranscription(
		transcription: string,
		userId: string,
		userName: string,
	): Promise<MessageProcessingResult> {
		try {
			this.logger.info('Processing audio transcription', {
				transcriptionLength: transcription.length,
				userId,
			})

			const agent = this.expenseAgent.getAgent()
			const response = await agent.generateVNext(
				[
					{
						role: 'system',
						content: `Você responde a esse usuário: 
						- ID: ${userId}
						- Nome: ${userName}
					`.trim(),
					},
					{
						role: 'user',
						content: transcription,
					},
				],
				{
					stopWhen: stepCountIs(20),
					modelSettings: {
						temperature: 0.1,
						maxRetries: 5,
					},
				},
			)

			const reply =
				response.text || 'Desculpe, não consegui processar sua solicitação.'

			this.logger.info('Audio transcription processing successful', {
				responseLength: reply.length,
				userId,
			})

			return {
				response: reply,
				isSuccess: true,
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error)
			this.logger.error('Audio transcription processing failed', {
				userId,
				error: errorMessage,
			})

			return {
				response:
					'Ops! Ocorreu um erro ao processar sua mensagem. Tente novamente.',
				isSuccess: false,
				error: errorMessage,
			}
		}
	}

	async streamTextMessage(
		input: ProcessMessageInput,
		userId: string,
		userName: string,
	): Promise<void> {
		try {
			this.logger.info('Streaming text message', {
				messageId: input.message.id,
				contentLength: input.content.length,
			})

			const agent = this.expenseAgent.getAgent()
			const stream = await agent.streamVNext([
				{
					role: 'system',
					content: `Você responde a esse usuário: 
						- ID: ${userId}
						- Nome: ${userName}
					`.trim(),
				},
				{
					role: 'user',
					content: input.content,
				},
			])

			// Send initial message to Discord
			const initialMessage = await this.sendDirectMessageAndReturn(
				input.message,
				'💬 _Processando..._',
			)
			let accumulatedText = ''
			let lastUpdateTime = Date.now()
			const UPDATE_INTERVAL = 50 // Update every 2 seconds

			// Stream the response
			for await (const chunk of stream.textStream) {
				accumulatedText += chunk
				await this.updateDiscordMessage(initialMessage, accumulatedText)

				// Update Discord message every 2 seconds to avoid rate limits
				const now = Date.now()
				if (now - lastUpdateTime > UPDATE_INTERVAL && accumulatedText.trim()) {
					lastUpdateTime = now
				}
			}

			// Final update with complete text
			const finalText =
				accumulatedText.trim() ||
				'Desculpe, não consegui processar sua solicitação.'
			await this.updateDiscordMessage(initialMessage, finalText)

			this.logger.info('Text message streaming successful', {
				messageId: input.message.id,
				finalLength: finalText.length,
			})
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error)
			this.logger.error('Text message streaming failed', {
				messageId: input.message.id,
				error: errorMessage,
			})

			await input.message.reply(
				'❌ Ops! Ocorreu um erro ao processar sua mensagem. Tente novamente.',
			)
		}
	}

	async streamAudioTranscription(
		transcription: string,
		userId: string,
		userName: string,
		message: OmitPartialGroupDMChannel<Message>,
	): Promise<void> {
		try {
			this.logger.info('Streaming audio transcription', {
				transcriptionLength: transcription.length,
				userId,
			})

			const agent = this.expenseAgent.getAgent()
			const stream = await agent.streamVNext(
				[
					{
						role: 'system',
						content: `Você responde a esse usuário: 
						- ID: ${userId}
						- Nome: ${userName}
					`.trim(),
					},
					{
						role: 'user',
						content: transcription,
					},
				],
				{
					stopWhen: stepCountIs(20),
					modelSettings: {
						temperature: 0.1,
						maxRetries: 5,
					},
				},
			)

			// Send initial message with transcription
			const transcriptionHeader = `🎤 **Você disse:** "${transcription}"\n\n💬 _Processando resposta..._`
			const initialMessage = await this.sendDirectMessageAndReturn(
				message,
				transcriptionHeader,
			)

			let accumulatedText = ''
			let lastUpdateTime = Date.now()
			const UPDATE_INTERVAL = 2000 // Update every 2 seconds

			// Stream the response
			for await (const chunk of stream.textStream) {
				accumulatedText += chunk

				// Update Discord message every 2 seconds to avoid rate limits
				const now = Date.now()
				if (now - lastUpdateTime > UPDATE_INTERVAL && accumulatedText.trim()) {
					const fullResponse = `🎤 **Você disse:** "${transcription}"\n\n${accumulatedText}`
					await this.updateDiscordMessage(initialMessage, fullResponse)
					lastUpdateTime = now
				}
			}

			// Final update with complete text
			const finalText =
				accumulatedText.trim() ||
				'Desculpe, não consegui processar sua solicitação.'
			const fullFinalResponse = `🎤 **Você disse:** "${transcription}"\n\n${finalText}`
			await this.updateDiscordMessage(initialMessage, fullFinalResponse)

			this.logger.info('Audio transcription streaming successful', {
				responseLength: finalText.length,
				userId,
			})
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error)
			this.logger.error('Audio transcription streaming failed', {
				userId,
				error: errorMessage,
			})

			await message.reply(
				'❌ Ops! Ocorreu um erro ao processar sua transcrição. Tente novamente.',
			)
		}
	}

	async sendDirectMessage(
		message: OmitPartialGroupDMChannel<Message>,
		content: string,
	): Promise<void> {
		try {
			if (content.length > 2000) {
				const chunks = content.match(/[\s\S]{1,2000}/g) || []
				for (const chunk of chunks) {
					await message.author.send(chunk)
				}
			} else {
				await message.author.send(content)
			}

			this.logger.info('Direct message sent successfully', {
				messageId: message.id,
				recipientId: message.author.id,
				contentLength: content.length,
			})
		} catch (error) {
			this.logger.warn('Failed to send direct message, sending in channel', {
				messageId: message.id,
				recipientId: message.author.id,
				error: error instanceof Error ? error.message : String(error),
			})

			// Fallback to channel message
			if (content.length > 2000) {
				const chunks = content.match(/[\s\S]{1,2000}/g) || []
				for (const chunk of chunks) {
					await message.reply(chunk)
				}
			} else {
				await message.reply(
					`🔒 Não consegui te enviar uma mensagem privada. Aqui está sua resposta:\n\n${content}`,
				)
			}
		}
	}

	private async sendDirectMessageAndReturn(
		message: OmitPartialGroupDMChannel<Message>,
		content: string,
	): Promise<Message> {
		try {
			// Try to send DM first
			const sentMessage = await message.author.send(content)
			return sentMessage
		} catch (error) {
			this.logger.warn('Failed to send direct message, sending in channel', {
				messageId: message.id,
				recipientId: message.author.id,
				error: error instanceof Error ? error.message : String(error),
			})

			// Fallback to channel message
			const fallbackContent = `🔒 Não consegui te enviar uma mensagem privada. Aqui está sua resposta:\n\n${content}`
			return await message.reply(fallbackContent)
		}
	}

	private async updateDiscordMessage(
		messageToUpdate: Message,
		newContent: string,
	): Promise<void> {
		try {
			// Discord has a 2000 character limit
			if (newContent.length > 2000) {
				newContent = `${newContent.substring(0, 1997)}...`
			}

			await messageToUpdate.edit(newContent)
		} catch (error) {
			this.logger.warn('Failed to update Discord message', {
				messageId: messageToUpdate.id,
				error: error instanceof Error ? error.message : String(error),
			})
		}
	}
}
