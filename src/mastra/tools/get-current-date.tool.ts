import { createTool } from '@mastra/core'

export const getCurrentDateTool = createTool({
	id: 'get_current_date',
	description: 'get the current date on the moment',
	execute: async () => {
		return new Date()
	},
})
