import type { Content } from '../../content/schema.js';

export interface Collection { caught: number; total: number }

/** Naughty List progress after a catch: elves caught in one location, and in every location. */
export function listProgress(content: Content, catches: Record<string, number>, location: string): { here: Collection; all: Collection } {
  const count = (imps: { id: string }[]): Collection => ({ caught: imps.filter((i) => (catches[i.id] ?? 0) > 0).length, total: imps.length });
  return {
    here: count(content.locations.find((l) => l.id === location)?.imps ?? []),
    all: count(content.locations.flatMap((l) => l.imps)),
  };
}
