import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { env } from '../env'

import * as schema from './schemas'

const turso = createClient({
	url: env.DATABASE_URL,
	authToken: env.DATABASE_AUTH_TOKEN,
})

export const db = drizzle(turso, { schema })
