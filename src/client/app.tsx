import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Content, Imp } from '../content/schema.js';
import {
  buy, count, craft, equip, gameData, hunt, huntOdds, newPlayer, sell, sellValue, travel,
  type ActionResult, type JournalEntry, type PlayerState, type Setup,
} from '../engine/index.js';

// Prototype: the whole game runs in the browser and saves to localStorage.
// Milestone 3 moves hunts to the server with accounts; the engine stays the same.
const SAVE_KEY = 'naughty-list-prototype-v1';
const TIER_ICON: Record<Imp['tier'], string> = { common: '😈', rare: '✨', miniboss: '👹', boss: '👿' };
const LOCATION_ICON: Record<string, string> = { cookie_pantry: '🍪', wrapping_room: '🎁', toy_workshop: '🧸', reindeer_stables: '🦌' };
const TYPE_ICON: Record<string, string> = { clockwork: '⚙️', holly: '🌿', frost: '❄️' };

type Tab = 'hunt' | 'shop' | 'craft' | 'travel' | 'list';
interface Logged extends JournalEntry { n: number }

const pct = (x: number) => `${Math.round(x * 100)}%`;
const num = (x: number) => Math.round(x).toLocaleString('en-US');

export function App() {
  const [content, setContent] = useState<Content | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch('/api/content').then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setContent).catch((e) => setError(String(e)));
  }, []);
  if (error) return <main class="center">Couldn't load the game: {error}</main>;
  if (!content) return <main class="center">Loading Santa's lair…</main>;
  return <Game content={content} />;
}

function load(content: Content): { player: PlayerState; journal: Logged[] } {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* start fresh */ }
  return { player: newPlayer(content, Date.now()), journal: [] };
}

