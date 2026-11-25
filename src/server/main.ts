import { accessSync, constants, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadContent } from '../content/load.js';
import { buildApp } from './app.js';
import { Store } from './db.js';

// Paths are relative to the working directory: the repo root in development, /app in Docker.
const contentDir = resolve(process.env.CONTENT_DIR ?? 'content');
const clientDir = resolve(process.env.CLIENT_DIR ?? 'dist/client');
const dataDir = resolve(process.env.DATA_DIR ?? 'data');
const port = Number(process.env.PORT ?? 8080);

try {
  mkdirSync(dataDir, { recursive: true });
  accessSync(dataDir, constants.W_OK);
} catch {
  console.error(
    `Can't write to the save folder ${dataDir}. On the NAS, give the folder mapped to /data read and write ` +
    `permission for everyone, or add  user: "0:0"  to the service in compose.yaml.`,
  );
  process.exit(1);
}

const content = loadContent(contentDir);
const store = new Store(join(dataDir, 'naughty-list.db'));
const app = await buildApp({ content, store, clientDir, version: process.env.APP_VERSION, logger: true });

const shutdown = async () => {
  await app.close();
  store.close();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

await app.listen({ host: '0.0.0.0', port });
