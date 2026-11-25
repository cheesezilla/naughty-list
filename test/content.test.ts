import { describe, expect, it } from 'vitest';
import { checkReferences } from '../src/content/check.js';
import { content } from './helpers.js';

describe('content files', () => {
  it('load and pass reference checks', () => {
    expect(checkReferences(content)).toEqual([]);
  });

  it('give every location 3 commons, a rare, a mini boss and a boss', () => {
    for (const loc of content.locations) {
      const tiers = loc.imps.map((i) => i.tier).sort();
      expect(tiers, loc.id).toEqual(['boss', 'common', 'common', 'common', 'miniboss', 'rare']);
    }
  });

  it('catch broken references', () => {
    const broken = structuredClone(content);
    broken.recipes[0]!.ingredients = { no_such_thing: 1 };
    expect(checkReferences(broken).join()).toMatch(/no_such_thing/);
  });
});
