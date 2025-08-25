import { z } from 'zod'

export const userProfileSchema = z.object({
  name: z.string().min(4, {
    message: 'O nome deve ter pelo menos 4 caracteres.',
  }),
  monthlySalary: z.coerce.number().refine((val) => !Number.isNaN(Number(val)), {
    message: 'A renda mensal deve ser um número válido.',
  }),
  imageUrl: z
    .string()
    .url({
      message: 'Por favor, insira uma URL válida para a imagem.',
    })
    .optional()
    .or(z.literal('')),
})
