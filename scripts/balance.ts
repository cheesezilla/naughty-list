/**
 * Balance check: catch rates for every trap x base x charm against every elf, judged against thresholds.
 * Uses the real engine formula (setupStats + catchChance + luckFactor), so it never drifts from the game.
 *
 *   npm run balance                      # print the report and the flags
 *   npm run balance -- --write           # also rewrite the generated block in docs/BALANCE.md
 *   npm run balance -- --check           # warn when docs/BALANCE.md is out of date
 *   npm run balance -- --ci              # GitHub Actions: ::warning:: lines and a job summary
 *   npm run balance -- --csv out.csv     # every trap x base x charm x elf rate
 *   npm run balance -- --content dir     # another content folder (for example a PR's)
 *   npm run balance -- --strict          # exit 1 when any flag is raised (advisory by default)
 *
 * Thresholds live in balance/thresholds.json. Ignores boons, events and Cheer: this is the gear-only baseline.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { loadContent } from '../src/content/load.js';
import type { Content, Imp, Location } from '../src/content/schema.js';
import { baitGoldValue, gameData } from '../src/engine/data.js';
import { goldFalloff, allureFactor, baitWorksHere, catchChance, huntOdds, impWeights, luckFactor, setupStats } from '../src/engine/odds.js';

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(`--${n}`);
const val = (n: string) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };

const content: Content = loadContent(val('content') ?? 'content');
const T = JSON.parse(readFileSync(val('thresholds') ?? 'balance/thresholds.json', 'utf8'));
const data = gameData(content);
const I = content.items;
const DOC = 'docs/BALANCE.md';
const START = '<!-- balance:generated:start -->';
const END = '<!-- balance:generated:end -->';

type Setup = { trap: string; base: string; charm: string | null };
const name = (id: string | null) => (id ? data.items.get(id)?.name ?? id : 'no charm');
const pc = (x: number) => `${(x * 100).toFixed(1)}%`;
const pp = (x: number) => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1)}`;
const impName = (id: string) => data.imps.get(id)?.name ?? id;
const locOf = (id: string) => data.locations.get(id)!;

const rateOf = (s: Setup, imp: Imp, loc: Location): number =>
  catchChance(setupStats(content, { ...s, bait: null }, loc), imp, content.constants.catchCap, luckFactor(content.constants, imp));

const allTraps = I.traps.map((t) => t.id);
const allBases = I.bases.map((b) => b.id);
const statCharms = I.charms.filter((c) => c.power !== undefined || c.luck !== undefined || c.powerBonus !== undefined);
const allCharms: (string | null)[] = [null, ...statCharms.map((c) => c.id)];

function best(imp: Imp, loc: Location, traps: string[], bases: string[], charms: (string | null)[] = [null]) {
  let top = { rate: -1, setup: { trap: '', base: '', charm: null } as Setup };
  for (const trap of traps) for (const base of bases) for (const charm of charms) {
    const r = rateOf({ trap, base, charm }, imp, loc);
    if (r > top.rate) top = { rate: r, setup: { trap, base, charm } };
  }
  return top;
}
const fmt = (s: Setup) => `${name(s.trap)} + ${name(s.base)}${s.charm ? ` + ${name(s.charm)}` : ''}`;
const elves = content.locations.flatMap((l) => l.imps.map((imp) => ({ imp, loc: l })));
const commonsRate = (loc: Location, s: Setup) => {
  const cs = loc.imps.filter((i) => i.tier === 'common');
  const w = cs.reduce((n, i) => n + i.weight, 0) || 1;
  return cs.reduce((n, i) => n + (i.weight / w) * rateOf(s, i, loc), 0);
};

interface Flag { level: 'warn' | 'info'; rule: string; subject: string; message: string }
const flags: Flag[] = [];
const warn = (rule: string, subject: string, message: string) => flags.push({ level: 'warn', rule, subject, message });

const out: string[] = [];
const h = (t: string) => out.push('', t, '');
const table = (head: string[], rows: string[][]) => {
  out.push(`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`);
  for (const r of rows) out.push(`| ${r.join(' | ')} |`);
};

// ---- 1. Areas: commons bands, best fresh and endgame setups ------------------------------------------------------
h('### 1. Areas: commons catch rate with the intended gear');
{
  const rows: string[][] = [];
  for (const loc of content.locations) {
    const f = T.fresh[loc.id];
    if (!f) { warn('config', loc.id, `no fresh gear listed for ${loc.id} in thresholds.json`); continue; }
    const meant = best(loc.imps[0]!, loc, f.meant, [f.base]).setup; // placeholder to type the shape
    let bestM = { r: -1, s: meant };
    for (const trap of f.meant as string[]) {
      const s = { trap, base: f.base as string, charm: null };
      const r = commonsRate(loc, s);
      if (r > bestM.r) bestM = { r, s };
    }
    const band = T.commonsBands[loc.id] as [number, number] | undefined;
    let status = 'n/a';
    if (band) {
      const tol = T.commonsBands.tolerance;
      status = bestM.r < band[0] - tol ? 'too hard' : bestM.r > band[1] + tol ? 'too easy' : 'ok';
      if (status !== 'ok') warn('commons-band', loc.name, `commons are caught ${pc(bestM.r)} with ${fmt(bestM.s)}, target ${pc(band[0])} to ${pc(band[1])} (${status}).`);
    }
    let end = { r: -1, s: bestM.s };
    for (const trap of allTraps) for (const base of allBases) for (const charm of allCharms) {
      const s = { trap, base, charm };
      const r = commonsRate(loc, s);
      if (r > end.r) end = { r, s };
    }
    rows.push([loc.name, fmt(bestM.s), pc(bestM.r), band ? `${pc(band[0])} to ${pc(band[1])}` : '-', status, pc(end.r)]);
  }
  table(['Area', 'Intended gear', 'Commons caught', 'Target band', 'Status', 'Best possible (any gear)'], rows);
}

// ---- 1b. Every elf in every area: beginner gear vs endgame gear --------------------------------------------------
h('### 1b. Catch rate of every elf with three gear tiers: beginner, recommended, endgame');
out.push('**Beginner** = a player who has just entered the area with the gear they can have by then (the area\'s intended trap and base, no charm). **Recommended** = a player who has farmed the area and the one before it and earned the gear meant for beating the local boss (the gear docs/WIKI.md has players aim for, including optional crafts available at that point: best listed trap and base per elf, with the listed charm; see `recommended` in thresholds.json). **Endgame** = a player far above the area\'s rank who owns everything, including traps and bases from later areas that a player following the walkthrough cannot have yet: the best trap, base and charm for that elf. "Commons" rows are weighted by encounter weight.', '');
{
  const rows: string[][] = [];
  for (const loc of content.locations) {
    const f = T.fresh[loc.id];
    if (!f) continue;
    const rec = (f.meant as string[]).map((trap) => ({ trap, base: f.base as string, charm: null as string | null }));
    const recBest = (imp: Imp) => rec.reduce((a, s) => { const r = rateOf(s, imp, loc); return r > a.r ? { r, s } : a; }, { r: -1, s: rec[0]! });
    const endCommons = (() => {
      const cs = loc.imps.filter((i) => i.tier === 'common');
      const w = cs.reduce((n, i) => n + i.weight, 0) || 1;
      return cs.reduce((n, i) => n + (i.weight / w) * best(i, loc, allTraps, allBases, allCharms).rate, 0);
    })();
    const begCommons = Math.max(...rec.map((s) => commonsRate(loc, s)));
    const R = T.recommended?.[loc.id];
    const rg = ((R?.traps ?? []) as string[]).flatMap((trap) => ((R.bases ?? []) as string[]).map((base) => ({ trap, base, charm: (R.charm ?? null) as string | null })));
    const rgBest = (imp: Imp) => rg.reduce((a, s) => { const r = rateOf(s, imp, loc); return r > a.r ? { r, s } : a; }, { r: -1, s: rg[0]! });
    const recCommons = rg.length ? Math.max(...rg.map((s) => commonsRate(loc, s))) : NaN;
    const rp = (x: number) => (rg.length ? pc(x) : '-');
    rows.push([`**${loc.name}**`, `**Commons (all)**`, 'common', `**${pc(begCommons)}**`, `**${rp(recCommons)}**`, `**${pc(endCommons)}**`, 'best setup per elf, see below']);
    for (const imp of loc.imps) {
      const b = recBest(imp);
      const e = best(imp, loc, allTraps, allBases, allCharms);
      const g = rg.length ? rgBest(imp) : null;
      if (g && imp.tier === 'boss' && T.recommendedGap) {
        const gap = g.r - b.r;
        if (gap < T.recommendedGap.boss) warn('recommended-gap', imp.name, `with beginner gear ${pc(b.r)}, with the walkthrough's recommended gear ${pc(g.r)}: only ${pp(gap)} points better (eddy: recommended gear should be almost always needed to catch the local boss at a reasonable rate; minimum gain ${pp(T.recommendedGap.boss)} points).`);
      }
      rows.push([loc.name, imp.name, imp.tier, pc(b.r), g ? `${pc(g.r)} (${name(g.s.trap)} + ${name(g.s.base)})` : '-', pc(e.rate), fmt(e.setup)]);
    }
  }
  table(['Area', 'Elf', 'Tier', '1. Beginner gear', '2. Recommended gear (trap used)', '3. Endgame gear', 'Endgame setup'], rows);
  out.push('', 'Recommended gear per area: ' + content.locations.filter((l) => T.recommended?.[l.id]).map((l) => { const R = T.recommended[l.id]; return `${l.name}: ${(R.traps as string[]).map(name).join(' / ')} on ${(R.bases as string[]).map(name).join(' / ')}${R.charm ? ' + ' + name(R.charm) : ''}`; }).join('; ') + '.');
  out.push('', 'Beginner gear per area: ' + content.locations.filter((l) => T.fresh[l.id]).map((l) => `${l.name}: ${(T.fresh[l.id].meant as string[]).map(name).join(' or ')} + ${name(T.fresh[l.id].base)}`).join('; ') + '. Madame Shredwell is weak to Carol, so a beginner with a Carol Horn catches her much more often than the Star Lantern figure (see section 2).');
}

// ---- 1c. Gold profit per hunt per area ----------------------------------------------------------------------------
h('### 1c. Gold profit per hunt in every area: beginner, recommended, endgame gear');
out.push('Net gold per hunt = expected gold from catches (encounter weight x catch rate x elf gold, using the exact hunt odds) minus the price of the one bait a hunt uses. Every hunt uses one bait and the best bait is picked per area and tier (shop baits only; beginner and recommended players can only use baits up to the area\'s rank). Charms are left out (one-use, 25 to 90 gold each) and so are boons, events and pillage. Gear tiers are the same as 1b; for each tier the trap and base with the most net gold per hunt in that area are used. **Farm index** = endgame net gold per hunt here divided by the recommended net gold per hunt in the area the player would be progressing in (the highest-rank main area): below 100% means farming here with endgame gear pays less than hunting in the top area with recommended gear.', '');
const goldRows: { id: string; beg: number; rec: number; end: number }[] = [];
{
  const shopBaits = I.baits.filter((b) => b.price !== null && b.price !== undefined);
  const netBest = (loc: Location, sets: Setup[], maxRank: number) => {
    let top = { net: -Infinity, gold: 0, bait: '', price: 0, s: sets[0]! };
    for (const s of sets) for (const b of shopBaits) {
      if (b.rank > maxRank || !baitWorksHere(loc, b.id)) continue;
      const o = huntOdds(content, { ...s, bait: b.id }, loc.id);
      const net = o.expectedGold - (b.price as number);
      if (net > top.net) top = { net, gold: o.expectedGold, bait: b.id, price: b.price as number, s };
    }
    return top;
  };
  const allSets: Setup[] = allTraps.flatMap((trap) => allBases.map((base) => ({ trap, base, charm: null })));
  const rows: string[][] = [];
  for (const loc of content.locations) {
    const f = T.fresh[loc.id];
    if (!f) continue;
    const R = T.recommended?.[loc.id];
    const begSets = (f.meant as string[]).map((trap) => ({ trap, base: f.base as string, charm: null as string | null }));
    const recSets = R ? (R.traps as string[]).flatMap((trap) => (R.bases as string[]).map((base) => ({ trap, base, charm: null as string | null }))) : [];
    const beg = netBest(loc, begSets, loc.rank);
    const rec = recSets.length ? netBest(loc, recSets, loc.rank) : null;
    const end = netBest(loc, allSets, 99);
    goldRows.push({ id: loc.id, beg: beg.net, rec: rec ? rec.net : NaN, end: end.net });
    const cell = (x: typeof beg | null) => (x ? `${x.net.toFixed(0)} (gold ${x.gold.toFixed(0)}, ${name(x.bait)} ${x.price})` : '-');
    rows.push([loc.name, String(loc.rank), cell(beg), cell(rec), cell(end)]);
  }
  const main = content.locations.filter((l) => !l.side);
  const top = main.reduce((a, l) => (l.rank > a.rank ? l : a), main[0]!);
  const topRec = goldRows.find((g) => g.id === top.id)!.rec;
  for (const [i] of content.locations.entries()) rows[i]!.push(`${((goldRows[i]!.end / topRec) * 100).toFixed(0)}%`);
  table(['Area', 'Rank', '1. Beginner: net gold / hunt', '2. Recommended: net gold / hunt', '3. Endgame: net gold / hunt', `Farm index (endgame here vs recommended in ${top.name})`], rows);
}

// ---- 1d. Sleigh ride on and off (Reindeer Stables) ------------------------------------------------------------------
{
  const loc = content.locations.find((l) => l.objective?.type === 'sleigh_run');
  const ob: any = loc?.objective;
  const f = loc ? T.fresh[loc.id] : undefined;
  if (loc && ob && f) {
    h(`### 1d. ${loc.name}: gold per hunt with the sleigh run off and on`);
    out.push(`**Off** = hunting without starting a run (the 1c numbers). **On** = back-to-back sleigh runs: each run lasts up to ${ob.hunts} hunts, catches add Readiness (${Object.entries(ob.gain).map(([k, v]) => `${k} +${v}`).join(', ')}), escapes from ${Object.keys(ob.loss).map((id) => impName(id)).join(' and ')} take some away, and from ${ob.minibossFrom} Readiness ${impName(ob.miniboss)} comes at weight ${ob.minibossWeight}. While a run is on, each hunt costs ${ob.upkeep ?? 0} gold of upkeep and catches pay ${Math.round((ob.catchGoldMult ?? 1) * 100)}% of their gold. A launch (100 Readiness) pays ${ob.launchGold} gold; a run that times out pays ${ob.failGoldPerReadiness} gold per Readiness. Solved exactly over every Readiness and hunts-left state, with the cheapest-net bait (the same as 1c, so the bait cost is small). Left out: the launch item (${Object.keys(ob.launchItems).join(', ')}), the forced ${impName(ob.boss)} fight after ${ob.bossAfterLaunches} launches, pillage.`, '');
    const shop = I.baits.filter((b) => b.price !== null && b.price !== undefined);
    const allSets: Setup[] = allTraps.flatMap((trap) => allBases.map((base) => ({ trap, base, charm: null })));
    const run = (s: Setup, baitId: string, price: number) => {
      const stats = setupStats(content, { ...s, bait: baitId }, loc);
      const ws = impWeights(data, loc, baitId, allureFactor(content.constants, stats.attraction));
      const wsHot = ws.map((w, j) => (loc.imps[j]!.id === ob.miniboss ? ob.minibossWeight : w));
      const dist = (w: number[]) => { const t = w.reduce((a, b) => a + b, 0) || 1; return loc.imps.map((imp, j) => ({ imp, p: w[j]! / t, c: catchChance(stats, imp, content.constants.catchCap, luckFactor(content.constants, imp)) })); };
      const cold = dist(ws), hot = dist(wsHot);
      // G[left][r]: expected gold (catch gold + payouts) and T: expected hunts, from this state until the run ends.
      const G: number[][] = [], Tm: number[][] = [], L: number[][] = [];
      for (let left = 0; left <= ob.hunts; left++) { G.push(new Array(101).fill(0)); Tm.push(new Array(101).fill(0)); L.push(new Array(101).fill(0)); }
      for (let left = 1; left <= ob.hunts; left++) for (let r = 0; r < 100; r++) {
        let g = -(ob.upkeep ?? 0), t = 1, l = 0;
        for (const o of (r >= ob.minibossFrom ? hot : cold)) {
          const gain = (ob.gain as Record<string, number>)[o.imp.tier] ?? 0;
          const outcomes: [number, number, number][] = [[o.c, Math.min(100, r + gain), o.imp.gold * (ob.catchGoldMult ?? 1)], [1 - o.c, Math.max(0, r - ((ob.loss as Record<string, number>)[o.imp.id] ?? 0)), 0]];
          for (const [pr, r2, gold] of outcomes) {
            const w = o.p * pr;
            if (w === 0) continue;
            let eg = gold, et = 0, el = 0;
            if (r2 >= 100) { eg += ob.launchGold; el = 1; }
            else if (left - 1 <= 0) eg += Math.round(r2 * ob.failGoldPerReadiness);
            else { eg += G[left - 1]![r2]!; et = Tm[left - 1]![r2]!; el = L[left - 1]![r2]!; }
            g += w * eg; t += w * et; l += w * el;
          }
        }
        G[left]![r] = g; Tm[left]![r] = t; L[left]![r] = l;
      }
      const off = huntOdds(content, { ...s, bait: baitId }, loc.id).expectedGold;
      return { off, on: G[ob.hunts]![0]! / Tm[ob.hunts]![0]!, hunts: Tm[ob.hunts]![0]!, launches: L[ob.hunts]![0]!, price };
    };
    const pick = (sets: Setup[], maxRank: number) => {
      let top: ReturnType<typeof run> & { s: Setup; bait: string } | null = null;
      for (const s of sets) for (const b of shop) {
        if (b.rank > maxRank || !baitWorksHere(loc, b.id)) continue;
        const r = run(s, b.id, b.price as number);
        if (!top || r.on - r.price > top.on - top.price) top = { ...r, s, bait: b.id };
      }
      return top!;
    };
    const R = T.recommended?.[loc.id];
    const tiers: [string, Setup[], number][] = [
      ['1. Beginner', (f.meant as string[]).map((trap) => ({ trap, base: f.base as string, charm: null })), loc.rank],
      ['2. Recommended', R ? (R.traps as string[]).flatMap((trap) => (R.bases as string[]).map((base) => ({ trap, base, charm: null }))) : [], loc.rank],
      ['3. Endgame', allSets, 99],
    ];
    const rows: string[][] = [];
    for (const [label, sets, mr] of tiers) {
      if (!sets.length) continue;
      const r = pick(sets, mr);
      rows.push([label, fmt(r.s), r.off.toFixed(0), r.on.toFixed(0), `${(r.on - r.off >= 0 ? '+' : '')}${(((r.on / r.off) - 1) * 100).toFixed(0)}%`, r.hunts.toFixed(1), `${(r.launches * 100).toFixed(0)}%`, `${(r.off - r.price).toFixed(0)} / ${(r.on - r.price).toFixed(0)}`]);
    }
    table(['Gear', 'Setup used', 'Gold / hunt, ride off', 'Gold / hunt, ride on (after upkeep)', 'On vs off', 'Hunts per run', 'Runs that launch', 'Net per hunt after bait (off / on)'], rows);
  }
}

// ---- 1e. Farm and push stages ---------------------------------------------------------------------------------------
h('### 1e. Farm and push: the loop in every area');
out.push('The loop (eddy, 28 Nov): **farm** a stage with its cheap bait to earn gold, **push** a boss or progress with its pricey bait (a sink: it costs more per hunt than it earns, and returns keys, crafting loot and portraits that gold cannot buy), then repeat. Numbers are net gold per hunt with Recommended gear (as 1c) at the highest rank the area still pays in full (area rank + grace). Farm = best cheap `farm` bait; Push = the priciest `push` bait (crafted bait is priced at its recipe gold per bait, materials left out). **Falloff** = the share of catch gold paid to a rank 5 player; **Endgame farm** = farm net per hunt with endgame gear at rank 5 with that falloff applied.', '');
const econ = T.economy as { farmMinNet: Record<string, number>; sinkMinPushCost: Record<string, number>; campMargin: number };
{
  const shop = I.baits;
  const finalRank = content.ranks.at(-1)!.rank;
  const bestNet = (loc: Location, sets: Setup[], role: 'farm' | 'push', rank: number) => {
    let top = { net: -Infinity, bait: '', price: -1 };
    for (const s of sets) for (const b of shop) {
      if (b.role !== role || !baitWorksHere(loc, b.id) || b.rank > loc.rank + 1) continue;
      const price = baitGoldValue(data, b.id);
      if (role === 'farm' && b.price === null) continue;
      const net = huntOdds(content, { ...s, bait: b.id }, loc.id, rank).expectedGold - price;
      // Farming takes the bait that nets the most; pushing takes the priciest push bait (the sink end of the loop).
      if (role === 'farm' ? net > top.net : price > top.price) top = { net, bait: b.id, price };
    }
    return top;
  };
  const rows: string[][] = [];
  const farmNets: Record<string, number> = {};
  const endNets: Record<string, number> = {};
  const allSets: Setup[] = allTraps.flatMap((trap) => allBases.map((base) => ({ trap, base, charm: null })));
  for (const loc of content.locations) {
    const R = T.recommended?.[loc.id];
    if (!R || !loc.role) continue;
    const sets = (R.traps as string[]).flatMap((trap) => (R.bases as string[]).map((base) => ({ trap, base, charm: null as string | null })));
    const rank = loc.rank + content.constants.goldFalloff.grace;
    const farm = bestNet(loc, sets, 'farm', rank);
    const push = bestNet(loc, sets, 'push', rank);
    const end = bestNet(loc, allSets, 'farm', finalRank);
    farmNets[loc.id] = farm.net; endNets[loc.id] = end.net;
    const fall = goldFalloff(content.constants, loc, finalRank);
    rows.push([loc.name, loc.role, farm.net.toFixed(0) + ` (${name(farm.bait)} ${farm.price})`, push.net > -Infinity ? push.net.toFixed(0) + ` (${name(push.bait)} ${push.price})` : '-', push.net > -Infinity ? (farm.net - push.net).toFixed(0) : '-', `${(fall * 100).toFixed(0)}%`, end.net.toFixed(0)]);
    const min = econ.farmMinNet[loc.id];
    if (loc.role === 'farm' && min !== undefined && farm.net < min) warn('economy', `${loc.name} farm`, `Farm stage earns ${farm.net.toFixed(0)} net gold per hunt with recommended gear, under the ${min} target.`);
    if (loc.role === 'sink' && push.net > -Infinity && push.net >= farm.net) warn('economy', `${loc.name} sink`, `Pushing earns ${push.net.toFixed(0)} net gold per hunt, no less than farming (${farm.net.toFixed(0)}): a sink should cost gold compared with farming.`);
    const minCost = econ.sinkMinPushCost[loc.id];
    if (loc.role === 'sink' && minCost !== undefined && push.price < minCost) warn('economy', `${loc.name} push bait`, `Push bait costs ${push.price} gold per hunt, under the ${minCost} that makes pushing a real spend.`);
  }
  table(['Area', 'Stage', 'Farm: net gold / hunt (bait, cost)', 'Push: net gold / hunt (bait, cost)', 'Push premium (farm minus push)', 'Falloff at rank 5', 'Endgame farm net at rank 5'], rows);
  const mainFarm = Math.max(...Object.entries(farmNets).filter(([id]) => !locOf(id).side).map(([, v]) => v));
  for (const loc of content.locations) {
    if (endNets[loc.id] === undefined || loc.rank >= Math.max(...content.locations.map((l) => l.rank))) continue;
    if (endNets[loc.id]! > mainFarm * econ.campMargin) warn('economy', `${loc.name} camping`, `An outranked ${loc.name} still pays ${endNets[loc.id]!.toFixed(0)} net gold per hunt at rank 5 with endgame gear, over ${(econ.campMargin * 100).toFixed(0)}% of the best farm (${mainFarm.toFixed(0)}).`);
  }
}

// ---- 2. Elves: fresh vs endgame -----------------------------------------------------------------------------------
h('### 2. Rare, mini boss and boss catch rates: fresh player vs endgame gear');
out.push('Fresh = the best trap the player could own on entering the area, on the area\'s base, no charm. Endgame = best trap, base and charm of everything in the game. Best setup per elf.', '');
{
  const rows: string[][] = [];
  const bands = T.tiers as Record<string, { freshMin: number; freshMax: number; endgameMin: number; endgameMax: number }>;
  for (const { imp, loc } of elves) {
    if (imp.tier === 'common' || imp.tier === 'uncommon') continue;
    const f = T.fresh[loc.id];
    if (!f) continue;
    const fresh = best(imp, loc, f.traps, [f.base]);
    const end = best(imp, loc, allTraps, allBases, allCharms);
    const notes: string[] = [];
    const targets = (T.elfTargets as any[]).filter((t) => t.elf === imp.id);
    for (const t of targets) {
      const traps = (f.traps as string[]).filter((id) => (t.traps ?? '').startsWith('only:') ? data.items.get(id) && (data.items.get(id) as any).type === t.traps.slice(5) : (t.traps ?? '').startsWith('not:') ? (data.items.get(id) as any).type !== t.traps.slice(4) : true);
      const r = t.profile === 'fresh' ? best(imp, loc, traps, [f.base]) : best(imp, loc, allTraps, allBases, allCharms);
      const ok = Math.abs(r.rate - t.target) <= t.tolerance;
      notes.push(`${t.profile}${t.traps ? ` ${t.traps}` : ''}: ${pc(r.rate)} vs target ${pc(t.target)} ${ok ? 'ok' : 'MISS'}`);
      if (!ok) warn('elf-target', imp.name, `${t.profile} ${t.traps ?? ''} catch rate is ${pc(r.rate)} with ${fmt(r.setup)}, target ${pc(t.target)} +/- ${pc(t.tolerance)} (${t.why}).`);
    }
    const b = bands[imp.tier];
    if (b && targets.length === 0) {
      if (fresh.rate > b.freshMax) warn('too-easy', imp.name, `${imp.tier} is caught ${pc(fresh.rate)} by a fresh player (${fmt(fresh.setup)}); ceiling ${pc(b.freshMax)}.`);
      if (fresh.rate < b.freshMin) warn('too-hard-fresh', imp.name, `${imp.tier} is caught only ${pc(fresh.rate)} by a fresh player (${fmt(fresh.setup)}); floor ${pc(b.freshMin)}.`);
      if (end.rate > b.endgameMax) warn('too-easy-endgame', imp.name, `${imp.tier} is caught ${pc(end.rate)} with endgame gear (${fmt(end.setup)}); ceiling ${pc(b.endgameMax)}.`);
      if (end.rate < b.endgameMin) warn('near-impossible', imp.name, `${imp.tier} is caught only ${pc(end.rate)} even with endgame gear (${fmt(end.setup)}); floor ${pc(b.endgameMin)}.`);
    }
    rows.push([imp.name, loc.name, imp.tier, String(imp.power), `${pc(fresh.rate)} (${fmt(fresh.setup)})`, `${pc(end.rate)} (${fmt(end.setup)})`, notes.join('; ') || '-']);
  }
  table(['Elf', 'Area', 'Tier', 'Power', 'Fresh player', 'Endgame gear', 'Targets'], rows);
}

// ---- 3. Cheese: gear that trivialises an area it was not designed for ---------------------------------------------
h('### 3. Cheese check: fresh gear that outclasses the area\'s intended gear');
{
  const rows: string[][] = [];
  const bands = T.tiers as Record<string, { freshMax: number }>;
  for (const loc of content.locations) {
    const f = T.fresh[loc.id];
    if (!f) continue;
    const meantBest = Math.max(...(f.meant as string[]).map((trap) => commonsRate(loc, { trap, base: f.base, charm: null })));
    for (const trap of f.traps as string[]) {
      if ((f.meant as string[]).includes(trap)) continue;
      const s = { trap, base: f.base as string, charm: null };
      const c = commonsRate(loc, s);
      const lead = c - meantBest;
      const bad: string[] = [];
      const meantRank = Math.max(...(f.meant as string[]).map((id) => (data.items.get(id) as any).rank));
      const earlier = (data.items.get(trap) as any).rank < meantRank;
      if (lead > T.cheese.margin) bad.push(`commons ${pc(c)} (${pp(lead)} pts over the intended gear)`);
      else if (earlier && lead > -T.cheese.matchMargin) bad.push(`commons ${pc(c)} (${pp(lead)} pts vs the intended gear, but it is a rank ${(data.items.get(trap) as any).rank} trap in a rank ${meantRank} area)`);
      for (const { imp } of elves.filter((e) => e.loc.id === loc.id && (e.imp.tier === 'boss' || e.imp.tier === 'miniboss'))) {
        if (data.imps.get(imp.id) && imp.tier && (T.elfTargets as any[]).some((t) => t.elf === imp.id)) continue;
        const r = rateOf(s, imp, loc);
        if (r > bands[imp.tier]!.freshMax) bad.push(`${imp.name} ${pc(r)}`);
      }
      rows.push([loc.name, `${name(trap)} (${(data.items.get(trap) as any).type})`, pc(c), pp(lead), bad.length ? 'FLAG' : 'ok']);
      if (bad.length) warn('cheese', `${name(trap)} in ${loc.name}`, `${name(trap)} (rank ${(data.items.get(trap) as any).rank}, ${(data.items.get(trap) as any).type}, luck ${(data.items.get(trap) as any).luck}) on ${name(f.base)}: ${bad.join(', ')}. Intended gear gets ${pc(meantBest)} on commons.`);
    }
  }
  table(['Area', 'Other trap the player may own', 'Commons caught', 'vs intended gear (pts)', 'Status'], rows);
}

// ---- 4. Traps: niche / obsolete -----------------------------------------------------------------------------------
h('### 4. Traps: does each one have a niche?');
out.push('Niche = elves it catches best of all traps of its own rank or lower, using the best base of that rank or lower. A trap with no niche is dominated by something cheaper or earlier.', '');
{
  const rows: string[][] = [];
  for (const t of I.traps) {
    const pool = I.traps.filter((o) => o.rank <= t.rank).map((o) => o.id);
    const bases = I.bases.filter((b) => b.rank <= t.rank).map((b) => b.id);
    const mine = elves.filter((e) => e.loc.rank >= t.rank);
    let niche = 0, endNiche = 0;
    const leads: string[] = [];
    for (const { imp, loc } of mine) {
      const self = best(imp, loc, [t.id], bases).rate;
      const other = pool.filter((id) => id !== t.id);
      const o = other.length ? best(imp, loc, other, bases).rate : 0;
      if (self - o >= T.obsolete.minLead) { niche++; if (leads.length < 3) leads.push(imp.name); }
    }
    for (const { imp, loc } of elves) {
      const self = best(imp, loc, [t.id], allBases, allCharms).rate;
      const o = best(imp, loc, allTraps.filter((id) => id !== t.id), allBases, allCharms).rate;
      if (self - o >= T.obsolete.minLead) endNiche++;
    }
    const exempt = (T.obsolete.exempt as string[]).includes(t.id);
    rows.push([t.name, t.type, String(t.rank), t.price === null ? 'crafted/start' : String(t.price), `${niche} of ${mine.length}`, `${endNiche} of ${elves.length}`, exempt ? 'starter' : niche === 0 ? 'FLAG' : 'ok']);
    if (!exempt && niche === 0) warn('obsolete-trap', t.name, `${t.name} (${t.type}, rank ${t.rank}) is not the best trap of its own tier for any elf at or above its rank; it is dominated.`);
  }
  table(['Trap', 'Type', 'Rank', 'Price', 'Elves where best of its tier', 'Elves where best at endgame', 'Status'], rows);
}

// ---- 5. Optional and crafted gear: benefit vs cost ----------------------------------------------------------------
h('### 5. Gear value: how much does each trap and base add, and what does it cost?');
out.push('Gain = mean change in catch rate (best setup per elf) from owning the item, over **mini bosses and bosses** and over **all elves**, in areas of the item\'s rank or higher. "On arrival" counts only gear of its own rank or lower; "lasting" counts everything in the game. Cost = gold plus crafting materials.', '');
{
  const rows: string[][] = [];
  const costOf = (id: string) => {
    const item = data.items.get(id) as any;
    const r = content.recipes.find((x) => x.output.item === id);
    const mats = r ? Object.values(r.ingredients).reduce((n: number, v) => n + (v as number), 0) : 0;
    return { gold: (item.price ?? 0) + (r?.gold ?? 0), mats, craft: !!r };
  };
  const gainFor = (id: string, kind: 'trap' | 'base', arrival: boolean) => {
    const item = data.items.get(id) as any;
    const sel = elves.filter((e) => (arrival ? e.loc.rank === item.rank : e.loc.rank >= item.rank));
    const later = T.craftValue.laterOnly as string[];
    const inPool = (x: { id: string; rank: number }) => !arrival || (x.rank <= item.rank && (!later.includes(x.id) || x.id === id));
    const poolT = I.traps.filter(inPool).map((t) => t.id);
    const poolB = I.bases.filter(inPool).map((b) => b.id);
    const charms = arrival ? allCharms.filter((c) => !c || (data.items.get(c) as any).rank <= item.rank) : allCharms;
    const bossG: number[] = [], allG: number[] = [];
    for (const { imp, loc } of sel) {
      const w = best(imp, loc, poolT, poolB, charms).rate;
      const wo = best(imp, loc, kind === 'trap' ? poolT.filter((x) => x !== id) : poolT, kind === 'base' ? poolB.filter((x) => x !== id) : poolB, charms).rate;
      allG.push(w - wo);
      if (imp.tier === 'boss' || imp.tier === 'miniboss') bossG.push(w - wo);
    }
    const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
    return { boss: avg(bossG), all: avg(allG) };
  };
  const items = [...I.traps.map((t) => ({ id: t.id, kind: 'trap' as const })), ...I.bases.map((b) => ({ id: b.id, kind: 'base' as const }))];
  for (const { id, kind } of items) {
    const item = data.items.get(id) as any;
    if (item.rank <= 1 && item.price === null) continue; // starters
    const cost = costOf(id);
    const a = gainFor(id, kind, true);
    const l = gainFor(id, kind, false);
    const costText = `${cost.gold.toLocaleString('en')} gold${cost.mats ? ` + ${cost.mats} materials` : ''}${item.price === null && !cost.craft ? ' (reward)' : ''}`;
    const goodFor = item.goodFor ? ` (${item.goodFor})` : '';
    const lowArrival = a.boss < T.craftValue.minBossGain && a.all < T.craftValue.minAllGain;
    const lowLasting = l.boss < T.craftValue.minBossGain && l.all < T.craftValue.minAllGain;
    const expensive = cost.gold >= T.craftValue.minCost || cost.mats > 0;
    let status = lowArrival && expensive ? (lowLasting ? 'FLAG: no value' : 'FLAG: low value on arrival') : lowLasting ? 'replaced later' : 'ok';
    rows.push([`${item.name}${goodFor}`, kind, String(item.rank), costText, `${pp(a.boss)} / ${pp(a.all)}`, `${pp(l.boss)} / ${pp(l.all)}`, status]);
    if (status.startsWith('FLAG')) warn('low-value-gear', item.name, `${item.name} costs ${costText} and adds ${pp(a.boss)} pts (bosses) / ${pp(a.all)} pts (all elves) on arrival and ${pp(l.boss)} / ${pp(l.all)} over the long run (${status.slice(6)}).`);
  }
  table(['Item', 'Kind', 'Rank', 'Cost', 'On arrival: bosses / all (pts)', 'Lasting: bosses / all (pts)', 'Status'], rows);
}

// ---- 6. Charms ----------------------------------------------------------------------------------------------------
h('### 6. Charms: what a catch charm adds on top of the best setup');
{
  const rows: string[][] = [];
  for (const c of statCharms) {
    const bossG: number[] = [], allG: number[] = [], commonG: number[] = [];
    for (const { imp, loc } of elves) {
      const without = best(imp, loc, allTraps, allBases, [null]).rate;
      const withC = best(imp, loc, allTraps, allBases, [null, c.id]).rate;
      allG.push(withC - without);
      if (imp.tier === 'boss' || imp.tier === 'miniboss') bossG.push(withC - without);
      if (imp.tier === 'common') commonG.push(withC - without);
    }
    const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
    const st = avg(allG) < T.charmValue.minAllGain ? 'FLAG: negligible' : avg(bossG) > T.charmValue.maxBossGain ? 'FLAG: too strong' : 'ok';
    rows.push([c.name, `${(c as any).power ?? 0} power / ${(c as any).powerBonus ? `+${(c as any).powerBonus * 100}%` : '0%'} / ${(c as any).luck ?? 0} luck`, String((c as any).price), `${pp(avg(commonG))}`, `${pp(avg(bossG))}`, `${pp(avg(allG))}`, st]);
    if (st.startsWith('FLAG')) warn('charm', c.name, `${c.name}: ${st.slice(6)} (adds ${pp(avg(commonG))} pts on commons, ${pp(avg(bossG))} on bosses and mini bosses, ${pp(avg(allG))} overall to the best setup).`);
  }
  table(['Charm', 'Stats', 'Price', 'Commons (pts)', 'Mini bosses and bosses (pts)', 'All elves (pts)', 'Status'], rows);
  out.push('', 'Attraction and Cheer charms (Jingle Bell, Cheer charms) do not change catch chance and are not measured here.');
}

// ---- 7. Best setups per area --------------------------------------------------------------------------------------
h('### 7. Top setups in each area (commons, every trap x base x charm)');
{
  const rows: string[][] = [];
  for (const loc of content.locations) {
    const all: { s: Setup; r: number }[] = [];
    for (const trap of allTraps) for (const base of allBases) for (const charm of allCharms) {
      const s = { trap, base, charm };
      all.push({ s, r: commonsRate(loc, s) });
    }
    all.sort((a, b) => b.r - a.r);
    rows.push([loc.name, all.slice(0, 3).map((x) => `${fmt(x.s)} ${pc(x.r)}`).join('<br>')]);
  }
  table(['Area', 'Top 3 for commons'], rows);
}

// ---- Flags --------------------------------------------------------------------------------------------------------
const acceptedList = (T.accepted ?? []) as { rule: string; subject: string; why: string }[];
const isAccepted = (f: Flag) => acceptedList.find((a) => a.rule === f.rule && a.subject === f.subject);
const open = flags.filter((f) => !isAccepted(f));
const accepted = flags.filter((f) => isAccepted(f));
flags.length = 0;
flags.push(...open);
const flagText: string[] = [];
flagText.push('', `### Flags (${open.length})`, '');
if (open.length === 0) flagText.push('No open flags: every check is inside the thresholds, or the flag is accepted in `balance/thresholds.json`.');
for (const f of open) flagText.push(`- **${f.rule}** · ${f.subject}: ${f.message}`);
if (accepted.length) {
  flagText.push('', `Accepted by design (${accepted.length}, listed under \`accepted\` in \`balance/thresholds.json\`):`, '');
  for (const f of accepted) flagText.push(`- ${f.rule} · ${f.subject}: ${isAccepted(f)!.why}`);
}

const stamp = `Generated by \`npm run balance\` from \`content/*.json\` and \`balance/thresholds.json\`. Do not edit by hand; run \`npm run balance -- --write\`.`;
const generated = [START, stamp, ...flagText, ...out, END].join('\n');

if (flag('csv') || val('csv')) {
  const lines = ['area,elf,tier,trap,base,charm,catch_rate'];
  for (const { imp, loc } of elves) for (const trap of allTraps) for (const base of allBases) for (const charm of allCharms) {
    lines.push([loc.id, imp.id, imp.tier, trap, base, charm ?? '', rateOf({ trap, base, charm }, imp, loc).toFixed(4)].join(','));
  }
  writeFileSync(val('csv') ?? 'balance-matrix.csv', lines.join('\n') + '\n');
  console.log(`Wrote ${lines.length - 1} rows.`);
}

if (flag('write')) {
  const doc = existsSync(DOC) ? readFileSync(DOC, 'utf8') : `# Balance check\n\n${START}\n${END}\n`;
  const a = doc.indexOf(START), b = doc.indexOf(END);
  if (a < 0 || b < 0) throw new Error(`${DOC} is missing the generated block markers`);
  writeFileSync(DOC, doc.slice(0, a) + generated + doc.slice(b + END.length));
  console.log(`Updated ${DOC}.`);
} else if (!flag('ci') && !flag('check')) {
  console.log(generated.replace(START, '').replace(END, ''));
}

if (flag('check') || flag('ci')) {
  const doc = existsSync(DOC) ? readFileSync(DOC, 'utf8') : '';
  const a = doc.indexOf(START), b = doc.indexOf(END);
  const stale = a < 0 || b < 0 || doc.slice(a, b + END.length) !== generated;
  if (stale) {
    const msg = `${DOC} is out of date: run "npm run balance -- --write" and commit it.`;
    console.log(flag('ci') ? `::warning title=Balance doc stale::${msg}` : `WARNING: ${msg}`);
  }
}
if (flag('ci')) {
  for (const f of flags) console.log(`::warning title=Balance: ${f.rule}::${f.subject}: ${f.message.replace(/\n/g, ' ')}`);
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary) writeFileSync(summary, `## Balance check (advisory)\n${flagText.join('\n')}\n`, { flag: 'a' });
  console.log(`Balance check: ${flags.length} flag(s). Advisory: not blocking.`);
}
if (flag('strict') && flags.length > 0) process.exit(1);
