import { inject, injectable } from 'inversify'
import { AppError } from '../../../core/errors/AppError'
import { TYPES } from '../../../core/types'
import type { AuthService } from '../../auth/services/auth.service'
import type { IAppLogger } from '../../logger/interfaces/ILogger'
import type { AudioProcessingService } from '../services/audio-processing.service'
import type { MessageProcessingService } from '../services/message-processing.service'
import type {
	IDiscordMessageUseCase,
	ProcessAudioInput,
	ProcessMessageInput,
} from '../types/discord-bot.types'

@injectable()
export class DiscordMessageUseCase implements IDiscordMessageUseCase {
	constructor(
		@inject(TYPES.Logger) private readonly logger: IAppLogger,
		@inject(TYPES.AuthService) private readonly authService: AuthService,
		@inject(TYPES.AudioProcessingService)
		private readonly audioProcessingService: AudioProcessingService,
		@inject(TYPES.MessageProcessingService)
		private readonly messageProcessingService: MessageProcessingService,
	) {}

	async handleTextMessage(input: ProcessMessageInput): Promise<void> {
		try {
			await input.message.channel.sendTyping()

			this.logger.info('Handling text message', {
				messageId: input.message.id,
				authorId: input.message.author.id,
				contentLength: input.content.length,
			})

			// Check authentication
			const authCheck = await this.authService.checkAuthAndGetMessage(
				input.message.author.id,
			)

			if (!authCheck.isAuthenticated) {
				await this.messageProcessingService.sendDirectMessage(
					input.message,
					authCheck.message ?? 'Erro de autenticação',
				)
				return
			}

			const { userId, userName } = authCheck

			// Process the message with authenticated user context
			const result = await this.messageProcessingService.processTextMessage(
				input,
				userId!,
				userName!,
			)

			if (!result.isSuccess) {
				throw new AppError(
					'MESSAGE_PROCESSING_FAILED',
					result.error ?? 'Falha no processamento da mensagem',
					500,
				)
			}

			await this.messageProcessingService.sendDirectMessage(
				input.message,
				result.response,
			)

			this.logger.info('Text message handled successfully', {
				messageId: input.message.id,
				userId: authCheck.userId,
			})
		} catch (error) {
			this.logger.error('Failed to handle text message', {
				messageId: input.message.id,
				authorId: input.message.author.id,
				error: error instanceof Error ? error.message : String(error),
			})

			await input.message.reply(
				'❌ Ops! Ocorreu um erro ao processar sua mensagem. Tente novamente.',
			)
		}
	}

	async handleAudioMessage(input: ProcessAudioInput): Promise<void> {
		try {
			await input.message.channel.sendTyping()
			await input.message.react('🎧')

			this.logger.info('Handling audio message', {
				messageId: input.message.id,
				authorId: input.message.author.id,
				audioUrl: input.audioUrl,
			})

			// Check authentication first
			const authCheck = await this.authService.checkAuthAndGetMessage(
				input.message.author.id,
			)

			if (!authCheck.isAuthenticated) {
				await this.messageProcessingService.sendDirectMessage(
					input.message,
					authCheck.message ?? 'Erro de autenticação',
				)
				return
			}

			// Process audio
			const audioResult = await this.audioProcessingService.processAudio(input)

			if (!audioResult.isSuccess) {
				await input.message.reply(
					audioResult.error ??
						'❌ Não consegui processar o áudio. Tente novamente.',
				)
				await input.message.react('❌')
				return
			}

			console.log(authCheck)

			// Process transcription with expense agent
			const messageResult =
				await this.messageProcessingService.processAudioTranscription(
					audioResult.transcription,
					authCheck.userId!,
					authCheck.userName!,
				)

			if (!messageResult.isSuccess) {
				throw new AppError(
					'AUDIO_MESSAGE_PROCESSING_FAILED',
					messageResult.error ?? 'Falha no processamento da transcrição',
					500,
				)
			}

			// Send response with transcription context
			const fullReply = `🎤 **Você disse:** "${audioResult.transcription}"\n\n${messageResult.response}`

			await this.messageProcessingService.sendDirectMessage(
				input.message,
				fullReply,
			)

			await input.message.react('✅')

			this.logger.info('Audio message handled successfully', {
				messageId: input.message.id,
				userId: authCheck.userId,
				transcriptionLength: audioResult.transcription.length,
			})
		} catch (error) {
			this.logger.error('Failed to handle audio message', {
				messageId: input.message.id,
				authorId: input.message.author.id,
				error: error instanceof Error ? error.message : String(error),
			})

			await input.message.reply(
				'❌ Ops! Ocorreu um erro ao processar seu áudio. Tente novamente.',
			)
			await input.message.react('❌')
		}
	}
}
