import { z } from 'zod'

export const categorySchema = z.enum([
  'essentials',
  'leisure',
  'investments',
  'knowledge',
  'emergency',
])

export type ExpenseCategory = z.infer<typeof categorySchema>
