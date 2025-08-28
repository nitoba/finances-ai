import { inject, injectable } from 'inversify'
import { AppError } from '../../../core/errors/AppError'
import { TYPES } from '../../../core/types'
import type { AuthService } from '../../auth/services/auth.service'
import type { IAppLogger } from '../../logger/interfaces/ILogger'
import { Expense } from '../models/expense.model'
import type { ExpenseRepository } from '../repositories/expense.repository'

export interface ExpenseFilters {
	category?: string
	startDate?: string
	endDate?: string
	search?: string
	limit?: number
	offset?: number
}

export interface CreateExpenseInput {
	description: string
	amount: number
	category: string
	date?: string
	isRecurring?: boolean
}

export interface UpdateExpenseInput {
	description?: string
	amount?: number
	category?: string
	date?: string
	isRecurring?: boolean
}

export interface GetExpensesInput {
	userId: string
	filters?: ExpenseFilters
}

export interface ExpenseUseCaseResult<T> {
	success: boolean
	data?: T
	error?: string
}

@injectable()
export class ExpenseUseCase {
	constructor(
		@inject(TYPES.ExpenseRepository)
		private readonly expenseRepository: ExpenseRepository,
		@inject(TYPES.AuthService) private readonly authService: AuthService,
		@inject(TYPES.Logger) private readonly logger: IAppLogger,
	) {}

	async createExpense(
		userId: string,
		input: CreateExpenseInput,
	): Promise<ExpenseUseCaseResult<Expense>> {
		try {
			// Validate user exists
			await this.authService.getUserById(userId)

			// Create expense data
			const expenseData = Expense.create({
				description: input.description,
				amount: input.amount,
				category: input.category as any,
				date: input.date || new Date().toISOString().split('T')[0],
				isRecurring: input.isRecurring || false,
				userId: userId,
			})

			const expense = await this.expenseRepository.create(expenseData)

			return {
				success: true,
				data: expense,
			}
		} catch (error) {
			this.logger.error('Use case: Create expense failed', {
				userId,
				input,
				error,
			})

			if (error instanceof AppError) {
				return {
					success: false,
					error: error.message,
				}
			}

			return {
				success: false,
				error: 'Failed to create expense',
			}
		}
	}

	async getExpense(expenseId: string): Promise<ExpenseUseCaseResult<Expense>> {
		try {
			const expense = await this.expenseRepository.findById(expenseId)

			if (!expense) {
				return {
					success: false,
					error: '',
				}
			}

			return {
				success: true,
				data: expense,
			}
		} catch (error) {
			this.logger.error('Use case: Get expense failed', {
				expenseId,
				error,
			})

			if (error instanceof AppError) {
				return {
					success: false,
					error: error.message,
				}
			}

			return {
				success: false,
				error: 'Failed to get expense',
			}
		}
	}

	async getUserExpenses(
		input: GetExpensesInput,
	): Promise<ExpenseUseCaseResult<Expense[]>> {
		try {
			// Validate user exists
			await this.authService.getUserById(input.userId)

			const expenses = await this.expenseRepository.findByUserId(
				input.userId,
				input.filters,
			)

			return {
				success: true,
				data: expenses,
			}
		} catch (error) {
			this.logger.error('Use case: Get user expenses failed', { input, error })

			if (error instanceof AppError) {
				return {
					success: false,
					error: error.message,
				}
			}

			return {
				success: false,
				error: 'Failed to get expenses',
			}
		}
	}

	async updateExpense(
		expenseId: string,
		input: UpdateExpenseInput,
	): Promise<ExpenseUseCaseResult<Expense>> {
		try {
			const { data: expenseToUpdate, error } = await this.getExpense(expenseId)

			if (error) {
				return {
					error,
					success: false,
				}
			}

			if (input.description !== undefined)
				expenseToUpdate?.updateDescription(input.description)
			if (input.amount !== undefined) {
				expenseToUpdate?.updateAmount(input.amount)
			}
			if (input.category !== undefined)
				expenseToUpdate?.updateCategory(input.category as any)

			const expense = await this.expenseRepository.update(
				expenseId,
				// biome-ignore lint/style/noNonNullAssertion: <explanation>
				expenseToUpdate!,
			)

			return {
				success: true,
				data: expense,
			}
		} catch (error) {
			this.logger.error('Use case: Update expense failed', {
				expenseId,
				input,
				error,
			})

			if (error instanceof AppError) {
				return {
					success: false,
					error: error.message,
				}
			}

			return {
				success: false,
				error: 'Failed to update expense',
			}
		}
	}

	async deleteExpense(
		expenseId: string,
		userId: string,
	): Promise<ExpenseUseCaseResult<void>> {
		try {
			await this.expenseRepository.hardDelete(expenseId)

			return {
				success: true,
			}
		} catch (error) {
			this.logger.error('Use case: Delete expense failed', {
				expenseId,
				userId,
				error,
			})

			if (error instanceof AppError) {
				return {
					success: false,
					error: error.message,
				}
			}

			return {
				success: false,
				error: 'Failed to delete expense',
			}
		}
	}

	// Helper method to format expense for display
	formatExpenseForDisplay(expense: Expense): any {
		const categoryLabels = {
			essentials: '🏠 Essenciais',
			leisure: '🎉 Lazer',
			investments: '📈 Investimentos',
			knowledge: '📚 Conhecimento',
			emergency: '🚨 Emergência',
		} as const

		return {
			id: expense.id,
			description: expense.description,
			amount: expense.amount,
			formattedAmount: `R$ ${expense.amount.toFixed(2)}`,
			category: expense.category,
			categoryLabel: categoryLabels[expense.category],
			date: expense.date,
			isRecurring: expense.isRecurring,
			createdAt: expense.createdAt,
			updatedAt: expense.updatedAt,
		}
	}
}
