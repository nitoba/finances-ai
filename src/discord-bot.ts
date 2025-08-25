import { groq } from '@ai-sdk/groq'
import { stepCountIs, experimental_transcribe as transcribe } from 'ai'
import {
	Client,
	GatewayIntentBits,
	type Message,
	type OmitPartialGroupDMChannel,
	Partials,
} from 'discord.js'
import { setDiscordClient } from './lib/auth.js'
import { AuthService } from './lib/auth-service.js'
import { env } from './lib/env.js'
import { appLogger } from './lib/logger.js'
import { expenseAgent } from './mastra/agents/expense.agents.js'
import { MCPServerManager } from './mastra/mcp/mcp-server-manager.js'

await MCPServerManager.getInstance()

export class DiscordFinanceBot {
	private client: Client

	constructor() {
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

		this.setupEventListeners()
	}

	private setupEventListeners() {
		this.client.once('clientReady', () => {
			appLogger.info(`✅ Bot logado como ${this.client.user?.tag}!`)
			console.log('🚀 Bot conectado! Listening para mensagens...')
		})

		this.client.on('messageCreate', async (message) => {
			console.log('📨 Mensagem recebida:', {
				content: message.content,
				author: message.author.tag,
				channel: message.channel.type,
				guild: message.guild?.name,
			})

			if (message.author.bot) return

			// Handle audio attachments first
			if (message.attachments.size > 0) {
				for (const attachment of message.attachments.values()) {
					if (this.isAudioFile(attachment.name || '')) {
						await this.processAudioMessage(message, attachment.url)
						return // Process only audio, not text
					}
				}
			}

			// Handle any text message as a query to the assistant
			if (message.content.trim()) {
				await this.processTextQuery(message, message.content.trim())
			}
		})

		this.client.on('error', (error) => {
			appLogger.error('❌ Erro do Discord:', error.message)
		})
	}

	private isAudioFile(filename: string): boolean {
		const audioExtensions = [
			'.mp3',
			'.wav',
			'.ogg',
			'.m4a',
			'.aac',
			'.opus',
			'.webm',
		]
		return audioExtensions.some((ext) => filename.toLowerCase().endsWith(ext))
	}

	private async sendDirectMessage(
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
		} catch {
			appLogger.warn(
				`❌ Não foi possível enviar DM para ${message.author.tag}, enviando no canal`,
			)
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

	private async processTextQuery(
		message: OmitPartialGroupDMChannel<Message>,
		query: string,
	) {
		try {
			await message.channel.sendTyping()

			// Verificar autenticação
			const authCheck = await AuthService.checkAuthAndGetMessage(
				message.author.id,
			)

			if (!authCheck.isAuthenticated) {
				await this.sendDirectMessage(
					message,
					authCheck.message ?? 'Erro de autenticação',
				)
				return
			}

			const response = await expenseAgent.generateVNext([
				{
					role: 'system',
					content: `Você responde a esse usuário: 
						- ID: ${authCheck.userId}
						- Nome: ${authCheck.userName}
					`.trim(),
				},
				{
					role: 'user',
					content: query,
				},
			])

			const reply =
				response.text || 'Desculpe, não consegui processar sua solicitação.'

			await this.sendDirectMessage(message, reply)
		} catch (error) {
			const err = error instanceof Error ? error.message : JSON.stringify(error)
			appLogger.error('❌ Erro ao processar consulta de texto:', err)
			await message.reply(
				'❌ Ops! Ocorreu um erro ao processar sua mensagem. Tente novamente.',
			)
		}
	}

	private async processAudioMessage(
		message: OmitPartialGroupDMChannel<Message>,
		audioUrl: string,
	) {
		try {
			await message.channel.sendTyping()
			await message.react('🎧')

			appLogger.info('🎵 Processando áudio...')

			const audioResponse = await transcribe({
				model: groq.transcription('whisper-large-v3-turbo'),
				audio: new URL(audioUrl),
				providerOptions: { groq: { language: 'pt' } },
			})
			// Convert to text using Groq Whisper
			const transcription = audioResponse.text
			appLogger.info('📝 Transcrição:', transcription)

			if (!transcription?.trim()) {
				await message.reply(
					'❌ Não consegui entender o áudio. Tente novamente com uma gravação mais clara.',
				)
				return
			}

			// Verificar autenticação
			const authCheck = await AuthService.checkAuthAndGetMessage(
				message.author.id,
			)

			if (!authCheck.isAuthenticated) {
				await this.sendDirectMessage(
					message,
					authCheck.message ?? 'Erro de autenticação',
				)
				return
			}

			// Process with expense agent
			const response = await expenseAgent.generateVNext(
				[
					{
						role: 'system',
						content: `Você responde a esse usuário: 
						- ID: ${authCheck.userId}
						- Nome: ${authCheck.userName}
					`.trim(),
					},

					{
						role: 'user',
						content: transcription,
					},
				],
				{
					stopWhen: stepCountIs(10),
					modelSettings: {
						temperature: 0.1,
						maxRetries: 5,
					},
				},
			)

			const reply =
				response.text || 'Desculpe, não consegui processar sua solicitação.'

			// Add transcription info to response
			const fullReply = `🎤 **Você disse:** "${transcription}"\n\n${reply}`

			await this.sendDirectMessage(message, fullReply)

			await message.react('✅')
		} catch (error) {
			const err = error instanceof Error ? error.message : JSON.stringify(error)
			appLogger.error('❌ Erro ao processar áudio:', err)
			await message.reply(
				'❌ Ops! Ocorreu um erro ao processar seu áudio. Tente novamente.',
			)
			await message.react('❌')
		}
	}

	public async start() {
		try {
			await this.client.login(env.DISCORD_BOT_TOKEN)

			// Registrar o cliente Discord no sistema de autenticação
			setDiscordClient(this.client)

			appLogger.info('🚀 Bot do Discord iniciado com sucesso!')
		} catch (error) {
			const err = error instanceof Error ? error.message : JSON.stringify(error)
			appLogger.error('❌ Erro ao iniciar o bot:', err)
			process.exit(1)
		}
	}

	public async stop() {
		this.client.destroy()
		appLogger.info('🛑 Bot do Discord desconectado')
	}
}
