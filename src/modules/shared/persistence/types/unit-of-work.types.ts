import type { LibSQLTransaction } from 'drizzle-orm/libsql'

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type TransactionScope = LibSQLTransaction<any, any>

// Interface base para resultados de operações
export type OperationResult<T> =
	| {
			success: true
			data: T
			error?: never
	  }
	| {
			success: false
			data?: never
			error: Error
	  }

export type TransactionalOperation<TReturn = void> = (
	transaction: TransactionScope,
) => Promise<TReturn>
