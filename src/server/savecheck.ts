import { accessSync, constants, mkdirSync, statSync, type Stats } from 'node:fs';
import { join } from 'node:path';

export const DB_NAME = 'naughty-list.db';

const whoAmI = () => (process.getuid ? `user ${process.getuid()}` : 'this user');
const describe = (st: Stats) => `owner user ${st.uid}, group ${st.gid}, mode ${(st.mode & 0o777).toString(8)}`;
const FIX =
  'On the NAS, give the folder mapped to /data read and write permission for everyone, ' +
  'or add  user: "0:0"  to the service in compose.yaml, then redeploy.';

/**
 * Checks that the save folder and any existing save files can be read and written by this process.
 * Returns a message that explains the problem in plain words, or null when everything is fine.
 */
export function checkSaveFolder(dataDir: string): string | null {
  try {
    mkdirSync(dataDir, { recursive: true });
    accessSync(dataDir, constants.R_OK | constants.W_OK | constants.X_OK);
  } catch {
    let owner = '';
    try { owner = ` (${describe(statSync(dataDir))})`; } catch { /* folder missing */ }
    return `Can't write to the save folder ${dataDir}${owner}. The game runs as ${whoAmI()}. ${FIX}`;
  }

  const db = join(dataDir, DB_NAME);
  for (const f of [db, `${db}-wal`, `${db}-shm`]) {
    let st: Stats;
    try { st = statSync(f); } catch { continue; }
    if (st.isDirectory()) {
      return `${f} is a folder, but it should be the save file. This happens when compose.yaml maps a single file ` +
        `that didn't exist yet. Map the whole folder to /data instead (see compose.yaml), delete or rename that empty folder on the NAS, and redeploy.`;
    }
    try {
      accessSync(f, constants.R_OK | constants.W_OK);
    } catch {
      return `Can't read and write the save file ${f} (${describe(st)}). The game runs as ${whoAmI()}. ${FIX}`;
    }
  }
  return null;
}

/** Explains a failure to open the save file, with the details needed to fix it. */
export function explainOpenError(dataDir: string, err: unknown): string {
  const reason = err instanceof Error ? err.message : String(err);
  let folder = '';
  try { folder = ` The folder ${dataDir} has ${describe(statSync(dataDir))}.`; } catch { /* ignore */ }
  return `Couldn't open the save file ${join(dataDir, DB_NAME)}: ${reason}. The game runs as ${whoAmI()}.${folder} ` +
    `If the save folder is on a network share, move it to a local volume such as /volume1/docker/naughty-list. Otherwise: ${FIX}`;
}
