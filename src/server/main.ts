import { resolve } from 'node:path';
import { loadContent } from '../content/load.js';
import { buildApp } from './app.js';

// Paths are relative to the working directory: the repo root in development, /app in Docker.
const contentDir = resolve(process.env.CONTENT_DIR ?? 'content');
const clientDir = resolve(process.env.CLIENT_DIR ?? 'dist/client');
const port = Number(process.env.PORT ?? 8080);

const content = loadContent(contentDir);
const app = await buildApp({ content, clientDir, version: process.env.APP_VERSION, logger: true });
await app.listen({ host: '0.0.0.0', port });
