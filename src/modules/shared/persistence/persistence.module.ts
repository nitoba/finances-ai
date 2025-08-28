import { Module } from '../../../core/container/module'
import { TYPES } from '../../../core/types'
import { DatabaseService } from './services/database.service'

@Module({
	providers: [
		{ provide: TYPES.Database, useClass: DatabaseService, scope: 'singleton' },
		DatabaseService,
	],
	exports: [TYPES.Database, DatabaseService],
})
export class PersistenceModule {}
