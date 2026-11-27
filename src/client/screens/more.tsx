import { useState } from 'preact/hooks';
import { keyNeeded, type GameEvent, type JournalEntry, type JournalRow, type PlayerState } from '../../engine/index.js';
import { api } from '../api.js';
import { useGame } from '../game.js';
import { Art, artEntry, Icon } from '../lib/art.js';
import { ago, date, num, pct, plural, TIER_NAME, TIER_ORDER, when } from '../lib/format.js';
import { setPref, usePrefs } from '../lib/prefs.js';
import { go } from '../lib/route.js';
import { BackRow, Loading, MainScreen, RankProgress, Tabs, Toggle, useAsync } from '../ui.js';
import { ImpThumb, StoryCard } from './log.js';
import { AchievementsTab } from './achievements.js';
import { BadgeMedal, TypeMedal } from '../lib/medal.js';

export function MoreMenu() {
  const { content, player, user, logout } = useGame();
  const item = (icon: string, title: string, sub: string, path: string) => (
    <button class="menu-row" onClick={() => go(path)}>
      <span class="menu-icon"><Icon id={icon} /></span>
      <span><b>{title}</b><small>{sub}</small></span>
      <span class="chev" aria-hidden="true">›</span>
    </button>
  );
  return (
    <MainScreen tab="more">
      <div class="pad stack">
        <h1 class="screen-title">More</h1>
        <h2 class="list-head">Explore</h2>
        <div class="menu">
          {item('menu_travel', 'Travel map', `${content.locations.length} lair locations, ${player.unlocked.length} unlocked`, 'more/travel')}
          {item('menu_hunters', 'Hunters', 'Leaderboard and catch feed', 'more/hunters')}
          {item('menu_stats', 'My profile', `${num(player.stats.hunts)} hunts, ${Object.keys(player.achievements ?? {}).length} of ${content.achievements.length} badges`, 'more/profile')}
          {item('menu_howto', 'How to play', 'Power, luck, bait and traps', 'more/howto')}
          {item('menu_settings', 'Settings', 'Sound, clock and shortcuts', 'more/settings')}
          {item('menu_settings', 'Feedback', 'Tell us what to fix or add', 'more/feedback')}
          {user.isAdmin && item('menu_admin', 'Admin', 'Only you can see this', 'more/admin')}
        </div>
        <h2 class="list-head">Account</h2>
        <div class="menu">
          {item('menu_account', 'Account', 'Password and Start over', 'more/account')}
          <button class="menu-row" onClick={logout}>
            <span class="menu-icon"><Icon id="menu_logout" /></span>
            <span><b>Log out</b><small>Signed in as {user.username}</small></span>
          </button>
        </div>
      </div>
    </MainScreen>
  );
}

