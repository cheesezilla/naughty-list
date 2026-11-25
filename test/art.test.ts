import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { content } from './helpers.js';

const ART = 'src/client/public/art';
type Entry = { id: string; slot: string; file: string; width: number; height: number; prompt: string; description: string };
const manifest = JSON.parse(readFileSync(join(ART, 'manifest.json'), 'utf8')) as { assets: Entry[] };
const has = (slot: string, id: string) => manifest.assets.some((a) => a.slot === slot && a.id === id);

describe('art manifest', () => {
  it('has a picture for every trap, base, bait, charm, material, location, imp and rank', () => {
    const missing: string[] = [];
    for (const [slot, list] of Object.entries(content.items)) for (const item of list) if (!has(slot, item.id)) missing.push(`${slot}/${item.id}`);
    for (const loc of content.locations) {
      if (!has('locations', loc.id)) missing.push(`locations/${loc.id}`);
      for (const imp of loc.imps) if (!has('imps', imp.id)) missing.push(`imps/${imp.id}`);
    }
    for (const r of content.ranks) if (!has('ranks', `rank_${r.rank}`)) missing.push(`ranks/rank_${r.rank}`);
    for (const t of new Set(content.items.traps.map((t) => t.type))) if (!has('trap_types', t)) missing.push(`trap_types/${t}`);
    for (const fixed of ['brand/icon', 'brand/key_art', 'map/lair_map', 'imps/_locked']) {
      const [slot, id] = fixed.split('/') as [string, string];
      if (!has(slot, id)) missing.push(fixed);
    }
    expect(missing, 'run `npm run art` after adding content').toEqual([]);
  });

  it('points at files that exist, named <slot>/<id>.<ext>, each with a size and a prompt', () => {
    for (const a of manifest.assets) {
      expect(a.file, a.id).toMatch(new RegExp(`^${a.slot}/${a.id}\\.(svg|png|webp|jpe?g|avif|gif)$`));
      expect(existsSync(join(ART, a.file)), a.file).toBe(true);
      expect(a.width * a.height, a.file).toBeGreaterThan(0);
      expect(a.prompt.length, a.file).toBeGreaterThan(40);
    }
  });
});
