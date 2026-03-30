import { authApi } from '@/lib/authFetch';

export async function api(method: string, path: string, body?: unknown) {
  try {
    const response = await authApi(method, path, body);
    if (!response.ok) return undefined;
    return response.json();
  } catch (e) {
    console.error(e);
  }
}
