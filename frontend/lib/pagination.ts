export type PaginatedResult<T> = {
  items: T[]
  page: number
  pageSize: number
  totalPages: number
  totalItems: number
}

export function paginateRows<T>(items: T[], page: number, pageSize: number): PaginatedResult<T> {
  const safePageSize = Math.max(1, Number.isFinite(pageSize) ? Math.floor(pageSize) : 10)
  const safePage = Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1)
  const totalItems = Array.isArray(items) ? items.length : 0
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize))
  const normalizedPage = Math.min(safePage, totalPages)
  const start = (normalizedPage - 1) * safePageSize
  const end = start + safePageSize

  return {
    items: items.slice(start, end),
    page: normalizedPage,
    pageSize: safePageSize,
    totalPages,
    totalItems,
  }
}
