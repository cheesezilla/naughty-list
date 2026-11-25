import { describe, expect, it } from 'vitest';
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkSaveFolder, explainOpenError } from '../src/server/savecheck.js';

const fresh = () => mkdtempSync(join(tmpdir(), 'nl-save-'));
const isRoot = process.getuid?.() === 0;

describe('save folder check', () => {
  it('accepts a new folder and an existing save file', () => {
    const dir = join(fresh(), 'data');
    expect(checkSaveFolder(dir)).toBeNull();
    writeFileSync(join(dir, 'naughty-list.db'), '');
    expect(checkSaveFolder(dir)).toBeNull();
  });

  it('explains a folder where the save file should be', () => {
    const dir = fresh();
    mkdirSync(join(dir, 'naughty-list.db'));
    expect(checkSaveFolder(dir)).toMatch(/is a folder, but it should be the save file/);
  });

  it.skipIf(isRoot)('explains a save file the game cannot write', () => {
    const dir = fresh();
    writeFileSync(join(dir, 'naughty-list.db'), '');
    chmodSync(join(dir, 'naughty-list.db'), 0o400);
    expect(checkSaveFolder(dir)).toMatch(/Can't read and write the save file .*mode 400/);
  });

  it('explains an open error with the folder owner', () => {
    expect(explainOpenError(fresh(), new Error('unable to open database file'))).toMatch(/unable to open database file\. The game runs as .* The folder .* has owner user/);
  });
});