export function TravelScreen() {
  const { content, player, act } = useGame();
  const map = artEntry('map', 'lair_map');
  return (
    <MainScreen tab="more">
      <BackRow to="more" title="Travel map" sub="Unlocked rooms stay open for good" />
      <div class="pad stack">
        <div class="map">
          <Art slot="map" id="lair_map" alt="Map of Santa's lair" class="map-art" />
          {map?.pins && content.locations.map((l) => {
            const pin = map.pins![l.id];
            if (!pin) return null;
            return (
              <span class={`pin ${l.id === player.location ? 'here' : ''} ${player.unlocked.includes(l.id) ? '' : 'closed'}`}
                style={{ left: `${(pin.x / map.width) * 100}%`, top: `${(pin.y / map.height) * 100}%` }}>
                {l.name}
              </span>
            );
          })}
        </div>
        {content.locations.map((l) => {
          const open = player.unlocked.includes(l.id);
          const here = l.id === player.location;
          const rankName = content.ranks[l.rank - 1]?.name;
          const needKey = keyNeeded(content, l.id);
          const missingKey = !open && needKey && !(player.keys ?? []).includes(needKey.id) ? needKey : undefined;
          const afterLoc = l.after ? content.locations.find((x) => x.id === l.after) : undefined;
          const needAfter = !open && afterLoc && !player.unlocked.includes(afterLoc.id) ? afterLoc : undefined;
          const bossName = needKey ? content.locations.find((x) => x.key?.id === needKey.id)?.imps.find((m) => m.tier === 'boss')?.name : undefined;
          return (
            <div class={`card loc-card ${here ? 'here' : ''} ${l.rank > player.rank ? 'locked' : ''}`}>
              <Art slot="locations" id={l.id} class="loc-thumb" />
              <div class="loc-main">
                <b>{l.name}</b>
                <small>Rank {rankName} · unlock {l.unlockCost ? `${num(l.unlockCost)} gold` : 'free'}{' '}<span class={`pill ${open ? 'green' : ''}`}>{open ? 'Unlocked' : 'Locked'}</span></small>
                <small class="desc">{l.description}</small>
                {l.side && <small>Side area: no boss key, and nothing later needs it.</small>}
                {needAfter && <small>Opens once you have unlocked the {needAfter.name}.</small>}
                {needKey && <small>{missingKey ? `Needs the ${needKey.name}: catch ${bossName} to get it.` : `${needKey.name} found.`}</small>}
                <span class="weak-row"><small>Best traps</small>{l.homeTypes.map((t) => <TypeMedal type={t} size={22} />)}</span>
              </div>
              {here ? <span class="pill gold">You are here</span>
                : l.rank > player.rank ? <span class="small muted">Needs {rankName}</span>
                : missingKey ? <span class="small muted">Needs key</span>
                : needAfter ? <span class="small muted">Needs {needAfter.name}</span>
                : <button class="primary-btn" disabled={!open && player.gold < l.unlockCost}
                    onClick={async () => { if (await act('/api/travel', { location: l.id }, `Welcome to the ${l.name}.`)) go('hunt'); }}>
                    {open ? 'Go' : `Unlock ${num(l.unlockCost)}`}
                  </button>}
            </div>
          );
        })}
      </div>
    </MainScreen>
  );
}

interface Hunters {
  players: { username: string; rank: number; points: number; impsOnList: number; you: boolean }[];
  feed: ({ id: number; at: number; username: string } & ({ kind: 'hunt'; entry: JournalEntry } | { kind: 'event'; entry: GameEvent }))[];
}
export function HuntersScreen() {
  const { content, data } = useGame();
  const prefs = usePrefs();
  const [by, setBy] = useState<'points' | 'list'>('points');
  const r = useAsync(() => api<Hunters>('GET', '/api/hunters'));
  const players = [...(r.data?.players ?? [])].sort((a, b) => (by === 'points' ? b.points - a.points : b.impsOnList - a.impsOnList || b.points - a.points));
  return (
    <MainScreen tab="more">
      <BackRow to="more" title="Hunters" sub={r.data ? `${plural(r.data.players.length, 'hunter')} in this lair` : undefined} />
      <div class="pad stack">
        <Tabs label="Rank by" tabs={[{ id: 'points', label: 'Points' }, { id: 'list', label: 'Naughty List size' }]} value={by} onChange={setBy} />
        {!r.data && !r.error && <Loading />}
        {r.error && <p class="error">{r.error}</p>}
        <ol class="leaderboard">
          {players.map((p, i) => (
            <li class={p.you ? 'you' : ''}>
              <span class="place">{i + 1}</span>
              <Art slot="ranks" id={`rank_${p.rank}`} class="thumb small" />
              <span class="lb-name"><b>{p.username}{p.you && ' (you)'}</b><small>{content.ranks[p.rank - 1]?.name}</small></span>
              <b class="lb-score">{by === 'points' ? num(p.points) : `${p.impsOnList} elves`}</b>
            </li>
          ))}
        </ol>
        <h2 class="list-head">Catch feed: friends' big moments</h2>
        <div class="log">
          {r.data?.feed.map((f) => {
            if (f.kind === 'event') {
              if (f.entry.type !== 'achievement') return null;
              const a = content.achievements.find((x) => x.id === (f.entry as { ids: string[] }).ids[0]);
              if (!a) return null;
              return (
                <div class="log-row event feed">
                  <BadgeMedal a={a} earned size={44} />
                  <div class="row-body"><b>{f.username}</b> earned <b>{a.name}</b>{f.entry.ids.length > 1 && ` and ${f.entry.ids.length - 1} more`}</div>
                  <span class="row-time">{when(f.at, prefs.clock24)}</span>
                </div>
              );
            }
            const imp = f.entry.imp ? data.imps.get(f.entry.imp) : undefined;
            const rank = f.entry.rankUp ? content.ranks[f.entry.rankUp - 1] : undefined;
            const loc = imp ? data.locations.get(imp.location) : undefined;
            return (
              <div class="log-row event feed">
                {rank && !(f.entry.outcome === 'catch' && imp && TIER_ORDER[imp.tier] > 0)
                  ? <Art slot="ranks" id={`rank_${rank.rank}`} class="thumb small" />
                  : imp ? <ImpThumb id={imp.id} size={44} /> : null}
                <div class="row-body">
                  {f.entry.outcome === 'escape' && f.entry.pillage && imp
                    ? <><b>{imp.name}</b> escaped and pillaged <b>{f.username}</b></>
                    : f.entry.outcome === 'catch' && imp && TIER_ORDER[imp.tier] > 0
                    ? <><b>{f.username}</b> caught {imp.tier === 'rare' ? 'a rare ' : ''}<b>{imp.name}</b>{imp.tier !== 'rare' && `, the ${loc?.name} ${TIER_NAME[imp.tier].toLowerCase()}`}{rank && <>, and reached <b>{rank.name}</b></>}</>
                    : <><b>{f.username}</b> reached <b>{rank?.name}</b></>}
                </div>
                <span class="row-time">{when(f.at, prefs.clock24)}</span>
              </div>
            );
          })}
          {r.data && r.data.feed.length === 0 && <p class="muted">No big moments yet. Rare elves, bosses, boss pillages, rank-ups and Silver, Gold and Secret badges show up here.</p>}
        </div>
        <p class="small muted">Elves you haven't caught yourself still show as ?, so the feed doesn't spoil the portraits.</p>
      </div>
    </MainScreen>
  );
}

