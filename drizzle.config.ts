import { defineConfig } from 'drizzle-kit'
import { env } from './src/lib/env'

export default defineConfig({
	dialect: 'turso',
	schema: './src/lib/db/schemas/*',
	out: './src/lib/db/migrations',
	dbCredentials: {
		url: env.DATABASE_URL,
		authToken: env.DATABASE_AUTH_TOKEN,
	},
})
