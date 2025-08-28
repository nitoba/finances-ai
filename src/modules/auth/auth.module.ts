import { Module } from '../../core/container/module'
import { TYPES } from '../../core/types'
import { LoggerModule } from '../logger/logger.module'
import { PersistenceModule } from '../shared/persistence/persistence.module'

import { AuthRepository } from './repositories/auth.repository'
import { AuthService } from './services/auth.service'

@Module({
	imports: [PersistenceModule, LoggerModule],
	providers: [
		{ provide: TYPES.AuthRepository, useClass: AuthRepository },
		{ provide: TYPES.AuthService, useClass: AuthService },
		AuthRepository,
		AuthService,
	],
	exports: [
		TYPES.AuthService,
		TYPES.AuthRepository,
		AuthService,
		AuthRepository,
	],
})
export class AuthModule {}
