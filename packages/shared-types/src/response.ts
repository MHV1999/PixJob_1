import type { PaginationMeta } from './pagination';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}

export interface ApiError {
  success: false;
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
}