/** My profile: Stats and Achievements tabs. */
export function ProfileScreen({ tab, openId }: { tab: 'stats' | 'achievements'; openId?: string }) {
  const { user } = useGame();
  return (
    <MainScreen tab="more">
      <BackRow to="more" title="My profile" sub={user.createdAt ? `Since you joined on ${date(user.createdAt)}` : undefined} />
      <div class="pad stack">
        <RankHero />
        <Tabs label="Profile" tabs={[{ id: 'stats', label: 'Stats' }, { id: 'achievements', label: 'Achievements' }]} value={tab} onChange={(t) => go(`more/profile/${t}`, true)} />
        {tab === 'achievements' ? <AchievementsTab openId={openId} /> : <StatsTab />}
      </div>
    </MainScreen>
  );
}

/** Big rank badge, name, rank, points and the distance to the next rank. */
function RankHero() {
  const { content, user, player } = useGame();
  const rank = content.ranks[player.rank - 1]!;
  const next = content.ranks[player.rank];
  return (
    <section class="rank-hero" aria-label="My rank">
      <Art slot="ranks" id={`rank_${player.rank}`} alt={`Rank ${player.rank}: ${rank.name}`} class="rank-hero-art" />
      <div class="rank-hero-info">
        <b class="rank-hero-name">{user.username}</b>
        <span class="rank-hero-rank">{rank.name}</span>
        <span class="rank-hero-pts">{num(player.points)} points</span>
      </div>
      <span class="rank-hero-next">{next ? `${num(next.points - player.points)} more points to ${next.name}` : 'Top rank for now'}</span>
      <RankProgress />
    </section>
  );
}

