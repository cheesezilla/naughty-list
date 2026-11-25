import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/server/app.js';
import { content } from './helpers.js';

describe('server', () => {
  it('answers health and content', async () => {
    const app = await buildApp({ content, version: 'test' });
    const health = await app.inject('/api/health');
    expect(health.json()).toEqual({ ok: true, version: 'test' });
    const c = await app.inject('/api/content');
    expect(c.json().locations).toHaveLength(4);
    await app.close();
  });
});
