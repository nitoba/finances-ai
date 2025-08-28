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
}
