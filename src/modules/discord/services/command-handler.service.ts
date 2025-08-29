import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	type ChatInputCommandInteraction,
	EmbedBuilder,
	type Message,
	MessageFlags,
	type OmitPartialGroupDMChannel,
	SlashCommandBuilder,
} from 'discord.js'
import { inject, injectable } from 'inversify'
import { type IService, TYPES } from '../../../core/types'
import type { AuthService } from '../../auth/services/auth.service'
import type { ExpenseUseCase } from '../../expense/use-cases/expense.use-case'
import type { IAppLogger } from '../../logger/interfaces/ILogger'

export interface CommandResult {
	success: boolean
	message: string
	embed?: EmbedBuilder
	components?: ActionRowBuilder<ButtonBuilder>[]
}

@injectable()
export class CommandHandlerService implements IService {
	constructor(
		@inject(TYPES.Logger) private readonly logger: IAppLogger,
		@inject(TYPES.AuthService) private readonly authService: AuthService,
		@inject(TYPES.ExpenseUseCase)
		private readonly expenseUseCase: ExpenseUseCase,
	) {}

	async initialize(): Promise<void> {
		this.logger.info('Command handler service initialized')
	}

	async dispose(): Promise<void> {
		this.logger.info('Command handler service disposed')
	}

	// Handle slash commands
	async handleSlashCommand(
		interaction: ChatInputCommandInteraction,
	): Promise<void> {
		const { commandName, user } = interaction

		try {
			let result: CommandResult

			switch (commandName) {
				case 'login':
					result = await this.handleLoginCommand(user.id)
					break
				case 'logout':
					result = await this.handleLogoutCommand(user.id)
					break
				case 'despesas':
					result = await this.handleListExpensesCommand(interaction)
					break
				default:
					result = {
						success: false,
						message: '❌ Comando não reconhecido',
					}
			}

			const replyOptions: any = { flags: MessageFlags.Ephemeral }

			if (result.embed) {
				replyOptions.embeds = [result.embed]
			}
			if (result.message) {
				replyOptions.content = result.message
			}
			if (result.components) {
				replyOptions.components = result.components
			}

			await interaction.reply(replyOptions)
		} catch (error) {
			this.logger.error('Failed to handle slash command', {
				commandName,
				userId: user.id,
				error: error instanceof Error ? error.message : String(error),
			})

			await interaction.reply({
				content: '❌ Ocorreu um erro ao processar o comando. Tente novamente.',
				flags: MessageFlags.Ephemeral,
			})
		}
	}

	// Handle text commands (for backward compatibility)
	async handleTextCommand(
		message: OmitPartialGroupDMChannel<Message>,
		command: string,
		args: string[],
	): Promise<CommandResult> {
		const userId = message.author.id

		try {
			switch (command.toLowerCase()) {
				case 'login':
					return await this.handleLoginCommand(userId)
				case 'logout':
					return await this.handleLogoutCommand(userId)
				case 'despesas':
					return await this.handleListExpensesCommandFromText(args, userId)
				default:
					return {
						success: false,
						message: `❌ Comando \`${command}\` não reconhecido.\n\nComandos disponíveis:\n• \`/login\` - Fazer login\n• \`/logout\` - Fazer logout\n• \`/despesas\` - Listar suas despesas`,
					}
			}
		} catch (error) {
			this.logger.error('Failed to handle text command', {
				command,
				userId,
				error: error instanceof Error ? error.message : String(error),
			})

			return {
				success: false,
				message: '❌ Ocorreu um erro ao processar o comando. Tente novamente.',
			}
		}
	}

