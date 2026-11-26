import { describe, expect, it } from 'vitest';
import type { JournalRow } from '../src/engine/index.js';
import { trimLog } from '../src/client/game.js';
import { when } from '../src/client/lib/format.js';

const hunt = (id: number): JournalRow => ({ id, n: id, at: id, kind: 'hunt', entry: { outcome: 'quiet', location: 'x', gold: 0, points: 0, loot: [], baitUsed: 0, charmUsed: false } });
const event = (id: number): JournalRow => ({ id, n: id, at: id, kind: 'event', entry: { type: 'buy', item: 'stale_cookie', amount: 1, gold: 8 } });

describe('hunt log', () => {
  it('keeps the last N hunts and the events between them', () => {
    const rows = [event(10), hunt(9), event(8), hunt(7), event(6), hunt(5), event(4)];
    expect(trimLog(rows, 2).map((r) => r.id)).toEqual([10, 9, 8, 7]);
    expect(trimLog(rows, 50)).toHaveLength(7);
  });

  it("shows times in the viewer's clock, with the day when it isn't today", () => {
    const now = new Date(2026, 10, 25, 15, 30).getTime();
    expect(when(new Date(2026, 10, 25, 15, 28).getTime(), true, now)).toMatch(/15:28/);
    expect(when(new Date(2026, 10, 25, 15, 28).getTime(), false, now)).toMatch(/3:28/);
    expect(when(new Date(2026, 10, 24, 23, 2).getTime(), true, now)).toMatch(/^Yesterday 23:02/);
    expect(when(new Date(2026, 10, 1, 9, 0).getTime(), true, now)).toMatch(/Nov/);
  });
});

describe('listProgress', () => {
  it('counts caught elves in a location and overall', async () => {
    const { listProgress } = await import('../src/client/lib/progress.js');
    const content = { locations: [{ id: 'a', imps: [{ id: 'x' }, { id: 'y' }] }, { id: 'b', imps: [{ id: 'z' }] }] } as never;
    const r = listProgress(content, { x: 3, z: 1 }, 'a');
    expect(r.here).toEqual({ caught: 1, total: 2 });
    expect(r.all).toEqual({ caught: 2, total: 3 });
  });
});
