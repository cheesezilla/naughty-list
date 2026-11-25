import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Content } from './schema.js';
import { checkReferences } from './check.js';

/** Reads every content file from a folder, validates shape and cross-references, and returns the game content. */
export function loadContent(dir: string): Content {
  const read = (file: string) => JSON.parse(readFileSync(join(dir, file), 'utf8'));
  const content = Content.parse({
    constants: read('constants.json'),
    ranks: read('ranks.json'),
    locations: read('locations.json'),
    items: read('items.json'),
    recipes: read('recipes.json'),
  });
  const problems = checkReferences(content);
  if (problems.length > 0) {
    throw new Error(`Content problems in ${dir}:\n- ${problems.join('\n- ')}`);
  }
  return content;
}
