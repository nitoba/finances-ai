import {
	DefaultModel,
	type Optional,
} from '../../shared/core/model/default.model'
import type { ExpenseCategory } from '../../shared/persistence/schemas/category.schema'

export class Expense extends DefaultModel<Expense> {
	readonly date!: string
	readonly description!: string
	readonly amount!: number
	readonly category!: ExpenseCategory
	readonly isRecurring!: boolean
	readonly userId!: string

	private constructor(data: Partial<Expense>) {
		super(data)
		Object.assign(this, data)
	}

	static create(
		data: Omit<
			Expense,
			| 'id'
			| 'createdAt'
			| 'updatedAt'
			| 'updateAmount'
			| 'getFormattedAmount'
			| 'isEssential'
			| 'isEmergency'
			| 'isInvestment'
			| 'updateDescription'
			| 'updateCategory'
		>,
	): Expense {
		return new Expense(data)
	}

	static createFrom(
		data: Optional<
			Expense,
			| 'updateAmount'
			| 'getFormattedAmount'
			| 'isEssential'
			| 'isEmergency'
			| 'isInvestment'
			| 'updateDescription'
			| 'updateCategory'
		>,
	): Expense {
		return new Expense(data)
	}

	updateAmount(newAmount: number): Expense {
		return new Expense({
			...this,
			amount: newAmount,
			updatedAt: new Date(),
		})
	}

	updateCategory(newCategory: ExpenseCategory): Expense {
		return new Expense({
			...this,
			category: newCategory,
			updatedAt: new Date(),
		})
	}

	updateDescription(newDescription: string): Expense {
		return new Expense({
			...this,
			description: newDescription,
			updatedAt: new Date(),
		})
	}

	// Helper methods
	getFormattedAmount(): string {
		return `R$ ${this.amount.toFixed(2)}`
	}

	isEssential(): boolean {
		return this.category === 'essentials'
	}

	isEmergency(): boolean {
		return this.category === 'emergency'
	}

	isInvestment(): boolean {
		return this.category === 'investments'
	}
}
