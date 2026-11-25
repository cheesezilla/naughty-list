/** A random source returning numbers in [0, 1). */
export type Rng = () => number;

/** Small, fast seeded generator (mulberry32). Same seed, same sequence. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Picks an index with probability proportional to its weight. Returns -1 if all weights are 0. */
export function pickWeighted(weights: readonly number[], rng: Rng): number {
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) return -1;
  let roll = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i]!;
    if (roll < 0) return i;
  }
  return weights.length - 1;
}