function Game({ content }: { content: Content }) {
  const data = useMemo(() => gameData(content), [content]);
  const [{ player, journal }, setSave] = useState(() => load(content));
  const [tab, setTab] = useState<Tab>('hunt');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem(SAVE_KEY, JSON.stringify({ player, journal })); }, [player, journal]);

  const act = (r: ActionResult, ok?: string) => {
    if (r.ok) { setSave((s) => ({ ...s, player: r.player })); if (ok) setToast(ok); }
    else setToast(r.error);
  };

  const doHunt = () => {
    const r = hunt(content, player, Math.random, Date.now());
    if (!r.ok) { setToast(r.error); return; }
    setSave((s) => ({ player: r.player, journal: [{ ...r.entry, n: r.player.stats.hunts }, ...s.journal].slice(0, 200) }));
    if (r.entry.rankUp) setToast(`Rank up! You are now ${content.ranks[r.entry.rankUp - 1]!.name}.`);
    else setToast(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (tab === 'hunt' && (e.code === 'Space' || e.key === 'h') && !(e.target instanceof HTMLSelectElement)) { e.preventDefault(); doHunt(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const rank = content.ranks[player.rank - 1]!;
  const next = content.ranks[player.rank];
  const progress = next ? (player.points - rank.points) / (next.points - rank.points) : 1;
  const location = data.locations.get(player.location)!;

  return (
    <main>
      <header>
        <h1>The Naughty List</h1>
        <div class="stats">
          <span title="Gold">🪙 {num(player.gold)}</span>
          <span title="Points">⭐ {num(player.points)}</span>
          <span title="Rank">🎖️ {rank.name}</span>
        </div>
        <div class="bar" title={next ? `${num(next.points - player.points)} points to ${next.name}` : 'Top rank for now'}>
          <div style={{ width: pct(Math.min(1, progress)) }} />
        </div>
        <p class="where">{LOCATION_ICON[location.id] ?? '📍'} {location.name}</p>
      </header>

      <nav>
        {(['hunt', 'shop', 'craft', 'travel', 'list'] as Tab[]).map((t) => (
          <button class={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
            {{ hunt: 'Hunt', shop: 'Shop', craft: 'Elf Forge', travel: 'Travel', list: 'Naughty List' }[t]}
          </button>
        ))}
      </nav>

      {toast && <p class="toast" onClick={() => setToast(null)}>{toast}</p>}

      {tab === 'hunt' && <HuntTab content={content} player={player} journal={journal} onHunt={doHunt} act={act} />}
      {tab === 'shop' && <ShopTab content={content} player={player} act={act} />}
      {tab === 'craft' && <CraftTab content={content} player={player} act={act} />}
      {tab === 'travel' && <TravelTab content={content} player={player} act={act} />}
      {tab === 'list' && <ListTab content={content} player={player} />}

      <footer>
        Prototype: progress is saved in this browser only.{' '}
        <button class="link" onClick={() => {
          if (confirm('Start over? This wipes your progress in this browser.')) setSave({ player: newPlayer(content, Date.now()), journal: [] });
        }}>Start over</button>
      </footer>
    </main>
  );
}

interface TabProps { content: Content; player: PlayerState; act: (r: ActionResult, ok?: string) => void }

function HuntTab({ content, player, journal, onHunt, act }: TabProps & { journal: Logged[]; onHunt: () => void }) {
  const data = gameData(content);
  const odds = huntOdds(content, player.setup, player.location);
  const slot = (s: keyof Setup, kind: 'trap' | 'base' | 'bait' | 'charm', optional: boolean) => {
    const owned = [...data.items.values()].filter((i) => i.kind === kind && count(player, i.id) > 0);
    return (
      <label>
        <span>{s[0]!.toUpperCase() + s.slice(1)}</span>
        <select value={player.setup[s] ?? ''} onChange={(e) => act(equip(content, player, s, (e.target as HTMLSelectElement).value || null))}>
          {optional && <option value="">None</option>}
          {owned.map((i) => (
            <option value={i.id}>
              {i.kind === 'trap' ? `${TYPE_ICON[i.type]} ` : ''}{i.name}{kind === 'bait' || kind === 'charm' ? ` (${count(player, i.id)})` : ''}
            </option>
          ))}
        </select>
      </label>
    );
  };
  const nameOf = (id: string) => data.items.get(id)?.name ?? data.imps.get(id)?.name ?? id;
  return (
    <section>
      <div class="setup">
        {slot('trap', 'trap', false)}
        {slot('base', 'base', false)}
        {slot('bait', 'bait', true)}
        {slot('charm', 'charm', true)}
      </div>
      <p class="odds">
        Power {num(odds.stats.power)} · Luck {odds.stats.luck} · Attraction {pct(odds.stats.attraction)} · Catch per hunt {pct(odds.catchPerHunt)}
      </p>
      <button class="hunt" onClick={onHunt}>🎯 Hunt</button>
      <p class="hint">Tip: press Space to hunt.</p>
      <ol class="journal">
        {journal.slice(0, 50).map((e) => {
          const imp = e.imp ? data.imps.get(e.imp) : undefined;
          return (
            <li class={e.outcome}>
              <span class="n">#{e.n}</span>{' '}
              {e.outcome === 'quiet' && <>Nothing took the bait.{e.rescued && ' Mrs. Claus slipped you 10 Stale Cookies.'}</>}
              {e.outcome === 'catch' && imp && <>{TIER_ICON[imp.tier]} Caught <b>{imp.name}</b>! +{e.gold} gold, +{e.points} points{e.loot.length > 0 && <>, found {e.loot.map((l) => `${l.amount} ${nameOf(l.item)}`).join(', ')}</>}.</>}
              {e.outcome === 'escape' && imp && <>{TIER_ICON[imp.tier]} <b>{imp.name}</b> escaped{e.baitUsed > 1 ? ' and stole extra bait' : ''}. ({pct(e.catchChance ?? 0)} chance)</>}
              {e.rankUp && <b> Rank up: {content.ranks[e.rankUp - 1]!.name}!</b>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function ShopTab({ content, player, act }: TabProps) {
  const data = gameData(content);
  const rows = (title: string, list: { id: string; name: string; price: number | null; rank: number }[], packs: number[], detail: (id: string) => string) => (
    <>
      <h2>{title}</h2>
      <table>
        <tbody>
          {list.filter((i) => i.price !== null && i.rank <= player.rank + 1).map((i) => (
            <tr class={i.rank > player.rank ? 'locked' : ''}>
              <td><b>{i.name}</b><br /><small>{detail(i.id)}</small></td>
              <td class="r">{num(i.price!)} 🪙<br /><small>own {count(player, i.id)}</small></td>
              <td class="r">
                {i.rank > player.rank ? <small>rank {i.rank}</small> : packs.map((n) => (
                  <button disabled={player.gold < i.price! * n} onClick={() => act(buy(content, player, i.id, n), `Bought ${n} ${i.name}.`)}>x{n}</button>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
  const sellable = Object.entries(player.inventory).map(([id, n]) => ({ item: data.items.get(id)!, n }))
    .filter(({ item }) => item && sellValue(data, item) > 0);
  return (
    <section>
      {rows('Traps', content.items.traps, [1], (id) => {
        const t = content.items.traps.find((x) => x.id === id)!;
        return `${TYPE_ICON[t.type]} ${t.type}, power ${t.power}, luck ${t.luck}${t.attraction ? `, +${pct(t.attraction)} attraction` : ''}`;
      })}
      {rows('Bases', content.items.bases, [1], (id) => {
        const b = content.items.bases.find((x) => x.id === id)!;
        return `power ${b.power}, luck ${b.luck}${b.attraction ? `, +${pct(b.attraction)} attraction` : ''}`;
      })}
      {rows('Bait', content.items.baits, [10, 100], (id) => `${pct(content.items.baits.find((x) => x.id === id)!.attraction)} attraction`)}
      {rows('Charms', content.items.charms, [1, 10], (id) => {
        const c = content.items.charms.find((x) => x.id === id)!;
        return [c.luck && `+${c.luck} luck`, c.attraction && `+${pct(c.attraction)} attraction`, c.powerBonus && `+${pct(c.powerBonus)} power`].filter(Boolean).join(', ');
      })}
      <h2>Sell</h2>
      <table>
        <tbody>
          {sellable.map(({ item, n }) => (
            <tr>
              <td><b>{item.name}</b> <small>x{n}</small></td>
              <td class="r">{sellValue(data, item)} 🪙 each</td>
              <td class="r"><button onClick={() => act(sell(content, player, item.id, 1), `Sold ${item.name}.`)}>Sell 1</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function CraftTab({ content, player, act }: TabProps) {
  const data = gameData(content);
  return (
    <section>
      <p>Santa's elves turn boss loot into stronger gear.</p>
      <table>
        <tbody>
          {content.recipes.map((r) => {
            const out = data.items.get(r.output.item)!;
            return (
              <tr class={r.rank > player.rank ? 'locked' : ''}>
                <td>
                  <b>{out.name}{r.output.amount > 1 ? ` x${r.output.amount}` : ''}</b><br />
                  <small>{Object.entries(r.ingredients).map(([id, n]) => `${count(player, id)}/${n} ${data.items.get(id)?.name}`).join(', ')}, {num(r.gold)} gold</small>
                </td>
                <td class="r">
                  {r.rank > player.rank ? <small>rank {r.rank}</small> : <button onClick={() => act(craft(content, player, r.id), `Crafted ${out.name}.`)}>Craft</button>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function TravelTab({ content, player, act }: TabProps) {
  return (
    <section class="cards">
      {content.locations.map((l) => {
        const open = player.unlocked.includes(l.id);
        return (
          <div class={`card ${l.id === player.location ? 'here' : ''} ${l.rank > player.rank ? 'locked' : ''}`}>
            <h3>{LOCATION_ICON[l.id] ?? '📍'} {l.name}</h3>
            <p>{l.description}</p>
            {l.id === player.location ? <b>You are here</b>
              : l.rank > player.rank ? <small>Opens at rank {l.rank} ({content.ranks[l.rank - 1]?.name})</small>
              : <button onClick={() => act(travel(content, player, l.id), `Welcome to the ${l.name}.`)}>{open ? 'Go' : `Unlock for ${num(l.unlockCost)} gold`}</button>}
          </div>
        );
      })}
    </section>
  );
}

function ListTab({ content, player }: { content: Content; player: PlayerState }) {
  const total = content.locations.reduce((n, l) => n + l.imps.length, 0);
  const caught = Object.keys(player.catches).length;
  return (
    <section>
      <p>{caught} of {total} imps are on your Naughty List. {player.stats.hunts} hunts, {player.stats.caught} catches.</p>
      {content.locations.map((l) => (
        <>
          <h2>{LOCATION_ICON[l.id] ?? '📍'} {l.name}</h2>
          <ul class="naughty">
            {l.imps.map((imp) => {
              const n = player.catches[imp.id] ?? 0;
              return <li class={n ? '' : 'unknown'}>{TIER_ICON[imp.tier]} {n ? imp.name : '???'} <small>{imp.tier === 'miniboss' ? 'mini boss' : imp.tier}{n ? ` · caught ${n}` : ''}</small></li>;
            })}
          </ul>
        </>
      ))}
    </section>
  );
}
