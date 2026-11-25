import { useEffect, useState } from 'preact/hooks';
import { api } from './api.js';

interface Restart { id: number; username: string; at: number; summary: { gold: number; points: number; rank: number; hunts: number; caught: number; impsOnList: number } }
interface Invite { code: string; created_at: number; used_by_name: string | null; used_at: number | null }

export function AdminTab() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [restarts, setRestarts] = useState<Restart[]>([]);
  const [error, setError] = useState<string | null>(null);
  const load = () => {
    api<{ invites: Invite[] }>('GET', '/api/admin/invites').then((r) => setInvites(r.invites)).catch((e) => setError(e.message));
    api<{ restarts: Restart[] }>('GET', '/api/admin/restarts').then((r) => setRestarts(r.restarts)).catch((e) => setError(e.message));
  };
  useEffect(() => { load(); }, []);

  const create = async () => { await api('POST', '/api/admin/invites', {}).catch((e) => setError(e.message)); load(); };
  const revoke = async (code: string) => { await api('DELETE', `/api/admin/invites/${code}`).catch((e) => setError(e.message)); load(); };
  const link = (code: string) => `${location.origin}/?invite=${code}`;

  return (
    <section>
      <p>Each invite code lets one friend create an account. Send them the link.</p>
      <button onClick={create}>New invite code</button>
      {error && <p class="error">{error}</p>}
      <table>
        <tbody>
          {invites.map((i) => (
            <tr>
              <td><b>{i.code}</b><br /><small>{i.used_by_name ? `Used by ${i.used_by_name}` : link(i.code)}</small></td>
              <td class="r">
                {!i.used_by_name && <>
                  <button onClick={() => navigator.clipboard?.writeText(link(i.code))}>Copy link</button>
                  <button onClick={() => revoke(i.code)}>Revoke</button>
                </>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Restart log</h2>
      {restarts.length === 0 ? <p><small>Nobody has started over yet.</small></p> : (
        <table>
          <tbody>
            {restarts.map((r) => (
              <tr>
                <td><b>{r.username}</b><br /><small>{new Date(r.at).toLocaleString()}</small></td>
                <td class="r"><small>rank {r.summary.rank} · {r.summary.points.toLocaleString()} pts · {r.summary.gold.toLocaleString()} gold<br />{r.summary.hunts} hunts · {r.summary.caught} caught · {r.summary.impsOnList} imps listed</small></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
