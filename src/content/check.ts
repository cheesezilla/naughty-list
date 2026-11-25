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
    if (loc.preferredBait) need(loc.preferredBait, `location ${loc.id} preferredBait`);
    for (const imp of loc.imps) {
      if (impIds.has(imp.id)) problems.push(`duplicate imp id "${imp.id}"`);
      impIds.add(imp.id);
      for (const l of imp.loot ?? []) need(l.item, `imp ${imp.id} loot`);
      for (const b of Object.keys(imp.baitWeights ?? {})) need(b, `imp ${imp.id} baitWeights`);
    }
  }
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
  return problems;
}