function StatsTab() {
  const { content, data, player } = useGame();
  const prefs = usePrefs();
  const r = useAsync(() => api<{ joinedAt: number; rankUps: { rank: number; at: number }[]; firstCatches: Record<string, number> }>('GET', '/api/stats'));
  const escapes = player.stats.attracted - player.stats.caught;
  const total = content.locations.reduce((n, l) => n + l.imps.length, 0);
  const best = Object.keys(player.catches).map((id) => data.imps.get(id)!).filter(Boolean)
    .sort((a, b) => TIER_ORDER[b.tier] - TIER_ORDER[a.tier] || b.points - a.points)[0];
  const next = content.ranks[player.rank];
  const tile = (value: string, label: string) => <div class="tile"><b>{value}</b><span>{label}</span></div>;
  const rankAt = (rank: number) => (rank === 1 ? r.data?.joinedAt : r.data?.rankUps.filter((x) => x.rank === rank).at(-1)?.at);
  return (
    <>
        <div class="tiles">
          {tile(num(player.stats.hunts), 'Hunts')}
          {tile(num(player.stats.caught), 'Catches')}
          {tile(player.stats.attracted ? pct(player.stats.caught / player.stats.attracted) : '–', 'Catch rate')}
          {tile(num(player.stats.goldEarned ?? 0), 'Gold earned')}
          {tile(`${Object.keys(player.catches).length} / ${total}`, 'Elves on list')}
          {tile(num(escapes), 'Escapes')}
        </div>
        {player.stats.goldEarned === undefined || (player.stats.goldEarned === 0 && player.stats.caught > 0)
          ? <p class="small muted">Gold earned counts from this version of the game onwards.</p> : null}
        {best && (
          <button class="card best" onClick={() => go(`imp/${best.id}`)}>
            <ImpThumb id={best.id} />
            <span><small>Best catch</small><br /><b>{best.name}</b>, {TIER_NAME[best.tier].toLowerCase()}{r.data?.firstCatches[best.id] && <><br /><small>First caught {when(r.data.firstCatches[best.id]!, prefs.clock24)}</small></>}</span>
          </button>
        )}
        <h2 class="list-head">Naughty List by location</h2>
        <div class="card">
          {content.locations.map((l) => {
            const n = l.imps.filter((i) => player.catches[i.id]).length;
            return (
              <div class="bar-row">
                <span>{l.name}</span>
                <div class="bar"><div style={{ width: `${(n / l.imps.length) * 100}%` }} /></div>
                <b>{n} / {l.imps.length}</b>
              </div>
            );
          })}
        </div>
        <h2 class="list-head">Rank history</h2>
        <div class="card">
          {content.ranks.filter((k) => k.rank <= player.rank).map((k) => {
            const at = rankAt(k.rank);
            return (
              <div class="rank-row">
                <Art slot="ranks" id={`rank_${k.rank}`} class="thumb small" />
                <b>{k.name}</b>
                <small>{at ? when(at, prefs.clock24) : ''}</small>
              </div>
            );
          })}
          {next && (
            <div class="rank-row next">
              <Art slot="ranks" id={`rank_${next.rank}`} class="thumb small dim" />
              <b>{next.name}</b>
              <small>{num(next.points - player.points)} points to go</small>
            </div>
          )}
        </div>
    </>
  );
}

