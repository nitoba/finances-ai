import { DiscordFinanceBot } from './discord-bot.js'
import { appLogger } from './lib/logger.js'
import { start as startWebServer } from './web-server.js'

async function main() {
	try {
		appLogger.info('🚀 Iniciando Finance AI - Bot Discord + Servidor Web')

		// Start web server for better-auth
		appLogger.info('📡 Iniciando servidor web...')
		await startWebServer()

		// Start Discord bot
		appLogger.info('🤖 Iniciando bot Discord...')
		const bot = new DiscordFinanceBot()
		await bot.start()

		appLogger.info('✅ Todos os serviços iniciados com sucesso!')
		appLogger.info(
			'💡 Usuários podem fazer login em: http://localhost:8080/login/discord',
		)
		appLogger.info('🎯 Bot Discord está ouvindo mensagens...')

		// Graceful shutdown
		const gracefulShutdown = async () => {
			appLogger.info('🛑 Parando todos os serviços...')
			await bot.stop()
			process.exit(0)
		}

		process.on('SIGINT', gracefulShutdown)
		process.on('SIGTERM', gracefulShutdown)
	} catch (error) {
		const err = error instanceof Error ? error.message : JSON.stringify(error)
		appLogger.error('❌ Erro ao iniciar aplicação:', err)
		process.exit(1)
	}
}

main()
