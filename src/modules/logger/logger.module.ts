import { Module } from '../../core/container/module'
import { TYPES } from '../../core/types'
import { AppLogger } from './implementation/AppLogger'

@Module({
	providers: [
		{ provide: TYPES.Logger, useClass: AppLogger, scope: 'singleton' },
		AppLogger,
	],
	exports: [TYPES.Logger, AppLogger],
})
export class LoggerModule {}
