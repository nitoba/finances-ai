import { Module } from '../../core/container/module'
import { TYPES } from '../../core/types'
import { AuthModule } from '../auth/auth.module'
import { LoggerModule } from '../logger/logger.module'
import { PersistenceModule } from '../shared/persistence/persistence.module'
import { ExpenseRepository } from './repositories/expense.repository'
import { ExpenseUseCase } from './use-cases/expense.use-case'

@Module({
	imports: [PersistenceModule, AuthModule, LoggerModule],
	providers: [
		{ provide: TYPES.ExpenseRepository, useClass: ExpenseRepository },
		{ provide: TYPES.ExpenseUseCase, useClass: ExpenseUseCase },
		ExpenseRepository,

		ExpenseUseCase,
	],
	exports: [
		TYPES.ExpenseRepository,
		TYPES.ExpenseUseCase,
		ExpenseRepository,
		ExpenseUseCase,
	],
})
export class ExpenseModule {}
