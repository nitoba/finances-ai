import {
	DefaultModel,
	type Optional,
} from '../../shared/core/model/default.model'

export class User extends DefaultModel<User> {
	readonly name!: string
	readonly email!: string
	readonly emailVerified!: boolean
	readonly image?: string | null
	readonly monthlySalary?: number | null

	private constructor(data: Partial<User>) {
		super(data)
		Object.assign(this, data)
	}

	static create(
		data: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>,
	): User {
		return new User(data)
	}

	static createFrom(
		data: Optional<User, 'updateSalary' | 'verifyEmail'>,
	): User {
		return new User(data)
	}

	updateSalary(salary: number): User {
		return new User({
			...this,
			monthlySalary: salary,
			updatedAt: new Date(),
		})
	}

	verifyEmail(): User {
		return new User({
			...this,
			emailVerified: true,
			updatedAt: new Date(),
		})
	}
}
