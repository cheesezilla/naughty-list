import { describe, expect, it } from 'vitest';
import { checkReferences } from '../src/content/check.js';
import { mergeFlavour } from '../src/content/load.js';
import { content } from './helpers.js';

describe('content files', () => {
  it("include Santa's intro letter", () => {
    expect(content.story?.intro.paragraphs.length).toBeGreaterThan(0);
  });

  it('load and pass reference checks', () => {
    expect(checkReferences(content)).toEqual([]);
  });

  it('give the Cookie Pantry commons, uncommons and a rare, and every other location 3 commons, a rare, a mini boss and a boss', () => {
    for (const loc of content.locations) {
      const tiers = loc.imps.map((i) => i.tier).sort();
      if (loc.id === 'cookie_pantry') expect(tiers, loc.id).toEqual(['common', 'common', 'rare', 'uncommon', 'uncommon']);
      else expect(tiers, loc.id).toEqual(['boss', 'common', 'common', 'common', 'miniboss', 'rare']);
    }
  });

  it('put boss keys only on locations that have a boss and a next location to open', () => {
    content.locations.forEach((l, i) => {
      if (l.key) { expect(l.imps.some((m) => m.tier === 'boss'), l.id).toBe(true); expect(content.locations[i + 1], l.id).toBeDefined(); }
    });
    expect(new Set(content.locations.flatMap((l) => (l.key ? [l.key.id] : []))).size).toBe(2);
  });

  it('catch broken references', () => {
    const broken = structuredClone(content);
    broken.recipes[0]!.ingredients = { no_such_thing: 1 };
    expect(checkReferences(broken).join()).toMatch(/no_such_thing/);
  });

  it('give every item and imp a tagline, description and backstory, and every imp a rumour', () => {
    const items = Object.values(content.items).flat();
    for (const i of items) expect(i.flavour?.backstory, i.id).toBeTruthy();
    for (const imp of content.locations.flatMap((l) => l.imps)) expect(imp.flavour?.rumour, imp.id).toBeTruthy();
  });

  it('report items with no flavour text', () => {
    const broken = structuredClone(content);
    delete broken.items.baits[0]!.flavour;
    expect(checkReferences(broken).join()).toMatch(/stale_cookie" has no text/);
  });

  it('report flavour text for ids that do not exist', () => {
    const text = { tagline: 'a', description: 'b', backstory: 'c' };
    const problems = mergeFlavour({ traps: [] }, [{ imps: [] }], { items: { ghost_trap: text }, imps: { ghost_imp: { ...text, rumour: 'd' } } });
    expect(problems.join()).toMatch(/ghost_trap.*ghost_imp/);
  });
});
