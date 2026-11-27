import { useEffect, useState } from 'preact/hooks';
import type { GameEvent, JournalEntry, JournalRow, Pillage } from '../../engine/index.js';
import { api } from '../api.js';
import { useGame } from '../game.js';
import { Art } from '../lib/art.js';
import { dayLabel, num, TIER_NAME, when } from '../lib/format.js';
import { usePrefs } from '../lib/prefs.js';
import { useRateText } from '../lib/effectiveness.js';
import { go } from '../lib/route.js';
import { BackRow, MainScreen, Tabs } from '../ui.js';
import { BadgeMedal } from '../lib/medal.js';
import { HuntExtras } from './cheer.js';

/** An imp's portrait, or the "?" card until this player has caught it once. */
export function ImpThumb({ id, size = 52 }: { id: string; size?: number }) {
  const { player, data } = useGame();
  const caught = (player.catches[id] ?? 0) > 0;
  const name = data.imps.get(id)?.name ?? id;
  return (
    <Art slot="imps" id={caught ? id : '_locked'} alt={caught ? name : 'Not caught yet'} class="thumb imp-thumb" style={{ width: `${size}px`, height: `${size}px` }} />
  );
}

/** "−480 gold, −4 Golden Bow Bonbons, −180 points", plus a note when a safety rail stopped a loss. */
export function pillageText(p: Pillage, itemName: (id: string) => string): string {
  const parts: string[] = [];
  if (p.gold > 0) parts.push(`−${num(p.gold)} gold`);
  if (p.bait) parts.push(`−${num(p.bait.amount)} ${itemName(p.bait.item)}`);
  if (p.points > 0) parts.push(`−${num(p.points)} points`);
  const safe = p.safe ?? [];
  if (safe.includes('points')) parts.push('your rank is safe');
  if (safe.includes('gold')) parts.push('your gold is safe');
  if (safe.includes('bait')) parts.push(p.fumbled ? 'the thief fumbled and came away empty-handed' : 'no bait left to take');
  return parts.join(', ') || 'nothing worth taking';
}

function ObjectiveNote({ o, itemName }: { o: NonNullable<JournalEntry['objective']>; itemName: (id: string) => string }) {
  const reward = [o.gold ? `+${num(o.gold)} gold` : '', ...(o.items ?? []).map((i) => `+${num(i.amount)} ${itemName(i.item)}`)].filter(Boolean).join(', ');
  return <div class="objective-note">{o.notes.join('. ')}{reward && `: ${reward}`}</div>;
}

/** Fixed last line of every hunt entry: how much of the armed bait is left. */
function BaitLeft({ e, itemName }: { e: JournalEntry; itemName: (id: string) => string }) {
  if (!e.baitLeft) return null;
  return <div class="bait-left">Bait: {itemName(e.baitLeft.item)} x{num(e.baitLeft.amount)} remaining</div>;
}

function HuntRow({ row }: { row: JournalRow & { kind: 'hunt' } }) {
  const { data, content } = useGame();
  const prefs = usePrefs();
  const rateText = useRateText();
  const e: JournalEntry = row.entry;
  const imp = e.imp ? data.imps.get(e.imp) : undefined;
  const itemName = (id: string) => data.items.get(id)?.name ?? id;
  const keyName = (id: string) => content.locations.find((l) => l.key?.id === id)?.key?.name ?? id;
  const time = <span class="row-time">#{num(row.n)}<br />{when(row.at, prefs.clock24)}</span>;
  const rankUp = e.rankUp ? content.ranks[e.rankUp - 1] : undefined;
  const nextLoc = rankUp ? content.locations.find((l) => l.rank === rankUp.rank) : undefined;

  const main = (() => {
    if (e.outcome === 'quiet' || !imp) {
      return (
        <div class="log-row quiet">
          <span class="empty-thumb" aria-hidden="true">empty</span>
          <div class="row-body"><b>Quiet hunt</b><br />Nothing took the bait.{e.rescued && ' Mrs. Claus slipped you 10 Stale Cookies.'}{e.objective && <ObjectiveNote o={e.objective} itemName={itemName} />}<HuntExtras e={e} /><BaitLeft e={e} itemName={itemName} /></div>
          {time}
        </div>
      );
    }
    const loot = e.loot.map((l) => `${l.amount} ${itemName(l.item)}`);
    const caught = e.outcome === 'catch';
    return (
      <button class={`log-row ${caught ? 'catch' : 'escape'} ${e.pillage ? 'pillaged' : ''} ${e.firstCatch ? 'first' : ''} tier-${imp.tier}`} onClick={() => go(`imp/${imp.id}`)}>
        <ImpThumb id={imp.id} />
        <div class="row-body">
          <div class="row-head">
            <b>{caught ? `Caught ${imp.name}` : imp.name}</b>
            <span class="tier">{TIER_NAME[imp.tier]}</span>
            {e.firstCatch && <span class="pill gold">Portrait unlocked</span>}
            {e.key && <span class="pill gold">Key found</span>}
            {e.pillage && <span class="pill red">Pillaged</span>}
          </div>
          {caught
            ? <>{e.firstCatch && 'First catch! '}+{num(e.gold)} gold, +{num(e.points)} points{loot.length > 0 && `, ${loot.join(', ')}`}{e.key && <>. The boss dropped a key: <b>{keyName(e.key)}</b></>}</>
            : e.pillage
              ? <>Escaped and pillaged you: {pillageText(e.pillage, itemName)}. {rateText(e.catchChance ?? 0)} chance</>
              : <>Escaped. {rateText(e.catchChance ?? 0)} chance</>}
          {e.objective && <ObjectiveNote o={e.objective} itemName={itemName} />}
          <HuntExtras e={e} />
          <BaitLeft e={e} itemName={itemName} />
        </div>
        {time}
      </button>
    );
  })();

  return (
    <>
      {rankUp && (
        <div class="log-row rank-up">
          <Art slot="ranks" id={`rank_${rankUp.rank}`} alt="" class="thumb small" />
          <div class="row-body">Rank up! You are now <b>{rankUp.name}</b>.{nextLoc && ` The ${nextLoc.name} can be unlocked.`}</div>
          <span class="row-time">{when(row.at, prefs.clock24)}</span>
        </div>
      )}
      {main}
    </>
  );
}

