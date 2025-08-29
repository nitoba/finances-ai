import { REST, Routes } from 'discord.js'
import { CommandHandlerService } from '../modules/discord/services/command-handler.service'
import { env } from '../modules/env'

async function registerCommands() {
	try {
		console.log('Started refreshing application (/) commands.')

		const commands = CommandHandlerService.getSlashCommands()

		const rest = new REST().setToken(env.DISCORD_BOT_TOKEN)

		// Register commands globally (for all guilds the bot is in)
		const data = await rest.put(
			Routes.applicationCommands(env.DISCORD_CLIENT_ID || ''),
			{ body: commands },
		)

		console.log(
			`Successfully reloaded ${Array.isArray(data) ? data.length : 0} application (/) commands.`,
		)
	} catch (error) {
		console.error('Error registering slash commands:', error)
	}
}

registerCommands()