const HOWTO: { id: string; title: string; text: string }[] = [
  { id: 'hunt', title: 'Hunt', text: 'Press Hunt as often as you like: there is no timer. Each time a hexed elf shows up it eats one bait, and your trap tries to catch it.' },
  { id: 'attraction', title: 'Allure', text: 'Every hunt meets an elf. Your bait, plus allure bonuses from gear, sets how strongly it pulls the rarer elves: more rare, mini boss and boss visits.' },
  { id: 'power', title: 'Power', text: "Your trap, base and charm add up to your power. The higher it is compared with the elf's power, the better your catch chance." },
  { id: 'luck', title: 'Luck', text: 'Luck adds a bonus that ignores weakness and resistance. It is strongest against common elves and weakest against bosses, so build luck to catch the small fry quickly and power to catch bosses. Charms are the easiest way to get more.' },
  { id: 'trap_types', title: 'Trap types', text: "Clockwork, Starlight and Frost, plus Carol, made in the Carol Loft. Some elves are weak to a type (×1.5 power) and some resist it (×0.5) or are immune. Each room's elves mostly share one weakness: Starlight in the Wrapping Room, Clockwork in the Toy Workshop, Frost in the Reindeer Stables. An elf's file and rumour hint at it." },
  { id: 'loot', title: "Loot and Santa's Workshop", text: "Rare elves and bosses drop materials. Craft them in Santa's Workshop into gear and bait you can't buy." },
  { id: 'pillage', title: 'Pillage', text: 'An elf that escapes may pillage you, taking gold, bait or points. Bosses do it most and take the most; ordinary elves only rarely. A pillage never takes your gold below 100 or costs you a rank.' },
  { id: 'ranks', title: 'Ranks', text: 'Catches earn points. New ranks open new rooms of the lair and new gear in the Elf Emporium.' },
];
export function HowToScreen() {
  return (
    <MainScreen tab="more">
      <BackRow to="more" title="How to play" sub="Short guide for new hunters" />
      <div class="pad stack">
        <StoryCard />
        {HOWTO.map((h) => (
          <div class="card howto">
            <Art slot="howto" id={h.id} alt="" class="howto-art" />
            <h2>{h.title}</h2>
            <p>{h.text}</p>
          </div>
        ))}
        <p class="small muted">If you run out of bait with under 50 gold, Mrs. Claus slips you 10 Stale Cookies so you can keep hunting.</p>
      </div>
    </MainScreen>
  );
}

export function SettingsScreen() {
  const { content } = useGame();
  const p = usePrefs();
  const cocoa = content.constants.stamina;
  return (
    <MainScreen tab="more">
      <BackRow to="more" title="Settings" sub="Saved on this device" />
      <div class="pad stack">
        <div class="card toggles">
          <Toggle label="Sound effects" hint="Little jingles for catches, escapes and bosses" checked={p.sound} onChange={(v) => setPref('sound', v)} />
          <Toggle label="Vibrate on a catch" hint="Phones only" checked={p.vibrate} onChange={(v) => setPref('vibrate', v)} />
          <Toggle label="Ask before using rare bait" hint="Confirm before equipping Fruitcake and other crafted bait" checked={p.confirmRareBait} onChange={(v) => setPref('confirmRareBait', v)} />
          <Toggle label="24-hour clock" hint="For the times in your hunt log" checked={p.clock24} onChange={(v) => setPref('clock24', v)} />
          <Toggle label="Space bar hunts" hint="On a computer keyboard" checked={p.spaceHunts} onChange={(v) => setPref('spaceHunts', v)} />
          <Toggle label="New catch popups" hint="Off shows a small note at the top instead" checked={p.newCatchPopups} onChange={(v) => setPref('newCatchPopups', v)} />
        </div>
        <h2 class="list-head">Set by the admin</h2>
        <div class="card">
          <p><b>{cocoa.name} meter: {cocoa.enabled ? 'on' : 'off'}</b></p>
          <p class="small muted">When it's on, each hunt uses a cup of {cocoa.name.toLowerCase()} that refills over time. Hunting is unlimited while it's off.</p>
        </div>
      </div>
    </MainScreen>
  );
}