export function eventText(ev: GameEvent, itemName: (id: string) => string, locName: (id: string) => string, boonName: (id: string) => string = (id) => id) {
  switch (ev.type) {
    case 'buy': return <>Bought <b>{num(ev.amount)} {itemName(ev.item)}</b> for {num(ev.gold)} gold</>;
    case 'sell': return <>Sold <b>{num(ev.amount)} {itemName(ev.item)}</b> for {num(ev.gold)} gold</>;
    case 'craft': return <>Crafted <b>{ev.amount > 1 ? `${num(ev.amount)} ` : ''}{itemName(ev.item)}</b> for {num(ev.gold)} gold and materials</>;
    case 'intro': return <>The story so far</>;
    case 'cheer_pick': return <>Cheer boon: <b>{boonName(ev.boon)}</b></>;
    case 'event_answer': return <><b>{ev.name}</b>: {ev.text}</>;
    case 'achievement': return <>Achievement{ev.ids.length > 1 ? 's' : ''}</>;
    case 'arrival': return <>Arrived in the <b>{locName(ev.location)}</b></>;
    case 'objective': return ev.action === 'start_run' ? <>Started a <b>sleigh run</b></> : <>Took a <b>Rush order</b></>;
    case 'travel': return <>Travelled to the <b>{locName(ev.location)}</b>{ev.unlockCost > 0 && ` and unlocked it for ${num(ev.unlockCost)} gold`}</>;
    case 'equip':
      if (!ev.item) return <>Took off {ev.previous ? itemName(ev.previous) : 'your'} {ev.slot}</>;
      if ((ev.slot === 'trap' || ev.slot === 'base') && ev.previous) return <>Swapped {ev.slot}: <b>{itemName(ev.item)}</b> replaces {itemName(ev.previous)}</>;
      return <>Equipped <b>{itemName(ev.item)}</b>{ev.slot === 'bait' ? ' as bait' : ''}</>;
  }
}

const BADGE: Record<GameEvent['type'], string> = { buy: 'Buy', sell: 'Sell', craft: 'Craft', travel: 'Travel', equip: 'Gear', intro: 'Story', arrival: 'Arrived', objective: 'Goal', achievement: 'Badge', cheer_pick: 'Cheer', event_answer: 'Event' };

function EventRow({ row }: { row: JournalRow & { kind: 'event' } }) {
  const { data, content } = useGame();
  const prefs = usePrefs();
  const ev = row.entry;
  return (
    <div class="log-row event">
      <span class={`badge badge-${ev.type}`}>{BADGE[ev.type]}</span>
      <div class="row-body">{eventText(ev, (id) => data.items.get(id)?.name ?? id, (id) => data.locations.get(id)?.name ?? id, (id) => content.boons.find((b) => b.id === id)?.name ?? id)}</div>
      <span class="row-time">{when(row.at, prefs.clock24)}</span>
    </div>
  );
}

/** Santa's intro letter (content/story.json). In the log it opens folded after the first paragraph. */
export function StoryCard({ at, folded = true }: { at?: number; folded?: boolean }) {
  const { content } = useGame();
  const prefs = usePrefs();
  const [open, setOpen] = useState(!folded);
  const story = content.story?.intro;
  if (!story) return null;
  const paragraphs = open ? story.paragraphs : story.paragraphs.slice(0, 1);
  return (
    <div class="story-card">
      <div class="story-head">
        <Art slot="brand" id="icon" class="thumb small" />
        <h3>{story.title}</h3>
        {at !== undefined && <span class="row-time">{when(at, prefs.clock24)}</span>}
      </div>
      {paragraphs.map((p) => <p>{p}</p>)}
      {open ? <p class="signoff">{story.signoff}</p>
        : <button class="text-btn" onClick={() => setOpen(true)}>Read the whole letter</button>}
    </div>
  );
}

