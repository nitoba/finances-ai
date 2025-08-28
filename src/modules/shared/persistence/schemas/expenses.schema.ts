import { sql } from 'drizzle-orm'
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { users } from './auth-schema'
import type { ExpenseCategory } from './category.schema'

export const expenses = sqliteTable('expenses', {
	id: text('id').primaryKey(),
	date: text('date').notNull(),
	description: text('description').notNull(),
	amount: real('amount').notNull(),
	category: text('category').$type<ExpenseCategory>().notNull(),
	isRecurring: integer('is_recurring')
		.$type<boolean>()
		.notNull()
		.default(sql`0`),
	userId: text('user_id')
		.notNull()
		.references(() => users.id),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.$type<Date>()
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.$type<Date>()
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
})
