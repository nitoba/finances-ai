import {
	and,
	asc,
	count,
	desc,
	eq,
	type InferSelectModel,
	isNull,
	type SQL,
} from 'drizzle-orm'
import type { LibSQLDatabase } from 'drizzle-orm/libsql'
import type {
	AnySQLiteColumn,
	AnySQLiteTable,
	SQLiteInsertValue,
} from 'drizzle-orm/sqlite-core'
import type { DefaultModel } from '../../core/model/default.model'
import type {
	PaginatedResult,
	PaginationParams,
} from '../types/repository.types'
import type { TransactionScope } from '../types/unit-of-work.types'

export abstract class DrizzleDefaultRepository<
	M extends DefaultModel<M>,
	T extends AnySQLiteTable & {
		id: AnySQLiteColumn
		createdAt: AnySQLiteColumn
		updatedAt: AnySQLiteColumn
		deletedAt?: AnySQLiteColumn
	},
	TSchema extends Record<string, unknown> = {},
> {
	constructor(
		protected readonly db: LibSQLDatabase<NonNullable<TSchema>>,
		protected readonly table: T,
	) {}

	// Método interno para executar operações com ou sem transação
	private async executeOperation<TResult>(
		operation: (
			client: LibSQLDatabase<NonNullable<TSchema>> | TransactionScope,
		) => Promise<TResult>,
		transaction?: TransactionScope,
	): Promise<TResult> {
		return operation(transaction || this.db)
	}

	// Métodos públicos principais - mantendo a interface original
	async create(
		data: Omit<M, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>,
		transaction?: TransactionScope,
	): Promise<M> {
		const operation = async (
			client: LibSQLDatabase<TSchema> | TransactionScope,
		) => {
			const now = new Date()
			const dataToInsert = {
				...data,
				createdAt: now,
				updatedAt: now,
				deletedAt: null,
			} as SQLiteInsertValue<T>

			const [result] = await client
				.insert(this.table)
				.values(dataToInsert)
				.returning()

			if (!result) {
				throw new Error('Failed to create record')
			}

			return this.mapToModel(result as InferSelectModel<T>)
		}

		return this.executeOperation(operation, transaction)
	}

	async update(
		id: string,
		data: Partial<Omit<M, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>>,
		transaction?: TransactionScope,
	): Promise<M> {
		const operation = async (
			client: LibSQLDatabase<TSchema> | TransactionScope,
		) => {
			const [result] = await client
				.update(this.table)
				.set({
					...data,
					updatedAt: new Date(),
				} as SQLiteInsertValue<T>)
				.where(eq(this.table.id, id))
				.returning()

			if (!result) {
				throw new Error(`Record with id ${id} not found`)
			}

			return this.mapToModel(result as InferSelectModel<T>)
		}

		return this.executeOperation(operation, transaction)
	}

	async findById(
		id: string,
		transaction?: TransactionScope,
	): Promise<M | null> {
		const operation = async (
			client: LibSQLDatabase<NonNullable<TSchema>> | TransactionScope,
		) => {
			const [result] = await client
				.select()
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
				.from(this.table as any)
				.where(and(eq(this.table.id, id)))

			if (!result) return null
			return this.mapToModel(result as InferSelectModel<T>)
		}

		return this.executeOperation(operation, transaction)
	}

	async findAll<F = unknown>(
		where?: SQL<F>,
		transaction?: TransactionScope,
	): Promise<M[]> {
		const operation = async (
			client: LibSQLDatabase<NonNullable<TSchema>> | TransactionScope,
		) => {
			const baseQuery = client
				.select()
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
				.from(this.table as any)
				.where(
					where
						? and(
								where,
								this.table.deletedAt ? isNull(this.table.deletedAt) : undefined,
							)
						: this.table.deletedAt
							? isNull(this.table.deletedAt)
							: undefined,
				)
				.orderBy(asc(this.table.createdAt))
			const results = await baseQuery

			return results.map((result) =>
				this.mapToModel(result as InferSelectModel<T>),
			)
		}

		return this.executeOperation(operation, transaction)
	}

	async findWithPagination<F = unknown>(
		params: PaginationParams,
		where?: SQL<F>,
		transaction?: TransactionScope,
	): Promise<PaginatedResult<M>> {
		const operation = async (
			client: LibSQLDatabase<TSchema> | TransactionScope,
		) => {
			const {
				page = 1,
				limit = 8,
				orderBy = 'createdAt',
				orderDirection = 'desc',
			} = params
			const offset = (page - 1) * limit

			const baseQuery = client
				.select()
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
				.from(this.table as any)

			if (where) {
				baseQuery.where(where)
			}

			// Add ordering
			if (orderDirection === 'desc') {
				baseQuery.orderBy(
					desc(this.table[orderBy as keyof T] as AnySQLiteColumn),
				)
			} else {
				baseQuery.orderBy(
					asc(this.table[orderBy as keyof T] as AnySQLiteColumn),
				)
			}

			// Get total count for pagination
			const [recordsCount] = await client
				.select({ count: count() })
				.from(baseQuery.as('baseQuery'))

			const allRecords = await baseQuery.offset(offset).limit(limit)

			const total = recordsCount?.count ?? 0
			const totalPages = Math.ceil(total / limit)

			return {
				data: allRecords.map((result) =>
					this.mapToModel(result as InferSelectModel<T>),
				),
				total,
				page,
				limit,
				totalPages,
			}
		}

		return this.executeOperation(operation, transaction)
	}

	async softDelete(id: string, transaction?: TransactionScope): Promise<void> {
		const operation = async (
			client: LibSQLDatabase<TSchema> | TransactionScope,
		) => {
			const [result] = await client
				.update(this.table)
				.set({
					deletedAt: new Date(),
					updatedAt: new Date(),
				} as SQLiteInsertValue<T>)
				.where(eq(this.table.id, id))
				.returning()

			if (!result) {
				throw new Error(`Record with id ${id} not found`)
			}
		}

		return this.executeOperation(operation, transaction)
	}

	async hardDelete(
		id: string,
		transaction?: TransactionScope,
	): Promise<ReturnType<typeof this.executeOperation>> {
		const operation = async (
			client: LibSQLDatabase<TSchema> | TransactionScope,
		) => {
			return await client
				.delete(this.table)
				.where(eq(this.table.id, id))
				.execute()
		}

		return this.executeOperation(operation, transaction)
	}

	async deleteAll(): Promise<void> {
		if (process.env.NODE_ENV === 'test') {
			await this.db.delete(this.table).execute()
		}
	}

	protected abstract mapToModel(data: InferSelectModel<T>): M
}
