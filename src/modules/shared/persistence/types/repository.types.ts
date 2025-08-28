export type PaginationParams = {
	page: number
	limit: number
	orderBy?: string
	orderDirection?: 'asc' | 'desc'
}

export type PaginatedResult<T> = {
	data: T[]
	total: number
	page: number
	limit: number
	totalPages: number
}
