const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

// Token getter injected at runtime to avoid circular dependency with the store
let getAccessToken: (() => string | null) | null = null;

export function setTokenGetter(fn: () => string | null): void {
  getAccessToken = fn;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...init } = options;

  let url = `${API_BASE}${path}`;
  if (params) {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    );
    url += `?${query.toString()}`;
  }

  const token = getAccessToken?.();
  const authHeader: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...(init.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(error.message ?? `HTTP ${String(response.status)}`);
  }

  // 204 No Content
  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions): Promise<T> =>
    request<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body: unknown, options?: RequestOptions): Promise<T> =>
    request<T>(path, { ...options, method: 'POST', body: JSON.stringify(body) }),

  patch: <T>(path: string, body: unknown, options?: RequestOptions): Promise<T> =>
    request<T>(path, { ...options, method: 'PATCH', body: JSON.stringify(body) }),

  delete: <T>(path: string, options?: RequestOptions): Promise<T> =>
    request<T>(path, { ...options, method: 'DELETE' }),
};
