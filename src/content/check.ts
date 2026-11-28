import type { Content } from './schema.js';

/** Finds broken links between content files: unknown item ids, duplicate ids, unsorted ranks, missing flavour text. */
export function checkReferences(c: Content): string[] {
  const problems: string[] = [];
  const all = [
    ...c.items.traps, ...c.items.bases, ...c.items.baits, ...c.items.charms, ...c.items.materials,
  ].map((i) => i.id);
  const known = new Set(all);
  const seen = new Set<string>();
  for (const i of all) {
    if (seen.has(i)) problems.push(`duplicate item id "${i}"`);
    seen.add(i);
  }
  const need = (itemId: string, where: string) => {
    if (!known.has(itemId)) problems.push(`${where} refers to unknown item "${itemId}"`);
  };

  const impIds = new Set<string>();
  const locIds = new Set<string>();
  for (const loc of c.locations) {
    if (locIds.has(loc.id)) problems.push(`duplicate location id "${loc.id}"`);
    locIds.add(loc.id);
    for (const b of loc.baits ?? []) need(b, `location ${loc.id} baits`);
    for (const imp of loc.imps) {
      if (impIds.has(imp.id)) problems.push(`duplicate imp id "${imp.id}"`);
      impIds.add(imp.id);
      for (const l of imp.loot ?? []) need(l.item, `imp ${imp.id} loot`);
      for (const b of Object.keys(imp.baitWeights ?? {})) need(b, `imp ${imp.id} baitWeights`);
    }
  }
  for (const loc of c.locations) {
    const o = loc.objective;
    const imp = (impId: string, what: string) => {
      if (!loc.imps.some((i) => i.id === impId)) problems.push(`location ${loc.id} objective ${what} "${impId}" is not one of its imps`);
    };
    if (c.story && !c.story.locations?.[loc.id]) problems.push(`location ${loc.id} has no intro and hint in story.json`);
    if (!o) continue;
    if (o.type === 'bait_ladder') {
      imp(o.boss, 'boss');
      for (const t of o.tiers) {
        for (const b of t.baits) need(b, `location ${loc.id} ladder tier "${t.name}"`);
        if (t.recipe && !c.recipes.some((r) => r.id === t.recipe)) problems.push(`location ${loc.id} ladder tier "${t.name}" uses unknown recipe "${t.recipe}"`);
      }
    } else {
      imp(o.miniboss, 'miniboss');
      imp(o.boss, 'boss');
      if (o.type === 'order_board') for (const r of o.crateRewards) need(r.item, `location ${loc.id} crate reward`);
      if (o.type === 'sleigh_run') {
        for (const i of Object.keys(o.loss)) imp(i, 'loss');
        for (const i of Object.keys(o.launchItems)) need(i, `location ${loc.id} launch reward`);
      }
    }
  }
  for (const id of Object.keys(c.story?.locations ?? {})) if (!locIds.has(id)) problems.push(`story.json location "${id}" is unknown`);
  for (const r of c.recipes) {
    need(r.output.item, `recipe ${r.id} output`);
    for (const i of Object.keys(r.ingredients)) need(i, `recipe ${r.id} ingredient`);
  }
  const s = c.constants.startingSetup;
  if (!c.items.traps.some((t) => t.id === s.trap)) problems.push(`starting trap "${s.trap}" is not a trap`);
  if (!c.items.bases.some((b) => b.id === s.base)) problems.push(`starting base "${s.base}" is not a base`);
  if (!locIds.has(c.constants.startingLocation)) problems.push(`starting location "${c.constants.startingLocation}" is unknown`);
  for (const i of Object.keys(c.constants.startingItems)) need(i, 'startingItems');
  need(c.constants.rescue.item, 'rescue item');
  for (const [frame, r] of Object.entries(c.constants.achievementRewards)) for (const i of Object.keys(r)) need(i, `achievementRewards.${frame}`);
  for (const a of c.achievements) for (const i of Object.keys(a.reward ?? {})) need(i, `achievement ${a.id} reward`);

  for (const [kind, list] of Object.entries(c.items)) {
    for (const i of list) if (!i.flavour) problems.push(`${kind} "${i.id}" has no text in flavour.json`);
  }
  for (const loc of c.locations) {
    for (const imp of loc.imps) if (!imp.flavour) problems.push(`imp "${imp.id}" has no text in flavour.json`);
  }

  c.ranks.forEach((r, i) => {
    if (r.rank !== i + 1) problems.push(`ranks must be numbered 1, 2, 3... in order (found ${r.rank} at position ${i + 1})`);
    if (i > 0 && r.points <= c.ranks[i - 1]!.points) problems.push(`rank ${r.rank} needs more points than rank ${r.rank - 1}`);
  });
  if (c.ranks[0]?.points !== 0) problems.push('rank 1 must need 0 points');

  const achIds = new Set<string>();
  const achNames = new Set<string>();
  for (const a of c.achievements) {
    if (achIds.has(a.id)) problems.push(`duplicate achievement id "${a.id}"`);
    if (achNames.has(a.name)) problems.push(`duplicate achievement name "${a.name}"`);
    achIds.add(a.id);
    achNames.add(a.name);
    const w = a.when;
    if (w.type === 'rank' && !c.ranks.some((r) => r.rank === w.rank)) problems.push(`achievement ${a.id} needs unknown rank ${w.rank}`);
    if ((w.type === 'catch' || w.type === 'collection') && 'imp' in w && w.imp && !impIds.has(w.imp)) problems.push(`achievement ${a.id} names unknown imp "${w.imp}"`);
    if (w.type === 'collection' && w.location && !locIds.has(w.location)) problems.push(`achievement ${a.id} names unknown location "${w.location}"`);
    if (w.type === 'catch' && !w.imp && !w.tier) problems.push(`achievement ${a.id} catch rule needs an imp or a tier`);
    if (w.type === 'craft') need(w.item, `achievement ${a.id}`);
  }
  return problems;
}
