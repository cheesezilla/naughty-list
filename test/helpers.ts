import { loadContent } from '../src/content/load.js';
import type { Content } from '../src/content/schema.js';
import type { Rng } from '../src/engine/rng.js';

export const content: Content = loadContent('content');

/** A random source that returns the given numbers in order, then repeats the last one. */
export function scripted(...values: number[]): Rng {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)]!;
}

export function withConstants(patch: Partial<Content['constants']>): Content {
  return { ...content, constants: { ...content.constants, ...patch } };
}
