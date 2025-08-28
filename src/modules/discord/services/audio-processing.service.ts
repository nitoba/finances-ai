import { groq } from '@ai-sdk/groq'
import { experimental_transcribe as transcribe } from 'ai'
import { inject, injectable } from 'inversify'
import { TYPES } from '../../../core/types'
import type { IAppLogger } from '../../logger/interfaces/ILogger'
import type {
	AudioProcessingResult,
	IAudioProcessingService,
	ProcessAudioInput,
} from '../types/discord-bot.types'

@injectable()
export class AudioProcessingService implements IAudioProcessingService {
	private readonly audioExtensions = [
		'.mp3',
		'.wav',
		'.ogg',
		'.m4a',
		'.aac',
		'.opus',
		'.webm',
	]

	constructor(@inject(TYPES.Logger) private readonly logger: IAppLogger) {}

	isAudioFile(filename: string): boolean {
		return this.audioExtensions.some((ext) =>
			filename.toLowerCase().endsWith(ext),
		)
	}

	async processAudio(input: ProcessAudioInput): Promise<AudioProcessingResult> {
		try {
			this.logger.info('Processing audio file', {
				messageId: input.message.id,
				audioUrl: input.audioUrl,
			})

			const audioResponse = await transcribe({
				model: groq.transcription('whisper-large-v3-turbo'),
				audio: new URL(input.audioUrl),
				providerOptions: { groq: { language: 'pt' } },
			})

			const transcription = audioResponse.text

			if (!transcription?.trim()) {
				this.logger.warn('Empty transcription result', {
					messageId: input.message.id,
				})
				return {
					transcription: '',
					isSuccess: false,
					error:
						'Não consegui entender o áudio. Tente novamente com uma gravação mais clara.',
				}
			}

			this.logger.info('Audio transcription successful', {
				messageId: input.message.id,
				transcriptionLength: transcription.length,
			})

			return {
				transcription,
				isSuccess: true,
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error)
			this.logger.error('Audio processing failed', {
				messageId: input.message.id,
				error: errorMessage,
			})

			return {
				transcription: '',
				isSuccess: false,
				error: 'Erro ao processar o áudio. Tente novamente.',
			}
		}
	}
}
