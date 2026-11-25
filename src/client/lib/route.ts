import { useEffect, useState } from 'preact/hooks';

/** Tiny hash router: "#/emporium/bait" -> ['emporium', 'bait']. The phone's back button works. */
export function parse(hash = location.hash): string[] {
  return hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
}

const listeners = new Set<() => void>();
const notify = () => { for (const l of listeners) l(); };
window.addEventListener('hashchange', notify);
window.addEventListener('popstate', notify);

export function useRoute(): string[] {
  const [r, setR] = useState(parse);
  useEffect(() => {
    const on = () => setR(parse());
    listeners.add(on);
    return () => { listeners.delete(on); };
  }, []);
  return r;
}

const target = (path: string) => `#/${path.replace(/^\//, '')}`;

/** Opens a page. Entries made here are marked, so Back knows it can step back inside the game. */
export function go(path: string, replace = false) {
  const t = target(path);
  if (location.hash === t) return;
  if (replace) history.replaceState(history.state, '', t);
  else history.pushState({ inGame: true }, '', t);
  notify();
}

/** Back to where the player came from, or to `fallback` if they opened this page directly. */
export function back(fallback: string) {
  if ((history.state as { inGame?: boolean } | null)?.inGame) history.back();
  else go(fallback, true);
}