	private async handleLoginCommand(discordId: string): Promise<CommandResult> {
		try {
			const authCheck = await this.authService.checkAuthAndGetMessage(discordId)

			if (authCheck.isAuthenticated) {
				return {
					success: true,
					message: `✅ Você já está logado como **${authCheck.userName}**!`,
				}
			}

			const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3333'
			const loginUrl = `${baseUrl}/login/discord`

			const embed = new EmbedBuilder()
				.setColor('#5865F2')
				.setTitle('🔐 Login Necessário')
				.setDescription(
					'Para usar o bot de finanças, você precisa fazer login primeiro.\n\nClique no botão abaixo para fazer login com sua conta Discord.',
				)
				.setFooter({ text: 'Finances[AI] Bot • Seguro e confiável' })
				.setTimestamp()

			const loginButton = new ButtonBuilder()
				.setLabel('🔐 Fazer Login')
				.setStyle(ButtonStyle.Link)
				.setURL(loginUrl)

			const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
				loginButton,
			)

			return {
				success: true,
				message: '',
				embed,
				components: [row],
			}
		} catch (error) {
			this.logger.error('Login command failed', { discordId, error })
			return {
				success: false,
				message: '❌ Erro ao processar comando de login. Tente novamente.',
			}
		}
	}

	private async handleLogoutCommand(discordId: string): Promise<CommandResult> {
		try {
			const authCheck = await this.authService.checkAuthAndGetMessage(discordId)

			if (!authCheck.isAuthenticated) {
				return {
					success: false,
					message: '❌ Você não está logado.',
				}
			}

			const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3333'

			const logoutUrl = `${baseUrl}/logout/discord`

			const embed = new EmbedBuilder()
				.setColor('#FF6B6B')
				.setTitle('🚪 Logout')
				.setDescription(
					'Para fazer logout, acesse o link desconecte sua conta.\n\nClique no botão abaixo.',
				)
				.setFooter({ text: 'Finances[AI] Bot' })
				.setTimestamp()

			const logoutButton = new ButtonBuilder()
				.setLabel('Clique aqui para realizar o logout')
				.setStyle(ButtonStyle.Link)
				.setURL(logoutUrl)

			const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
				logoutButton,
			)

			return {
				success: true,
				message: '',
				embed,
				components: [row],
			}
		} catch (error) {
			this.logger.error('Logout command failed', { discordId, error })
			return {
				success: false,
				message: '❌ Erro ao processar comando de logout. Tente novamente.',
			}
		}
	}

	private async handleListExpensesCommand(
		interaction: ChatInputCommandInteraction,
	): Promise<CommandResult> {
		const userId = interaction.user.id
		const category = interaction.options.getString('categoria')
		const page = interaction.options.getInteger('pagina') || 1
		const limit = 10

		return this.listExpenses(userId, category, page, limit)
	}

	private async handleListExpensesCommandFromText(
		args: string[],
		discordId: string,
	): Promise<CommandResult> {
		let category: string | null = null
		let page = 1

		// Parse arguments
		for (let i = 0; i < args.length; i++) {
			const arg = args[i].toLowerCase()
			if (arg === '--categoria' || arg === '-c') {
				category = args[i + 1] || null
				i++
			} else if (arg === '--pagina' || arg === '-p') {
				page = parseInt(args[i + 1], 10) || 1
				i++
			}
		}

		return this.listExpenses(discordId, category, page, 10)
	}

	private async listExpenses(
		discordId: string,
		category: string | null,
		page: number,
		limit: number,
	): Promise<CommandResult> {
		try {
			const authCheck = await this.authService.checkAuthAndGetMessage(discordId)

			if (!authCheck.isAuthenticated) {
				return {
					success: false,
					message:
						authCheck.message ||
						'❌ Você precisa estar logado para ver suas despesas.',
				}
			}

			const offset = (page - 1) * limit
			const filters = {
				category: category || undefined,
				limit,
				offset,
			}

			const result = await this.expenseUseCase.getUserExpenses({
				userId: authCheck.userId || '',
				filters,
			})

			if (!result.success) {
				return {
					success: false,
					message: `❌ ${result.error || 'Erro ao buscar despesas'}`,
				}
			}

			const expenses = result.data || []

			if (expenses.length === 0) {
				const noExpensesMessage = category
					? `📝 Nenhuma despesa encontrada na categoria **${category}** (página ${page}).`
					: `📝 Nenhuma despesa encontrada (página ${page}).`

				return {
					success: true,
					message: noExpensesMessage,
				}
			}

			const embed = new EmbedBuilder()
				.setColor('#00D4AA')
				.setTitle('💰 Suas Despesas')
				.setDescription(
					category ? `Categoria: **${category}**` : 'Todas as categorias',
				)

			let totalAmount = 0
			let description = ''

			expenses.forEach((expense) => {
				const formatted = this.expenseUseCase.formatExpenseForDisplay(expense)
				totalAmount += expense.amount
				description += `${formatted.categoryLabel} **${formatted.description}**\n`
				description += `💰 ${formatted.formattedAmount} • 📅 ${formatted.date}\n\n`
			})

			embed.addFields(
				{
					name: '📋 Lista de Despesas',
					value: description || 'Nenhuma despesa encontrada',
					inline: false,
				},
				{
					name: '💵 Total desta página',
					value: `R$ ${totalAmount.toFixed(2)}`,
					inline: true,
				},
				{
					name: '📄 Página',
					value: `${page}`,
					inline: true,
				},
			)

			if (expenses.length === limit) {
				embed.setFooter({
					text: `Use /despesas pagina:${page + 1} para ver mais resultados`,
				})
			}

			embed.setTimestamp()

			return {
				success: true,
				message: '',
				embed,
			}
		} catch (error) {
			this.logger.error('List expenses command failed', {
				discordId,
				category,
				page,
				error,
			})
			return {
				success: false,
				message: '❌ Erro ao listar despesas. Tente novamente.',
			}
		}
	}

	// Get slash command definitions for registration
	static getSlashCommands() {
		return [
			new SlashCommandBuilder()
				.setName('login')
				.setDescription('Fazer login no bot de finanças'),

			new SlashCommandBuilder()
				.setName('logout')
				.setDescription('Fazer logout do bot de finanças'),

			new SlashCommandBuilder()
				.setName('despesas')
				.setDescription('Listar suas despesas com filtros e paginação')
				.addStringOption((option) =>
					option
						.setName('categoria')
						.setDescription('Filtrar por categoria')
						.setRequired(false)
						.addChoices(
							{ name: '🏠 Essenciais', value: 'essentials' },
							{ name: '🎉 Lazer', value: 'leisure' },
							{ name: '📈 Investimentos', value: 'investments' },
							{ name: '📚 Conhecimento', value: 'knowledge' },
							{ name: '🚨 Emergência', value: 'emergency' },
						),
				)
				.addIntegerOption((option) =>
					option
						.setName('pagina')
						.setDescription('Número da página (padrão: 1)')
						.setRequired(false)
						.setMinValue(1),
				),
		]
	}

	// Check if a message is a command
	isCommand(content: string): boolean {
		return content.startsWith('/') || content.startsWith('!')
	}

	// Parse command from message
	parseCommand(content: string): { command: string; args: string[] } {
		const cleanContent =
			content.startsWith('/') || content.startsWith('!')
				? content.slice(1)
				: content

		const parts = cleanContent.trim().split(/\s+/)
		const command = parts[0] || ''
		const args = parts.slice(1)

		return { command, args }
	}
}
