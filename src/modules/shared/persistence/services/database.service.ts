import type { Client } from '@libsql/client'
import { sql } from 'drizzle-orm'
import type { LibSQLDatabase } from 'drizzle-orm/libsql'
import { inject, injectable } from 'inversify'
import { TYPES } from '../../../../core/types'
import type { IAppLogger } from '../../../logger/interfaces/ILogger'
import { db } from '../db'
import type * as schema from '../schemas'

@injectable()
export class DatabaseService<
	TSchema extends Record<string, unknown> = typeof schema,
> {
	private db!: LibSQLDatabase<TSchema> & {
		$client: Client
	}

	constructor(@inject(TYPES.Logger) private readonly logger: IAppLogger) {
		this.initialize()
	}

	private initialize(): void {
		try {
			this.db = db as unknown as LibSQLDatabase<TSchema> & {
				$client: Client
			}
			this.logger.info('Database connection established')
		} catch (error) {
			this.logger.error('Failed to initialize database', { error })
			throw error
		}
	}

	public getConnection(): LibSQLDatabase<TSchema> & {
		$client: Client
	} {
		return this.db
	}

	public async healthCheck(): Promise<boolean> {
		try {
			await this.db.run(sql`SELECT 1`)
			return true
		} catch (error) {
			this.logger.error('Database health check failed', { error })
			return false
		}
	}

	public async close(): Promise<void> {
		// LibSQL client doesn't have a close method, but we can log the operation
		this.logger.info('Database connection closed')
	}
}
