import {
	and,
	desc,
	eq,
	gte,
	type InferSelectModel,
	like,
	lte,
	sql,
} from 'drizzle-orm'
import { inject, injectable } from 'inversify'
import { TYPES } from '../../../core/types'
import type { IAppLogger } from '../../logger/interfaces/ILogger'
import { DrizzleDefaultRepository } from '../../shared/persistence/repository/drizzle-default-repository'
import type { ExpenseCategory } from '../../shared/persistence/schemas/category.schema'
import { expenses } from '../../shared/persistence/schemas/expenses.schema'
import type { DatabaseService } from '../../shared/persistence/services/database.service'
import type { TransactionScope } from '../../shared/persistence/types/unit-of-work.types'
import { Expense } from '../models/expense.model'

@injectable()
export class ExpenseRepository extends DrizzleDefaultRepository<
	Expense,
	typeof expenses,
	typeof import('../../shared/persistence/schemas/expenses.schema')
> {
	constructor(
		@inject(TYPES.Database) database: DatabaseService<
			typeof import('../../shared/persistence/schemas/expenses.schema')
		>,
		@inject(TYPES.Logger) private readonly logger: IAppLogger,
	) {
		super(database.getConnection(), expenses)
	}

	protected mapToModel(data: InferSelectModel<typeof expenses>): Expense {
		throw Expense.createFrom(data)
	}

	// Métodos específicos do ExpenseRepository
	async findByUserId(
		userId: string,
		options?: {
			limit?: number
			offset?: number
			category?: string
			startDate?: string
			endDate?: string
			search?: string
		},
		transaction?: TransactionScope,
	): Promise<Expense[]> {
		try {
			const db = transaction || this.db
			const whereConditions = [eq(expenses.userId, userId)]
			const query = db
				.select()
				.from(expenses)
				.orderBy(desc(expenses.createdAt))
				.limit(options?.limit || 50)
				.offset(options?.offset || 0)

			// Apply filters
			if (options?.category) {
				whereConditions.push(
					eq(expenses.category, options.category as ExpenseCategory),
				)
			}

			if (options?.startDate) {
				whereConditions.push(gte(expenses.date, options.startDate))
			}

			if (options?.endDate) {
				whereConditions.push(lte(expenses.date, options.endDate))
			}

			if (options?.search) {
				whereConditions.push(like(expenses.description, `%${options.search}%`))
			}

			query.where(and(...whereConditions))

			const results = await query
			return results.map((result) => this.mapToModel(result))
		} catch (error) {
			this.logger.error('Failed to find expenses by user ID', {
				userId,
				options,
				error,
			})
			throw error
		}
	}

	async getTotalByUserId(
		userId: string,
		options?: {
			category?: string
			startDate?: string
			endDate?: string
		},
		transaction?: TransactionScope,
	): Promise<number> {
		try {
			const db = transaction || this.db
			const whereConditions = [eq(expenses.userId, userId)]
			const query = db
				.select({ total: sql<number>`sum(${expenses.amount})` })
				.from(expenses)

			if (options?.category) {
				whereConditions.push(
					eq(expenses.category, options.category as ExpenseCategory),
				)
			}

			if (options?.startDate) {
				whereConditions.push(gte(expenses.date, options.startDate))
			}

			if (options?.endDate) {
				whereConditions.push(lte(expenses.date, options.endDate))
			}

			query.where(and(...whereConditions))

			const result = await query
			return result[0]?.total || 0
		} catch (error) {
			this.logger.error('Failed to get total expenses', {
				userId,
				options,
				error,
			})
			throw error
		}
	}

	async getExpensesByCategory(
		userId: string,
		options?: {
			startDate?: string
			endDate?: string
		},
		transaction?: TransactionScope,
	): Promise<Array<{ category: string; total: number; count: number }>> {
		try {
			const db = transaction || this.db
			const whereConditions = [eq(expenses.userId, userId)]
			const query = db
				.select({
					category: expenses.category,
					total: sql<number>`sum(${expenses.amount})`,
					count: sql<number>`count(*)`,
				})
				.from(expenses)
				.groupBy(expenses.category)

			if (options?.startDate) {
				whereConditions.push(gte(expenses.date, options.startDate))
			}

			if (options?.endDate) {
				whereConditions.push(lte(expenses.date, options.endDate))
			}

			query.where(and(...whereConditions))

			return await query
		} catch (error) {
			this.logger.error('Failed to get expenses by category', {
				userId,
				options,
				error,
			})
			throw error
		}
	}

	async findExpensesByCategory(
		userId: string,
		category: ExpenseCategory,
		transaction?: TransactionScope,
	): Promise<Expense[]> {
		return this.findByUserId(userId, { category }, transaction)
	}

	async findRecurringExpenses(
		userId: string,
		transaction?: TransactionScope,
	): Promise<Expense[]> {
		try {
			const db = transaction || this.db
			const results = await db
				.select()
				.from(expenses)
				.where(and(eq(expenses.userId, userId), eq(expenses.isRecurring, true)))
				.orderBy(desc(expenses.createdAt))

			return results.map((result) => this.mapToModel(result))
		} catch (error) {
			this.logger.error('Failed to find recurring expenses', {
				userId,
				error,
			})
			throw error
		}
	}
}
