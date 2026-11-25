import { loadContent } from '../src/content/load.js';

const dir = process.argv[2] ?? 'content';
const c = loadContent(dir);
const imps = c.locations.reduce((n, l) => n + l.imps.length, 0);
console.log(`Content OK: ${c.ranks.length} ranks, ${c.locations.length} locations, ${imps} imps, ${c.items.traps.length} traps, ${c.recipes.length} recipes.`);
