import Fastify, { type FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import type { Content } from '../content/schema.js';

export interface AppOptions {
  content: Content;
  /** Folder with the built web client; skipped when it doesn't exist (dev mode uses Vite). */
  clientDir?: string;
  version?: string;
  logger?: boolean;
}

export async function buildApp(opts: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: opts.logger ?? false });

  app.get('/api/health', async () => ({ ok: true, version: opts.version ?? 'dev' }));

  // The full game content. Nothing in it is secret; the client uses it to show odds, the shop and the collection.
  app.get('/api/content', async () => opts.content);

  if (opts.clientDir && existsSync(opts.clientDir)) {
    await app.register(fastifyStatic, { root: opts.clientDir });
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api/')) return reply.code(404).send({ error: 'Not found' });
      return reply.sendFile('index.html');
    });
  }
  return app;
}
