import type { Location, Objective } from '../../content/schema.js';
import { count, type ObjectiveState } from '../../engine/index.js';
import { useGame } from '../game.js';
import { Art } from '../lib/art.js';
import { num, TYPE_NAME } from '../lib/format.js';
import { go } from '../lib/route.js';
import { Sheet } from '../ui.js';

/** "How to clear <location>": the steps from story.json and the area's intro. */
export function HintSheet({ location, onClose }: { location: Location; onClose: () => void }) {
  const { content } = useGame();
  const text = content.story?.locations?.[location.id];
  const ladder = location.objective?.type === 'bait_ladder';
  return (
    <Sheet title={`How to clear the ${location.name}`} onClose={onClose}>
      <div class={`hint-sheet loc-${location.id}`}>
        <ol>{text?.hint.map((h) => <li>{h}</li>)}</ol>
        {text && <div class="hint-about"><b>About this room</b><p>{text.intro}</p></div>}
        {ladder && <button class="outline-btn wide" onClick={() => { onClose(); go('workshop'); }}>Open Santa's Workshop</button>}
      </div>
    </Sheet>
  );
}

/** The location's own loop, between the gear card and the hunt log. Nothing for a location without one. */
export function ObjectivePanel({ location, onHint }: { location: Location; onHint: () => void }) {
  const { player } = useGame();
  const o = location.objective;
  if (!o) return null;
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
  const { data, player } = useGame();
  const armed = Math.max(0, o.tiers.findIndex((t) => player.setup.bait && t.baits.includes(player.setup.bait)));
  const owned = (t: Ladder['tiers'][number]) => t.baits.reduce((n, b) => n + count(player, b), 0);
  // The next recipe to show: the first tier above the armed one, or the top tier's.
  const next = o.tiers.find((t, i) => i > armed && t.recipe) ?? o.tiers.findLast((t) => t.recipe);
  const recipe = next?.recipe ? data.recipes.get(next.recipe) : undefined;
  const boss = location.imps.find((i) => i.id === o.boss);
  const top = o.tiers.at(-1)!;
  return (
    <>
      <h3>Bait Ladder <small>Tier {armed + 1} armed</small></h3>
      <ol class="ladder">
        {o.tiers.map((t, i) => (
          <li class={i === armed ? 'armed' : ''}>
            <b>{i + 1}. {t.name}</b>
            <span>owned {num(owned(t))}</span>
          </li>
        ))}
      </ol>
      {recipe && (
        <div class="ladder-next">
          <p>
            Next: <b>{data.items.get(recipe.output.item)?.name}</b>
            <br />
            {Object.entries(recipe.ingredients).map(([id, need], i) => (
              <>{i > 0 && ' · '}{data.items.get(id)?.name} <span class={count(player, id) >= need ? 'ok' : 'no'}>{num(count(player, id))}/{need}</span></>
            ))}
          </p>
          <button class="small-btn" onClick={() => go('workshop')}>Make</button>
        </div>
      )}
      <p class="panel-line">{boss?.name} only comes for {top.name}s.</p>
    </>
  );
}

function OrderPanel({ o, s, location }: { o: Orders; s?: Extract<ObjectiveState, { type: 'order_board' }>; location: Location }) {
  const { data, player, act } = useGame();
  const trap = data.items.get(player.setup.trap);
  const trapType = trap?.kind === 'trap' ? trap.type : null;
  const name = (id: string) => location.imps.find((i) => i.id === id)?.name ?? id;
  if (!s) {
    return (
      <>
        <h3>Order Board</h3>
        <p class="panel-line">The elves pin your first toy order to the board when you hunt here.</p>
      </>
    );
  }
  const needed = s.slots[s.filled];
  const untilInspection = o.inspectionEvery - (s.ordersDone % o.inspectionEvery);
  return (
    <>
      <h3>{s.rush ? 'Rush order' : 'Order Board'} <small>{s.rush ? `${s.slots.length} parts` : `Order ${(s.ordersDone % o.inspectionEvery) + 1} of ${o.inspectionEvery}`}</small></h3>
      <ol class="order-slots">
        {s.slots.map((t, i) => (
          <li class={i < s.filled ? 'done' : i === s.filled ? 'next' : ''}>
            <Art slot="trap_types" id={t} class="type-badge" alt="" />
            <b>{TYPE_NAME[t]}</b>
            <span>{i < s.filled ? 'filled' : i === s.filled ? 'next' : 'to do'}</span>
          </li>
        ))}
      </ol>
      {s.forced
        ? <p class="panel-line strong">{name(s.forced)} is coming! The next imp you attract here is them.</p>
        : needed && <p class="panel-line">Next part needs <b>{TYPE_NAME[needed]}</b>. Your trap: {trap?.name} ({trapType ? TYPE_NAME[trapType] : 'none'}) <span class={trapType === needed ? 'ok' : 'no'}>{trapType === needed ? 'matches' : "doesn't match"}</span></p>}
      {!s.rush && !s.forced && <p class="panel-line">{untilInspection === 1 ? `${name(o.miniboss)} inspects after this order.` : `${name(o.miniboss)} inspects in ${untilInspection} orders.`} Each order pays {num(o.crateGold)} gold and a bonus.</p>}
      {s.rushReady && !s.rush && (
        <button class="primary-btn wide" onClick={() => act('/api/objective', { action: 'rush_order' }, `Rush order pinned: ${o.rushSlots} parts. Finish it to bring ${name(o.boss)}.`)}>
          Take a Rush order ({o.rushSlots} parts, brings {name(o.boss)})
        </button>
      )}
    </>
  );
}

function SleighPanel({ o, s, location }: { o: Sleigh; s?: Extract<ObjectiveState, { type: 'sleigh_run' }>; location: Location }) {
  const { act } = useGame();
  const name = (id: string) => location.imps.find((i) => i.id === id)?.name ?? id;
  if (s?.forced) {
    return (
      <>
        <h3>Sleigh Run <small>Launched!</small></h3>
        <p class="panel-line strong">{name(s.forced)} is attacking the sleigh. The next imp you attract here is them.</p>
      </>
    );
  }
  if (!s?.active) {
    return (
      <>
        <h3>Sleigh Run {s?.launches ? <small>{s.launches} launched</small> : null}</h3>
        <p class="panel-line">Get the sleigh 100% ready within {o.hunts} hunts. Catches build Readiness; escaped thieves take it away. Launch it and {name(o.boss)} attacks.</p>
        <button class="primary-btn wide" onClick={() => act('/api/objective', { action: 'start_run' }, `Sleigh run started: ${o.hunts} hunts.`)}>Start sleigh run</button>
      </>
    );
  }
  return (
    <>
      <h3>Sleigh Run <small>{s.left} hunts left</small></h3>
      <div class="readiness" role="img" aria-label={`Readiness ${s.readiness} of 100`}>
        <div class="fill" style={{ width: `${s.readiness}%` }} />
        <div class="mark" style={{ left: `${o.minibossFrom}%` }} />
      </div>
      <p class="panel-line"><b>Readiness {s.readiness}</b> / 100 · {s.readiness >= o.minibossFrom ? `${name(o.miniboss)} is about` : `${name(o.miniboss)} comes at ${o.minibossFrom}`}</p>
    </>
  );
}