interface AdminPlayer { username: string; isAdmin: boolean; rank: number; points: number; hunts: number; lastActive: number }
interface Restart { id: number; username: string; at: number; summary: { gold: number; points: number; rank: number; hunts: number; caught: number; impsOnList: number } }
/** Admin-only testing tools; the server rejects every call from a non-admin and only touches the admin's own save. */
function SpeedRun() {
  const { content, player, setPlayer, toast } = useGame();
  const run = async (body: object, msg: string) => {
    try {
      const r = await api<{ player: PlayerState }>('POST', '/api/admin/speedrun', body);
      setPlayer(r.player);
      toast(msg, 'good');
    } catch (e) { toast((e as Error).message, 'bad'); }
  };
  const boost = player.speedRun ?? { reward: 1, odds: false };
  return (
    <>
      <h2 class="list-head">Speed run (testing)</h2>
      <div class="card toggles">
        <Toggle label="Always attract and catch" hint="Every hunt finds an elf, catches it and drops all loot. Your own account only." checked={boost.odds}
          onChange={(v) => run({ action: 'boost', reward: boost.reward, odds: v }, v ? 'Always catching.' : 'Normal odds.')} />
        <div class="admin-row">
          <span><b>Gold and points x{boost.reward}</b><small>Multiplies what each catch gives</small></span>
          <span class="chips">
            {[1, 10, 50, 200].map((m) => (
              <button class={`chip ${boost.reward === m ? 'on' : ''}`} onClick={() => run({ action: 'boost', reward: m, odds: boost.odds }, `Rewards x${m}.`)}>x{m}</button>
            ))}
          </span>
        </div>
        <div class="admin-row">
          <span><b>Gold</b><small>You have {num(player.gold)}</small></span>
          <span class="chips">
            {[1000, 10000, 100000].map((a) => <button class="chip" onClick={() => run({ action: 'gold', amount: a }, `+${num(a)} gold.`)}>+{num(a)}</button>)}
          </span>
        </div>
        <div class="admin-row">
          <span><b>Jump to rank</b><small>Now rank {player.rank}; never goes down</small></span>
          <span class="chips">
            {content.ranks.map((r) => <button class="chip" onClick={() => run({ action: 'rank', rank: r.rank }, `Rank ${r.rank}: ${r.name}.`)}>{r.rank}</button>)}
          </span>
        </div>
        <div class="admin-row">
          <span><b>Unlock every location</b><small>Skips rank and gold requirements</small></span>
          <button class="chip" onClick={() => run({ action: 'unlock' }, 'All locations unlocked.')}>Unlock</button>
        </div>
        <div class="admin-row">
          <span><b>Unlock all elf portraits</b><small>Gives every elf 1 catch on your list; badges and boss keys are granted quietly. Start over resets it</small></span>
          <button class="chip" onClick={() => run({ action: 'portraits' }, 'Every elf is on your Naughty List.')}>Unlock</button>
        </div>
        <div class="admin-row">
          <span><b>Fill the Cheer Meter</b><small>Sets it to 15 and holds the charge</small></span>
          <button class="chip" onClick={() => run({ action: 'cheer' }, 'Cheer Meter filled.')}>Fill</button>
        </div>
        <div class="admin-row">
          <span><b>Trigger an event</b><small>Replaces any open card or challenge</small></span>
          <span class="chips">
            {(['boon', 'grand', 'scrinch'] as const).map((k) => <button class="chip" onClick={() => run({ action: 'event', kind: k }, `Event: ${k}.`)}>{k}</button>)}
          </span>
        </div>
        <div class="admin-row">
          <span><b>Stock up</b><small>Tops up every bait and charm to 200, every material to 50</small></span>
          <button class="chip" onClick={() => run({ action: 'supplies' }, 'Stocked up.')}>Add</button>
        </div>
      </div>
    </>
  );
}

