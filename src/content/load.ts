import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Content, FlavourFile } from './schema.js';
import { checkReferences } from './check.js';

type Entry = { id: string; flavour?: unknown };

/** Copies each text entry from flavour.json onto the item or imp with the same id. Returns ids that match nothing. */
export function mergeFlavour(items: Record<string, Entry[]>, locations: { imps: Entry[] }[], flavour: FlavourFile): string[] {
  const unknown: string[] = [];
  const merge = (entries: Entry[], text: Record<string, unknown>, kind: string) => {
    const byId = new Map(entries.map((e) => [e.id, e]));
    for (const [key, value] of Object.entries(text)) {
      const entry = byId.get(key);
      if (entry) entry.flavour = value;
      else unknown.push(`flavour.json ${kind} "${key}" matches no ${kind.slice(0, -1)}`);
    }
  };
  merge(Object.values(items).flat(), flavour.items, 'items');
  merge(locations.flatMap((l) => l.imps), flavour.imps, 'imps');
  return unknown;
}

/** Reads every content file from a folder, validates shape and cross-references, and returns the game content. */
export function loadContent(dir: string): Content {
  const read = (file: string) => JSON.parse(readFileSync(join(dir, file), 'utf8'));
  const items = read('items.json');
  const locations = read('locations.json');
  const flavourPath = join(dir, 'flavour.json');
  const problems: string[] = [];
  if (existsSync(flavourPath)) {
    problems.push(...mergeFlavour(items, locations, FlavourFile.parse(read('flavour.json'))));
  }
  const content = Content.parse({
    constants: read('constants.json'),
    story: existsSync(join(dir, 'story.json')) ? read('story.json') : undefined,
    ranks: read('ranks.json'),
    locations,
    items,
    recipes: read('recipes.json'),
    achievements: existsSync(join(dir, 'achievements.json')) ? read('achievements.json') : [],
    boons: existsSync(join(dir, 'boons.json')) ? read('boons.json') : [],
    events: existsSync(join(dir, 'events.json')) ? read('events.json') : undefined,
  });
  problems.push(...checkReferences(content));
  if (problems.length > 0) {
    throw new Error(`Content problems in ${dir}:\n- ${problems.join('\n- ')}`);
  }
  return content;
}
