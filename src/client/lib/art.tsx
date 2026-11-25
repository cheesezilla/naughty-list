import { useEffect, useState } from 'preact/hooks';

/**
 * Game art comes from /art/manifest.json (see docs/ART.md), so a PNG that replaces an SVG
 * is picked up after `npm run art` without any code change.
 */
export interface ArtEntry { id: string; slot: string; file: string; width: number; height: number; pins?: Record<string, { x: number; y: number }> }
interface Manifest { base: string; assets: ArtEntry[] }

let manifest: Map<string, ArtEntry> | undefined;
let base = '/art/';
let loading: Promise<void> | undefined;

export function loadArt(): Promise<void> {
  loading ??= fetch('/art/manifest.json')
    .then((r) => (r.ok ? (r.json() as Promise<Manifest>) : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then((m) => {
      base = m.base;
      manifest = new Map(m.assets.map((a) => [`${a.slot}/${a.id}`, a]));
    })
    .catch(() => { manifest = new Map(); });
  return loading;
}

export const artEntry = (slot: string, id: string) => manifest?.get(`${slot}/${id}`);
export function artUrl(slot: string, id: string): string | undefined {
  const a = artEntry(slot, id);
  return a ? base + a.file : undefined;
}

export function useArtReady(): boolean {
  const [ready, setReady] = useState(!!manifest);
  useEffect(() => { if (!manifest) loadArt().then(() => setReady(true)); }, []);
  return ready;
}

/** A picture by slot and game id. Falls back to a labelled box if the manifest has no entry. */
export function Art({ slot, id, alt = '', class: cls = '', style }: { slot: string; id: string; alt?: string; class?: string; style?: Record<string, string | number> }) {
  const url = artUrl(slot, id);
  if (!url) return <span class={`art missing ${cls}`} style={style} role={alt ? 'img' : undefined} aria-label={alt || undefined}>{alt}</span>;
  return <img class={`art ${cls}`} src={url} alt={alt} style={style} loading="lazy" decoding="async" draggable={false} />;
}

/** Line icons are drawn in currentColor, so they are shown as a CSS mask filled with the text colour. */
export function Icon({ id, size = 24, class: cls = '' }: { id: string; size?: number; class?: string }) {
  const url = artUrl('icons', id);
  return (
    <span
      class={`icon ${cls}`}
      aria-hidden="true"
      style={{ width: `${size}px`, height: `${size}px`, ...(url ? { maskImage: `url("${url}")`, WebkitMaskImage: `url("${url}")` } : {}) }}
    />
  );
}

/** Which slot holds an item's picture. */
export const itemSlot = (kind: string) => ({ trap: 'traps', base: 'bases', bait: 'baits', charm: 'charms', material: 'materials' })[kind] ?? 'materials';
