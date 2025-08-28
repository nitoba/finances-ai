import { and, eq, type InferSelectModel, like } from 'drizzle-orm'
import { inject, injectable } from 'inversify'
import { TYPES } from '../../../core/types'
import type { IAppLogger } from '../../logger/interfaces/ILogger'
import { DrizzleDefaultRepository } from '../../shared/persistence/repository/drizzle-default-repository'
import { accounts, users } from '../../shared/persistence/schemas/auth-schema'
import type { DatabaseService } from '../../shared/persistence/services/database.service'
import type { TransactionScope } from '../../shared/persistence/types/unit-of-work.types'
import { User } from '../models/user.model'

@injectable()
export class AuthRepository extends DrizzleDefaultRepository<
	User,
	typeof users,
	typeof import('../../../modules/shared/persistence/schemas/auth-schema')
> {
	protected mapToModel(data: InferSelectModel<typeof users>): User {
		return User.createFrom(data)
	}
	constructor(
		@inject(TYPES.Database) database: DatabaseService<
			typeof import('../../../modules/shared/persistence/schemas/auth-schema')
		>,
		@inject(TYPES.Logger) private readonly logger: IAppLogger,
	) {
		super(database.getConnection(), users)
	}

	async findUserByDiscordId(
		discordId: string,
		transaction?: TransactionScope,
	): Promise<User | null> {
		try {
			const db = transaction || this.db
			const [result] = await db
				.select({
					id: users.id,
					name: users.name,
					email: users.email,
					emailVerified: users.emailVerified,
					image: users.image,
					monthlySalary: users.monthlySalary,
					createdAt: users.createdAt,
					updatedAt: users.updatedAt,
				})
				.from(users)
				.innerJoin(accounts, eq(users.id, accounts.userId))
				.where(
					and(
						eq(accounts.accountId, discordId),
						eq(accounts.providerId, 'discord'),
					),
				)
				.limit(1)

			return result ? this.mapToModel(result) : null
		} catch (error) {
			this.logger.error('Failed to find user by Discord ID', {
				discordId,
				error,
			})
			throw error
		}
	}

	async findUsersByName(
		name: string,
		transaction?: TransactionScope,
	): Promise<User[]> {
		try {
			const db = transaction || this.db
			const results = await db
				.select()
				.from(users)
				.where(like(users.name, `%${name}%`))

			return results.map((result) => this.mapToModel(result))
		} catch (error) {
			this.logger.error('Failed to find users by name', { name, error })
			throw error
		}
	}

	async updateUserSalary(
		userId: string,
		salary: number,
		transaction?: TransactionScope,
	): Promise<User | null> {
		return this.update(userId, { monthlySalary: salary }, transaction)
	}

	async verifyUserEmail(
		userId: string,
		transaction?: TransactionScope,
	): Promise<User | null> {
		return this.update(userId, { emailVerified: true }, transaction)
	}
}
