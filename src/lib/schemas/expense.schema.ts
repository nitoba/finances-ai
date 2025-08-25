import { z } from 'zod'
import { categorySchema } from './category.schema'

export const expenseSchema = z.object({
  id: z.string(),
  date: z.string(),
  description: z.string().min(5),
  amount: z.number(),
  category: categorySchema,
  isRecurring: z.boolean().default(false),
  createdAt: z.date().default(new Date()),
  updatedAt: z.date().default(new Date()),
})

export type Expense = z.infer<typeof expenseSchema>
