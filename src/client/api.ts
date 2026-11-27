export interface User { id: number; username: string; isAdmin: boolean; createdAt?: number }

/** The server version this page first talked to. A later response from a different version means the page is stale. */
let pageVersion: string | null = null;
const staleListeners = new Set<() => void>();
export let stale = false;
export function onStale(fn: () => void) { staleListeners.add(fn); return () => { staleListeners.delete(fn); }; }

/** Remembers the first version seen; flags the page as stale when a response comes from another one. */
export function checkVersion(res: Response) {
  const v = res.headers.get('x-app-version');
  if (!v) return;
  if (pageVersion === null) pageVersion = v;
  else if (v !== pageVersion && !stale) { stale = true; staleListeners.forEach((f) => f()); }
}

/** Calls the game server. Throws an Error with the server's message when the call fails. */
export async function api<T = unknown>(method: 'GET' | 'POST' | 'DELETE', path: string, body?: object): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  checkVersion(res);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `Something went wrong (HTTP ${res.status}).`);
  return json as T;
}