/** First arrival in a location: its intro, folded after the first sentence. */
export function ArrivalCard({ location, at }: { location: string; at: number }) {
  const { content, data } = useGame();
  const prefs = usePrefs();
  const [open, setOpen] = useState(false);
  const intro = content.story?.locations?.[location]?.intro ?? '';
  const cut = intro.indexOf('. ');
  const short = cut > 0 && cut < intro.length - 2 ? intro.slice(0, cut + 1) : intro;
  return (
    <div class="arrival-card">
      <div class="story-head">
        <span class="pill gold">Arrived</span>
        <h3>{data.locations.get(location)?.name ?? location}</h3>
        <span class="row-time">{when(at, prefs.clock24)}</span>
      </div>
      <p>{open ? intro : short}</p>
      {!open && short !== intro && <button class="text-btn" onClick={() => setOpen(true)}>Read more</button>}
    </div>
  );
}

/** Earned badges: one row with each badge, tap to open it on My profile. */
function AchievementRow({ ids, at, backfill, rewards }: { ids: string[]; at: number; backfill?: boolean; rewards?: Record<string, number> }) {
  const { content, data } = useGame();
  const prefs = usePrefs();
  const list = ids.map((id) => content.achievements.find((a) => a.id === id)).filter((a) => !!a);
  if (!list.length) return null;
  return (
    <button class="log-row event achievement-row" onClick={() => go(`more/profile/achievements/${list[0]!.id}`)}>
      <BadgeMedal a={list[0]!} earned size={44} />
      <div class="row-body">
        {backfill ? <><b>Welcome back!</b> You've already earned {list.length} badge{list.length > 1 ? 's' : ''}: </> : <>🏅 Achievement: </>}
        <b>{list.map((a) => a.name).join(', ')}</b>
        {rewards && Object.keys(rewards).length > 0 && <><br />🎁 Rewards: {Object.entries(rewards).map(([id, n]) => `${num(n)} ${data.items.get(id)?.name ?? id}`).join(', ')}</>}
      </div>
      <span class="row-time">{when(at, prefs.clock24)}</span>
    </button>
  );
}

export function LogRow({ row }: { row: JournalRow }) {
  if (row.kind === 'event' && row.entry.type === 'achievement') return <AchievementRow ids={row.entry.ids} at={row.at} backfill={row.entry.backfill} rewards={row.entry.rewards} />;
  if (row.kind === 'event' && row.entry.type === 'intro') return <StoryCard at={row.at} />;
  if (row.kind === 'event' && row.entry.type === 'arrival') return <ArrivalCard location={row.entry.location} at={row.at} />;
  return row.kind === 'hunt' ? <HuntRow row={row} /> : <EventRow row={row} />;
}

type Filter = 'all' | 'catches' | 'escapes' | 'pillaged' | 'events' | 'bosses';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'catches', label: 'Catches' }, { id: 'escapes', label: 'Escapes' }, { id: 'pillaged', label: 'Pillaged' }, { id: 'events', label: 'Events' }, { id: 'bosses', label: 'Bosses' },
];

export function HistoryScreen() {
  const { player } = useGame();
  const [filter, setFilter] = useState<Filter>('all');
  const [rows, setRows] = useState<JournalRow[]>([]);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (reset: boolean) => {
    setLoading(true);
    setError(null);
    const before = reset ? '' : `&before=${rows.at(-1)?.id ?? ''}`;
    try {
      const r = await api<{ rows: JournalRow[]; more: boolean }>('GET', `/api/history?filter=${filter}&limit=50${before}`);
      setRows((old) => (reset ? r.rows : [...old, ...r.rows]));
      setMore(r.more);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(true); }, [filter]);

  const escapes = player.stats.attracted - player.stats.caught;
  let lastDay = '';
  return (
    <MainScreen tab="hunt">
      <BackRow to="hunt" title="Full history" sub={`${num(player.stats.hunts)} hunts · ${num(player.stats.caught)} catches · ${num(escapes)} escapes`} />
      <div class="pad">
        <Tabs label="Show" tabs={FILTERS} value={filter} onChange={setFilter} />
        <div class="log">
          {rows.map((row) => {
            const day = dayLabel(row.at);
            const head = day !== lastDay ? <h3 class="day">{day}</h3> : null;
            lastDay = day;
            return <>{head}<LogRow row={row} /></>;
          })}
        </div>
        {error && <p class="error">{error}</p>}
        {!loading && rows.length === 0 && <p class="muted center-pad">Nothing here yet.</p>}
        {loading && <p class="muted center-pad">Loading…</p>}
        {more && !loading && <button class="outline-btn wide" onClick={() => load(false)}>Load older hunts</button>}
        {!more && rows.length > 0 && <p class="muted center-pad small">That's the start of your saved history.</p>}
      </div>
    </MainScreen>
  );
}
