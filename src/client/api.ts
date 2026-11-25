export interface User { id: number; username: string; isAdmin: boolean }

/** Calls the game server. Throws an Error with the server's message when the call fails. */
export async function api<T = unknown>(method: 'GET' | 'POST' | 'DELETE', path: string, body?: object): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `Something went wrong (HTTP ${res.status}).`);
  return json as T;
}
