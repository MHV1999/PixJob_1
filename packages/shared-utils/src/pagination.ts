import type { PaginationMeta, PaginationQuery } from '@pixjob/shared-types';

export function buildPaginationMeta(
  query: PaginationQuery,
  total: number,
): PaginationMeta {
  const totalPages = Math.ceil(total / query.limit);
  return {
    page: query.page,
    limit: query.limit,
    total,
    totalPages,
    hasNext: query.page < totalPages,
    hasPrev: query.page > 1,
  };
}

export function buildPrismaSkipTake(query: PaginationQuery): {
  skip: number;
  take: number;
} {
  return {
    skip: (query.page - 1) * query.limit,
    take: query.limit,
  };
}
