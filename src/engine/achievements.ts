import { powerTypes, type Achievement, type AchievementStat, type Content } from '../content/schema.js';
import { gameData } from './data.js';
import { count, type PlayerState } from './player.js';

/** Things only the server knows, for rules like the leaderboard one. */
export interface AchievementContext {
  /** True when this player is first on the Hunters leaderboard by points. */
  topHunter?: boolean;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** The current value of a stat an achievement counts. Derived from the save where it can be, so old saves count too. */
export function statValue(content: Content, p: PlayerState, stat: AchievementStat): number {
  const data = gameData(content);
  const t = p.tally ?? {};
  const objectives = Object.values(p.objectives ?? {});
  switch (stat) {
    case 'hunts': return p.stats.hunts;
    case 'caught': return p.stats.caught;
    case 'escapes': return p.stats.attracted - p.stats.caught;
    case 'goldEarned': return p.stats.goldEarned ?? 0;
    case 'pillaged': return p.stats.pillaged ?? 0;
    case 'unlocked': return p.unlocked.length;
    case 'bossesCaught':
      return sum(Object.entries(p.catches).map(([id, n]) => {
        const tier = data.imps.get(id)?.tier;
        return tier === 'miniboss' || tier === 'boss' ? n : 0;
      }));
    case 'ordersDone': return sum(objectives.map((s) => (s.type === 'order_board' ? s.ordersDone : 0)));
    case 'launches': return sum(objectives.map((s) => (s.type === 'sleigh_run' ? s.launches : 0)));
    case 'newTrap': return Math.max(t.newTrap ?? 0, p.setup.trap !== content.constants.startingSetup.trap ? 1 : 0);
    default: return t[stat] ?? 0;
  }
}

/** Imps a collection rule asks for. */
function collectionImps(content: Content, rule: { location?: string; tier?: string }): string[] {
  return content.locations
    .filter((l) => !rule.location || l.id === rule.location)
    .flatMap((l) => l.imps)
    .filter((i) => !rule.tier || i.tier === rule.tier)
    .map((i) => i.id);
}

/** Progress towards an achievement: `have` of `need`. Rules without a count report 0 or 1 of 1. */
export function achievementProgress(content: Content, p: PlayerState, a: Achievement, ctx: AchievementContext = {}): { have: number; need: number } {
  const w = a.when;
  const done = (ok: boolean) => ({ have: ok ? 1 : 0, need: 1 });
  switch (w.type) {
    case 'stat': return { have: Math.min(w.n, statValue(content, p, w.stat)), need: w.n };
    case 'rank': return done(p.rank >= w.rank);
    case 'catch': {
      const data = gameData(content);
      return done(Object.entries(p.catches).some(([id, n]) => n > 0 && (w.imp ? id === w.imp : data.imps.get(id)?.tier === w.tier)));
    }
    case 'collection': {
      const imps = collectionImps(content, w);
      return { have: imps.filter((id) => (p.catches[id] ?? 0) > 0).length, need: imps.length };
    }
    case 'craft': {
      const data = gameData(content);
      const kind = data.items.get(w.item)?.kind;
      // Crafted gear that is still owned counts for saves from before achievements.
      return done((p.tally?.[`craft:${w.item}`] ?? 0) > 0 || ((kind === 'trap' || kind === 'base') && count(p, w.item) > 0));
    }
    case 'own_all_types': {
      const owned = new Set(content.items.traps.filter((t) => count(p, t.id) > 0).map((t) => t.type));
      return { have: powerTypes.filter((t) => owned.has(t)).length, need: powerTypes.length };
    }
    case 'leaderboard': return done(!!ctx.topHunter);
  }
}

/**
 * Awards every achievement the player now qualifies for. Stores the time on the player and returns the new ids,
 * in catalogue order. Call it after each hunt and action.
 */
export function checkAchievements(content: Content, p: PlayerState, now: number, ctx: AchievementContext = {}): string[] {
  const earned = (p.achievements ??= {});
  const fresh: string[] = [];
  for (const a of content.achievements) {
    if (earned[a.id] !== undefined) continue;
    const { have, need } = achievementProgress(content, p, a, ctx);
    if (have >= need) {
      earned[a.id] = now;
      fresh.push(a.id);
    }
  }
  return fresh;
}
