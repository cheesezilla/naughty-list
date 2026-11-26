import type { Imp, Location } from '../content/schema.js';
import { gameData, itemOfKind, type GameData } from './data.js';
import type { Content } from '../content/schema.js';
import type { Setup } from './player.js';

export interface SetupStats {
  power: number;
  luck: number;
  attraction: number;
  type: string | null;
}

/** Total power, luck and attraction rate for a setup in a location. */
export function setupStats(content: Content, setup: Setup, location: Location): SetupStats {
  const data = gameData(content);
  const trap = itemOfKind(data, setup.trap, 'trap');
  const base = itemOfKind(data, setup.base, 'base');
  const bait = itemOfKind(data, setup.bait, 'bait');
  const charm = itemOfKind(data, setup.charm, 'charm');

  const rawPower = (trap?.power ?? 0) + (base?.power ?? 0) + (charm?.power ?? 0);
  const power = rawPower * (1 + (charm?.powerBonus ?? 0));
  const luck = (trap?.luck ?? 0) + (base?.luck ?? 0) + (charm?.luck ?? 0);

  let attraction = 0;
  if (bait) {
    const bonus = (trap?.attraction ?? 0) + (base?.attraction ?? 0) + (charm?.attraction ?? 0);
    attraction = bait.attraction * (1 + bonus);
    if (location.preferredBait && location.preferredBait !== bait.id) {
      attraction *= location.otherBaitPenalty ?? 1;
    }
    attraction = Math.min(content.constants.attractionCap, attraction);
  }
  return { power, luck, attraction, type: trap?.type ?? null };
}

/** Type multiplier of the trap against an imp: 0 immune, 0.5 resists, 1 normal, 1.5 weak. */
export function effectiveness(imp: Imp, type: string | null): number {
  if (!type) return 0;
  const e = imp.effectiveness as Record<string, number | undefined> | undefined;
  return e?.[type] ?? 1;
}

/**
 * Luck's multiplier for an elf: `scale` x the weight of its tier. Luck is strongest against common
 * elves and weakest against bosses, so power is what beats a boss. Defaults to 1 (plain L^2).
 */
export function luckFactor(constants: Content['constants'] | undefined, imp: Imp): number {
  const l = constants?.luck;
  return l ? l.scale * l.tierWeight[imp.tier] : 1;
}

/** C = clamp((P*E + f*L^2) / (P*E + M), 0, cap), f = luckFactor; luck only counts when E > 0. */
export function catchChance(stats: SetupStats, imp: Imp, cap: number, luckMult = 1): number {
  const e = effectiveness(imp, stats.type);
  if (e <= 0) return 0;
  const pe = stats.power * e;
  const c = (pe + luckMult * stats.luck * stats.luck) / (pe + imp.power);
  return Math.max(0, Math.min(cap, c));
}

/** Encounter weights for every imp in a location with a given bait. */
export function impWeights(data: GameData, location: Location, baitId: string | null): number[] {
  const bait = itemOfKind(data, baitId, 'bait');
  const rare = bait?.rareMultiplier ?? 1;
  return location.imps.map((imp) => {
    const w = (baitId ? imp.baitWeights?.[baitId] : undefined) ?? imp.weight;
    return imp.tier === 'common' ? w : w * rare;
  });
}

export interface ImpOdds {
  imp: Imp;
  encounter: number;
  catchChance: number;
}

export interface HuntOdds {
  stats: SetupStats;
  imps: ImpOdds[];
  /** Chance per hunt of a catch (attraction x encounter x catch, summed). */
  catchPerHunt: number;
  expectedGold: number;
  expectedPoints: number;
}

/** Exact expected outcome of one hunt with this setup, used by the UI and the simulator. */
export function huntOdds(content: Content, setup: Setup, locationId: string): HuntOdds {
  const data = gameData(content);
  const location = data.locations.get(locationId);
  if (!location) throw new Error(`unknown location ${locationId}`);
  const stats = setupStats(content, setup, location);
  const weights = impWeights(data, location, setup.bait);
  const total = weights.reduce((s, w) => s + w, 0) || 1;
  const imps = location.imps.map((imp, i) => ({
    imp,
    encounter: weights[i]! / total,
    catchChance: catchChance(stats, imp, content.constants.catchCap, luckFactor(content.constants, imp)),
  }));
  let catchPerHunt = 0;
  let expectedGold = 0;
  let expectedPoints = 0;
  for (const o of imps) {
    const p = stats.attraction * o.encounter * o.catchChance;
    catchPerHunt += p;
    expectedGold += p * o.imp.gold;
    expectedPoints += p * o.imp.points;
  }
  return { stats, imps, catchPerHunt, expectedGold, expectedPoints };
}
