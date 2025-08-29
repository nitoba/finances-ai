import { z } from 'zod'

const envSchema = z.object({
	PORT: z.coerce.number().default(3333),
	DATABASE_URL: z.string().url(),
	DATABASE_AUTH_TOKEN: z.string().min(1),
	DISCORD_BOT_TOKEN: z.string().min(1),
	DISCORD_CLIENT_ID: z.string().min(1),
	DISCORD_CLIENT_SECRET: z.string().min(1),
})

export type Env = z.infer<typeof envSchema>

export const env = envSchema.parse(process.env)
