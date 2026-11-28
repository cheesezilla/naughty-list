import { join, resolve } from 'node:path';
import { loadContent } from '../content/load.js';
import { buildApp } from './app.js';
import { Store } from './db.js';
import { checkSaveFolder, DB_NAME, explainOpenError } from './savecheck.js';

// Paths are relative to the working directory: the repo root in development, /app in Docker.
const contentDir = resolve(process.env.CONTENT_DIR ?? 'content');
const clientDir = resolve(process.env.CLIENT_DIR ?? 'dist/client');
const dataDir = resolve(process.env.DATA_DIR ?? 'data');
const port = Number(process.env.PORT ?? 8080);

const problem = checkSaveFolder(dataDir);
if (problem) {
  console.error(problem);
  process.exit(1);
}

const content = loadContent(contentDir);
let store: Store;
try {
  store = new Store(join(dataDir, DB_NAME));
} catch (e) {
  console.error(explainOpenError(dataDir, e));
  process.exit(1);
}
if (content.constants.economyReset) {
  const done = store.applyEconomyReset(content.constants.economyReset, content.ranks);
  if (done) console.log(`Economy reset ${content.constants.economyReset.id}: capped gold and points for ${done.capped} players.`);
}
const app = await buildApp({ content, store, clientDir, version: process.env.APP_VERSION, cookieName: process.env.COOKIE_NAME, logger: true });

const shutdown = async () => {
  await app.close();
  store.close();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

await app.listen({ host: '0.0.0.0', port });
