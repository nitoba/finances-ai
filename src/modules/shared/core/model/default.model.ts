import { randomUUID } from 'node:crypto'

/**
 * Make some property optional on type
 *
 * @example
 * ```typescript
 * type Post {
 *  id: string;
 *  name: string;
 *  email: string;
 * }
 *
 * Optional<Post, 'id' | 'email'>
 * ```
 **/

export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>

export type WithOptional<T, K extends keyof T> = Omit<T, K> &
	Partial<Pick<T, K>>

export abstract class DefaultModel<T> {
	readonly id!: string
	createdAt!: Date
	updatedAt!: Date

	protected constructor(data: Partial<T>) {
		Object.assign(this, data)
		this.id = this.id ?? randomUUID()
		this.createdAt = this.createdAt ?? new Date()
		this.updatedAt = this.updatedAt ?? new Date()
	}
}