export function AdminScreen() {
  const { content, toast } = useGame();
  const prefs = usePrefs();
  const players = useAsync(() => api<{ players: AdminPlayer[] }>('GET', '/api/admin/players'));
  const settings = useAsync(() => api<{ settings: { allowSignups: boolean }; cocoaMeter: boolean }>('GET', '/api/admin/settings'));
  const restarts = useAsync(() => api<{ restarts: Restart[] }>('GET', '/api/admin/restarts'));
  const feedback = useAsync(() => api<{ feedback: FeedbackItem[] }>('GET', '/api/admin/feedback'));
  const setSignups = async (v: boolean) => {
    try {
      await api('POST', '/api/admin/settings', { allowSignups: v });
      toast(v ? 'New accounts are open.' : 'New accounts are closed.', 'good');
    } catch (e) { toast((e as Error).message, 'bad'); }
    settings.reload();
  };
  return (
    <MainScreen tab="more">
      <BackRow to="more" title="Admin" sub="Only you can see this page" />
      <div class="pad stack">
        <h2 class="list-head">Players ({players.data?.players.length ?? '…'})</h2>
        <div class="card list-card">
          {players.error && <p class="error">{players.error}</p>}
          {players.data?.players.map((p) => (
            <div class="admin-row">
              <span><b>{p.username}{p.isAdmin && ' (admin)'}</b><small>{content.ranks[p.rank - 1]?.name} · {num(p.hunts)} hunts · {num(p.points)} pts</small></span>
              <small class={Date.now() - p.lastActive < 120000 ? 'online' : 'muted'}>{ago(p.lastActive)}</small>
            </div>
          ))}
        </div>
        <h2 class="list-head">Game settings</h2>
        <div class="card toggles">
          {settings.data
            ? <Toggle label="Allow new accounts" hint="Turn off once all your friends have joined" checked={settings.data.settings.allowSignups} onChange={setSignups} />
            : <Loading />}
          <Toggle label={`${content.constants.stamina.name} meter`} hint="Limits hunts with a cup that refills over time. Kept off for now; it is set in content/constants.json." checked={content.constants.stamina.enabled} onChange={() => {}} disabled />
        </div>
        <h2 class="list-head">Odds display (testing)</h2>
        <div class="card toggles">
          <Toggle label="Show exact attraction and catch rates" hint="Adds the real percentages next to the tier bars and on item cards (bait, charms, traps, shop). Admins only, this device only." checked={prefs.exactOdds} onChange={(v) => setPref('exactOdds', v)} />
        </div>
        <SpeedRun />
        <h2 class="list-head">Player feedback ({feedback.data?.feedback.length ?? '…'})</h2>
        <div class="card list-card">
          {feedback.data?.feedback.length === 0 && <p class="small muted">No feedback yet.</p>}
          {feedback.data?.feedback.map((f) => (
            <div class="admin-row">
              <span><b>{f.username}</b><small>{when(f.at, prefs.clock24)}</small><small style="white-space:pre-wrap">{f.message}</small></span>
            </div>
          ))}
        </div>
        <h2 class="list-head">Restart log</h2>
        <div class="card list-card">
          {restarts.data?.restarts.length === 0 && <p class="small muted">Nobody has started over yet.</p>}
          {restarts.data?.restarts.map((r) => (
            <div class="admin-row">
              <span><b>{r.username}</b><small>{when(r.at, prefs.clock24)}</small></span>
              <small class="r">rank {r.summary.rank} · {num(r.summary.points)} pts · {num(r.summary.gold)} gold<br />{num(r.summary.hunts)} hunts · {num(r.summary.caught)} caught · {r.summary.impsOnList} elves</small>
            </div>
          ))}
        </div>
      </div>
    </MainScreen>
  );
}

interface FeedbackItem { id: number; username: string; at: number; message: string }

export function FeedbackScreen() {
  const { toast } = useGame();
  const prefs = usePrefs();
  const mine = useAsync(() => api<{ feedback: FeedbackItem[] }>('GET', '/api/feedback'));
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try {
      await api('POST', '/api/feedback', { message: text });
      setText('');
      toast('Thanks! Your feedback was saved.', 'good');
      mine.reload();
    } catch (e) { toast((e as Error).message, 'bad'); }
    setBusy(false);
  };
  return (
    <MainScreen tab="more">
      <BackRow to="more" title="Feedback" sub="Bugs, ideas, anything. Saved for good." />
      <div class="pad stack">
        <div class="card stack">
          <textarea rows={6} maxLength={2000} placeholder="What should we fix, change or add?" value={text} onInput={(e) => setText((e.target as HTMLTextAreaElement).value)} style="width:100%;box-sizing:border-box" />
          <button class="primary-btn" disabled={busy || text.trim().length < 3} onClick={send}>Send feedback</button>
        </div>
        <h2 class="list-head">Your notes</h2>
        <div class="card list-card">
          {mine.data?.feedback.length === 0 && <p class="small muted">You haven't sent any feedback yet.</p>}
          {mine.data?.feedback.map((f) => (
            <div class="admin-row"><span><b>{when(f.at, prefs.clock24)}</b><small style="white-space:pre-wrap">{f.message}</small></span></div>
          ))}
        </div>
      </div>
    </MainScreen>
  );
}

