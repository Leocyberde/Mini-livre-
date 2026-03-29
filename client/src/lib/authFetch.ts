const TOKEN_KEY = 'auth-token';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};

  if (options.headers) {
    Object.assign(headers, options.headers as Record<string, string>);
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(path, { ...options, headers });
}

export async function authApi(method: string, path: string, body?: unknown): Promise<Response> {
  return authFetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}
