import { randomUUID } from 'node:crypto'
import { createTool } from '@mastra/core'

export const generateUUIDTool = createTool({
	id: 'generate_uuid',
	description: 'create and return a new uuid valid',
	execute: async () => {
		return randomUUID()
	},
})
