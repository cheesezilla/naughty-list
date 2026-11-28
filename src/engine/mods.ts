import type { Content } from '../content/schema.js';
import type { PlayerState } from './player.js';

/** Everything active boons and event buffs change about the next hunt. Built once at the start of a hunt. */
export interface Mods {
  powerMult: number;
  luckAdd: number;
  luckMult: number;
  /** Added to the trap, base and charm Allure bonus, before the attraction cap. */
  attractionBonus: number;
  /** Multiplies the rare, mini boss and boss weights after the cap (event Allure buffs and Starfall). */
  allureMult: number;
  goldMult: number;
  pointsMult: number;
  /** A Golden Ticket is active: the next catch pays x`ticket`. */
  ticket: number;
  lootMult: number;
  minLoot: number;
  freeBait: boolean;
  baitCost: number;
  /** Cosy Mittens: no pillage while it lasts. */
  noPillage: boolean;
  /** A one-escape hunt shield is held. */
  shield: boolean;
  /** A Snow Globe is held: the next mini boss or boss cannot pillage and is easier to catch by this much. */
  bossShield: number;
  mulligan: boolean;
  bossBell: boolean;
  pipMult: number;
  freeEscape: boolean;
}

export const noMods = (): Mods => ({
  powerMult: 1, luckAdd: 0, luckMult: 1, attractionBonus: 0, allureMult: 1, goldMult: 1, pointsMult: 1, ticket: 1,
  lootMult: 1, minLoot: 0, freeBait: false, baitCost: 1, noPillage: false, shield: false, bossShield: 0,
  mulligan: false, bossBell: false, pipMult: 1, freeEscape: false,
});

/** Whether the player is pushing: hunting with push-role bait. Anything else (farm bait, floor bait, no bait) is farming. */
export function isPushing(content: Content, p: PlayerState): boolean {
  return content.items.baits.find((b) => b.id === p.setup.bait)?.role === 'push';
}

/** How strongly Cheer boons count right now: `pushScale` while pushing, `farmScale` while farming. */
export function cheerScale(content: Content, p: PlayerState): number {
  const c = content.constants.cheer;
  return isPushing(content, p) ? c.pushScale : c.farmScale;
}

/**
 * Combines the active Cheer boons and event buffs. Cheer boons stack with each other. Where an event buff and a
 * Cheer boon both change trap power, only the higher bonus counts; hexes (power below 1) always apply on top.
 */
export function modsOf(content: Content, p: PlayerState): Mods {
  const m = noMods();
  let cheerPower = 1;
  // Cheer boons are weaker while farming and stronger while pushing: numeric bonuses scale by the context.
  const scale = cheerScale(content, p);
  const sc = (x: number) => 1 + (x - 1) * scale;
  for (const a of p.cheer?.active ?? []) {
    const e = content.boons.find((b) => b.id === a.id)?.effect;
    if (!e) continue;
    if (e.goldMult) m.goldMult *= sc(e.goldMult);
    if (e.pointsMult) m.pointsMult *= sc(e.pointsMult);
    if (e.freeBait) m.freeBait = true;
    if (e.powerMult) cheerPower *= sc(e.powerMult);
    if (e.luckAdd) m.luckAdd += e.luckAdd * scale;
    if (e.attractionBonus) m.attractionBonus += e.attractionBonus * scale;
    if (e.noPillage) m.noPillage = true;
    if (e.rareMult) m.allureMult *= sc(e.rareMult);
    if (e.lootMult) m.lootMult *= sc(e.lootMult);
    if (e.minLoot) m.minLoot = Math.max(m.minLoot, e.minLoot);
    if (e.mulligan) m.mulligan = true;
    if (e.bossBell) m.bossBell = true;
    if (e.pipMult) m.pipMult *= e.pipMult;
    if (e.freeEscape) m.freeEscape = true;
  }
  let eventPower = 1;
  let hex = 1;
  for (const b of p.events?.buffs ?? []) {
    switch (b.stat) {
      case 'powerMult': if (b.value >= 1) eventPower = Math.max(eventPower, b.value); else hex *= b.value; break;
      case 'luckMult': m.luckMult *= b.value; break;
      case 'luckAdd': m.luckAdd += b.value; break;
      case 'allureMult': m.allureMult *= b.value; break;
      case 'goldPointsMult': m.ticket = Math.max(m.ticket, b.value); break;
      case 'noPillage': m.shield = true; break;
      case 'baitCost': m.baitCost = Math.max(m.baitCost, b.value); break;
      case 'bossShield': m.bossShield = Math.max(m.bossShield, b.value); break;
    }
  }
  m.powerMult = Math.max(cheerPower, eventPower) * hex;
  return m;
}