export function AccountScreen() {
  const { content, user, player, toast, logout, setPlayer, resetLog } = useGame();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [restarting, setRestarting] = useState(false);
  const save = async (e: Event) => {
    e.preventDefault();
    setError(null);
    if (next !== confirm) { setError("The new passwords don't match."); return; }
    try {
      await api('POST', '/api/account/password', { current, next });
      setCurrent(''); setNext(''); setConfirm('');
      toast('Password changed.', 'good');
    } catch (err) { setError((err as Error).message); }
  };
  const rank = content.ranks[player.rank - 1]!;
  return (
    <MainScreen tab="more">
      <BackRow to="more" title="Account" />
      <div class="pad stack">
        <div class="card who-card">
          <Art slot="ranks" id={`rank_${player.rank}`} class="thumb" />
          <span><b>{user.username}</b><small>{rank.name}{user.createdAt ? ` · hunting since ${date(user.createdAt)}` : ''}</small></span>
        </div>
        <h2 class="list-head">Change password</h2>
        <form class="card form" onSubmit={save}>
          <input type="text" autoComplete="username" value={user.username} hidden readOnly />
          <label>Current password<input type="password" autoComplete="current-password" value={current} onInput={(e) => setCurrent((e.target as HTMLInputElement).value)} required /></label>
          <label>New password<input type="password" autoComplete="new-password" minLength={8} value={next} onInput={(e) => setNext((e.target as HTMLInputElement).value)} required /></label>
          <label>Confirm new password<input type="password" autoComplete="new-password" minLength={8} value={confirm} onInput={(e) => setConfirm((e.target as HTMLInputElement).value)} required /></label>
          {error && <p class="error">{error}</p>}
          <button class="primary-btn" type="submit">Save password</button>
        </form>
        <h2 class="list-head">Start over</h2>
        <div class="card">
          <p>Wipe your gold, gear, rank and Naughty List and begin again as a {content.ranks[0]!.name}. You'll be asked to confirm.</p>
          <button class="danger-btn" onClick={() => setRestarting(true)}>Start over</button>
        </div>
        <button class="outline-btn wide" onClick={logout}>Log out</button>
      </div>
      {restarting && (
        <RestartDialog player={player} onCancel={() => setRestarting(false)} onConfirm={async () => {
          try {
            const r = await api<{ player: PlayerState; journal: JournalRow[] }>('POST', '/api/restart', { confirm: true });
            setPlayer(r.player);
            resetLog(r.journal);
            toast('Fresh start! Santa has handed you a new Stocking Snare and 100 Stale Cookies.', 'good');
            go('hunt');
          } catch (e) {
            toast((e as Error).message, 'bad');
          } finally {
            setRestarting(false);
          }
        }} />
      )}
    </MainScreen>
  );
}

function RestartDialog({ player, onCancel, onConfirm }: { player: PlayerState; onCancel: () => void; onConfirm: () => Promise<void> }) {
  const { content } = useGame();
  const [working, setWorking] = useState(false);
  return (
    <div class="overlay" role="dialog" aria-modal="true" aria-labelledby="restart-title" onClick={(e) => { if (e.target === e.currentTarget && !working) onCancel(); }}>
      <div class="dialog">
        <h2 id="restart-title">Start over?</h2>
        <p>This wipes your progress for good. You'll lose:</p>
        <ul>
          <li>{num(player.gold)} gold and {num(player.points)} points</li>
          <li>Your rank and every unlocked location</li>
          <li>All gear, bait, charms and materials</li>
          <li>Your hunt log and the {Object.keys(player.catches).length} elves on your Naughty List</li>
        </ul>
        <p>Your account stays, and you start again as a {content.ranks[0]!.name} in the {content.locations[0]!.name}.</p>
        <div class="actions">
          <button class="outline-btn dark" disabled={working} onClick={onCancel}>Keep my progress</button>
          <button class="danger-btn" disabled={working} onClick={async () => { setWorking(true); await onConfirm(); }}>Yes, wipe and start over</button>
        </div>
      </div>
    </div>
  );
}
