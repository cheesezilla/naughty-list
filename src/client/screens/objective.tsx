import type { Location, Objective } from '../../content/schema.js';
import { count, type ObjectiveState } from '../../engine/index.js';
import { useState } from 'preact/hooks';
import { useGame } from '../game.js';
import { Art } from '../lib/art.js';
import { num, TYPE_NAME } from '../lib/format.js';
import { go } from '../lib/route.js';
import { TypeMedal } from '../lib/medal.js';
import { Sheet } from '../ui.js';

/** "How to clear <location>": the steps from story.json and the area's intro. */
export function HintSheet({ location, onClose }: { location: Location; onClose: () => void }) {
  const { content } = useGame();
  const text = content.story?.locations?.[location.id];
  const ladder = location.objective?.type === 'bait_ladder';
  return (
    <Sheet title={`How to clear the ${location.name}`} onClose={onClose} bare>
      <div class={`hint-sheet loc-${location.id}`}>
        <h2>How to clear the {location.name}</h2>
        <ol>{text?.hint.map((h) => <li>{h}</li>)}</ol>
        {text && <div class="hint-about"><b>About this room</b><p>{text.intro}</p></div>}
        <div class="hint-buttons">
          {ladder && <button class="outline-btn" onClick={() => { onClose(); go('workshop'); }}>Open Workshop</button>}
          <button class="primary-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </Sheet>
  );
}

/** The location's own loop, between the gear card and the hunt log. Nothing for a location without one. */
export function ObjectivePanel({ location, onHint }: { location: Location; onHint: () => void }) {
  const { player } = useGame();
  const o = location.objective;
  if (!o) return location.id === 'cookie_pantry' ? <PantryGoals location={location} /> : null;
  const s = player.objectives?.[location.id];
  return (
    <section class={`objective-panel loc-${location.id}`} aria-label={`${location.name} goal`}>
      {o.type === 'bait_ladder' && <LadderPanel o={o} location={location} />}
      {o.type === 'order_board' && <OrderPanel o={o} s={s?.type === 'order_board' ? s : undefined} location={location} />}
      {o.type === 'sleigh_run' && <SleighPanel o={o} s={s?.type === 'sleigh_run' ? s : undefined} location={location} />}
      <button class="text-btn panel-help" onClick={onHint}>How does this work?</button>
    </section>
  );
}

type Ladder = Extract<Objective, { type: 'bait_ladder' }>;
type Orders = Extract<Objective, { type: 'order_board' }>;
type Sleigh = Extract<Objective, { type: 'sleigh_run' }>;

function LadderPanel({ o, location }: { o: Ladder; location: Location }) {
  const { data, player, act } = useGame();
  const armed = Math.max(0, o.tiers.findIndex((t) => player.setup.bait && t.baits.includes(player.setup.bait)));
  // The player browses tiers freely; equipping a bait doesn't move the view.
  const [picked, setPicked] = useState<number | null>(null);
  const sel = Math.min(picked ?? armed, o.tiers.length - 1);
  const tier = o.tiers[sel]!;
  const owned = (t: Ladder['tiers'][number]) => t.baits.reduce((n, b) => n + count(player, b), 0);
  const recipe = tier.recipe ? data.recipes.get(tier.recipe) : undefined;
  const boss = location.imps.find((i) => i.id === o.boss);
  const top = o.tiers.at(-1)!;
  return (
    <>
      <h3><Art slot="baits" id="ribbon_candy" class="panel-icon" alt="" />Bait Ladder <small>Tier {armed + 1} armed</small></h3>
      <ol class="ladder">
        {o.tiers.map((t, i) => (
          <li class={`${i === armed ? 'armed' : ''} ${i === sel ? 'picked' : ''}`}>
            <button type="button" class="ladder-tab" aria-pressed={i === sel} onClick={() => setPicked(i)}>
              <b>{i + 1}. {t.name}</b>
              <span>owned {num(owned(t))}</span>
            </button>
          </li>
        ))}
      </ol>
      <div class="ladder-next">
        <div>
          {tier.baits.map((id) => {
            const have = count(player, id);
            const on = player.setup.bait === id;
            const name = data.items.get(id)?.name ?? id;
            const crafts = recipe && recipe.output.item === id;
            return (
              <div class="ladder-bait">
                <div class="ladder-bait-info">
                  <b>{name}</b>
                  {crafts && Object.entries(recipe.ingredients).map(([ing, need]) => (
                    <span class="ladder-ing">{data.items.get(ing)?.name} <span class={count(player, ing) >= need ? 'ok' : 'no'}>{num(count(player, ing))}/{need}</span></span>
                  ))}
                </div>
                <div class="ladder-bait-side">
                  <span class="muted">owned {num(have)}</span>
                  {crafts && <button class="small-btn" onClick={() => go(`workshop/${tier.recipe}`)}>Craft</button>}
                  <button class="small-btn" disabled={on || have < 1} onClick={() => act('/api/setup', { slot: 'bait', item: id }, `Equipped ${name}.`)}>{on ? 'Equipped' : 'Equip'}</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p class="panel-line">{boss?.name} only comes for {top.name}s.</p>
      {boss && (
        <p class="panel-line">
          <b>Prepare before the faceoff:</b> {boss.name} is weak only to the Carol power type, and Clockwork traps do half damage. Bring a Carol trap. The elves in the Workshop say they can make a Carol Horn from a bundle of bent reeds and a torn songsheet. Listen for singing drifting down from somewhere above.
        </p>
      )}
    </>
  );
}

function OrderPanel({ o, s, location }: { o: Orders; s?: Extract<ObjectiveState, { type: 'order_board' }>; location: Location }) {
  const { data, player, act } = useGame();
  const trap = data.items.get(player.setup.trap);
  const trapType = trap?.kind === 'trap' ? trap.type : null;
  const name = (id: string) => location.imps.find((i) => i.id === id)?.name ?? id;
  if (!s || !s.progress) {
    return (
      <>
        <h3><Art slot="materials" id="toymakers_gear" class="panel-icon" alt="" />Order Board</h3>
        <p class="panel-line">The elves pin three toy orders to the board when you hunt here: one each for Clockwork, Starlight and Frost.</p>
      </>
    );
  }
  const untilInspection = o.inspectionEvery - (s.ordersDone % o.inspectionEvery);
  const rush = s.rushLeft > 0;
  const types = ['clockwork', 'starlight', 'frost'] as const;
  return (
    <>
      <h3><Art slot="materials" id="toymakers_gear" class="panel-icon" alt="" />{rush ? 'Rush order' : 'Order Board'} <small>{rush ? `${s.rushLeft} of ${o.rushSlots} parts to go` : `${o.slots} catches each`}</small></h3>
      {rush
        ? <p class="panel-line">Any catch counts toward the Rush order. The three standing orders wait.</p>
        : (
          <ol class="order-slots">
            {types.map((t) => (
              <li class={`${s.progress[t] > 0 ? 'next' : ''} ${t === trapType ? 'armed' : ''}`}>
                <TypeMedal type={t} size={30} />
                <b>{TYPE_NAME[t]}</b>
                <span>{s.progress[t]} of {o.slots}{t === trapType ? ' · armed' : ''}{s.finished.includes(t) ? ' · done' : ''}</span>
              </li>
            ))}
          </ol>
        )}
      {s.forced
        ? <p class="panel-line strong">{name(s.forced)} is coming! The next elf you attract here is them.</p>
        : !rush && <p class="panel-line">Every catch fills the order for your trap's type ({trap?.name}: {trapType ? TYPE_NAME[trapType] : 'none'}; Carol traps fill whichever order is furthest along). Finish all three types for a Triple Crate (+{num(o.tripleGold)} gold and every crate bonus).</p>}
      {!rush && !s.forced && <p class="panel-line">{untilInspection === 1 ? `${name(o.miniboss)} inspects after the next finished order.` : `${name(o.miniboss)} inspects in ${untilInspection} orders.`} Each order pays {num(o.crateGold)} gold and a bonus.</p>}
      {s.rushReady && !rush && (
        <button class="primary-btn wide" onClick={() => act('/api/objective', { action: 'rush_order' }, `Rush order pinned: ${o.rushSlots} parts. Finish it to bring ${name(o.boss)}.`)}>
          Take a Rush order ({o.rushSlots} catches with any trap, brings {name(o.boss)})
        </button>
      )}
    </>
  );
}

function SleighPanel({ o, s, location }: { o: Sleigh; s?: Extract<ObjectiveState, { type: 'sleigh_run' }>; location: Location }) {
  const { act, log, data } = useGame();
  const [sure, setSure] = useState(false);
  // The newest hunt here that changed Readiness, as "Bell Thief escaped −8".
  const last = (() => {
    for (const r of log) {
      if (r.kind !== 'hunt' || r.entry.location !== location.id) continue;
      const note = r.entry.objective?.notes.find((n) => n.startsWith('Readiness'));
      if (!note) continue;
      const [a, b] = note.replace('Readiness ', '').split(' → ').map(Number);
      const imp = r.entry.imp ? data.imps.get(r.entry.imp)?.name : undefined;
      const d = (b ?? 0) - (a ?? 0);
      return `${imp ?? 'A hunt'} ${r.entry.outcome === 'catch' ? 'caught' : 'escaped'} ${d >= 0 ? '+' : '−'}${Math.abs(d)}`;
    }
    return null;
  })();
  const name = (id: string) => location.imps.find((i) => i.id === id)?.name ?? id;
  if (s?.forced) {
    return (
      <>
        <h3><Art slot="materials" id="silver_sleighbell" class="panel-icon" alt="" />Sleigh Run <small>Launched!</small></h3>
        <p class="panel-line strong">{name(s.forced)} is attacking the sleigh. The next elf you attract here is them.</p>
      </>
    );
  }
  if (!s?.active) {
    return (
      <>
        <h3><Art slot="materials" id="silver_sleighbell" class="panel-icon" alt="" />Sleigh Run {s?.launches ? <small>{s.launches} launched</small> : null}</h3>
        <p class="panel-line">Get the sleigh 100% ready within {o.hunts} hunts. Catches build Readiness; escaped thieves take it away. Launch it and {name(o.boss)} attacks.{(o.upkeep > 0 || o.catchGoldMult < 1) && <> A run costs gold: {o.upkeep} per hunt, and catches pay {Math.round(o.catchGoldMult * 100)}% gold.</>}</p>
        <button class="primary-btn wide" onClick={() => act('/api/objective', { action: 'start_run' }, `Sleigh run started: ${o.hunts} hunts.`)}>Start sleigh run</button>
      </>
    );
  }
  return (
    <>
      <h3><Art slot="materials" id="silver_sleighbell" class="panel-icon" alt="" />Sleigh Run <small>{s.left} hunts left</small></h3>
      <div class="readiness" role="img" aria-label={`Readiness ${s.readiness} of 100`}>
        <div class="fill" style={{ width: `${s.readiness}%` }} />
        <div class="mark" style={{ left: `${o.minibossFrom}%` }} />
        <span class="sleigh" style={{ left: `${Math.min(94, Math.max(8, s.readiness))}%` }} aria-hidden="true">
          <svg width="26" height="18" viewBox="0 0 26 18" fill="none" stroke="#7a1d14" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11h15l4-6" /><path d="M5 11V5h10l2 6" fill="#c8352b" /><path d="M1 15h20c2 0 3-1 4-3" /><path d="M7 11v4M15 11v4" /></svg>
        </span>
      </div>
      <p class="panel-line"><b>Readiness {s.readiness}</b> / 100 · {s.readiness >= o.minibossFrom ? `${name(o.miniboss)} is about (${o.minibossFrom}+)` : `${name(o.miniboss)} comes at ${o.minibossFrom}`}</p>
      {last && <p class="panel-line small">Last: {last}</p>}
      {(o.upkeep > 0 || o.catchGoldMult < 1) && <p class="panel-line small muted">While the run is on, each hunt costs {o.upkeep} gold and catches pay {Math.round(o.catchGoldMult * 100)}% gold.</p>}
      <button class="text-btn wide" onClick={() => { if (!sure) { setSure(true); return; } setSure(false); act('/api/objective', { action: 'abandon_run' }, 'Sleigh run abandoned.'); }}>
        {sure ? 'Tap again to abandon (Readiness resets to 0)' : 'Abandon run and restart'}
      </button>
    </>
  );
}

/** The Cookie Pantry has no boss: its goals are reaching the next area's rank and (optionally) every portrait. */
function PantryGoals({ location }: { location: Location }) {
  const { content, player } = useGame();
  const next = content.locations.find((l) => !l.side && l.rank > location.rank);
  const rankDone = !!next && player.rank >= next.rank;
  const rankName = next ? content.ranks[next.rank - 1]?.name : undefined;
  const elves = location.imps;
  const got = elves.filter((i) => (player.catches[i.id] ?? 0) > 0).length;
  const allDone = got >= elves.length;
  return (
    <section class={`objective-panel loc-${location.id}`} aria-label={`${location.name} goals`}>
      <h3>Goals <small>{location.name}</small></h3>
      <ul class="goals">
        <li class={rankDone ? 'done' : ''}>
          <span class="tick" aria-hidden="true">{rankDone ? '✓' : ''}</span>
          <span>
            <b>Rank up and move on</b>
            <small>{rankDone ? `Reached ${rankName}. The ${next!.name} is open to you.` : `Reach ${rankName} to move on to the ${next?.name}.`}</small>
          </span>
        </li>
        <li class={allDone ? 'done' : ''}>
          <span class="tick" aria-hidden="true">{allDone ? '✓' : ''}</span>
          <span>
            <b>Unlock every portrait <i>(optional)</i></b>
            <small>{got}/{elves.length} elves caught</small>
          </span>
        </li>
      </ul>
    </section>
  );
}
