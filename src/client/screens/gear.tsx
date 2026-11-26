import { count, huntOdds, priceOf, sellValue, type AnyItem, type Setup } from '../../engine/index.js';
import { useGame } from '../game.js';
import { Art, itemSlot } from '../lib/art.js';
import { num, pct, TYPE_NAME } from '../lib/format.js';
import { go } from '../lib/route.js';
import { BackRow, FullScreen, Tabs } from '../ui.js';
import { TypeMedal } from '../lib/medal.js';
import { useExactOdds, useRateText } from '../lib/effectiveness.js';
import { catchIfAttracted, TrapOnBase } from './hunt.js';

type Slot = keyof Setup;
const SLOTS: { id: Slot; label: string }[] = [{ id: 'trap', label: 'Trap' }, { id: 'base', label: 'Base' }, { id: 'bait', label: 'Bait' }, { id: 'charm', label: 'Charm' }];

/** One line of numbers for any item. */
export function itemStats(item: AnyItem, exact: boolean): string {
  const bits: string[] = [];
  if (item.kind === 'trap' || item.kind === 'base') {
    bits.push(`Power ${num(item.power)}`, `Luck ${item.luck}`);
    if (exact && item.attraction) bits.push(`+${pct(item.attraction)} attraction`);
    if (item.kind === 'base' && item.goodFor) bits.push(item.goodFor);
    if (item.kind === 'base' && item.affinity) bits.push(`+${pct(item.affinity.powerBonus)} power with ${item.affinity.types.map((t) => TYPE_NAME[t]).join(' or ')} traps`);
  } else if (item.kind === 'bait') {
    if (exact) bits.push(`${pct(item.attraction)} attraction`);
    if (item.rareMultiplier) bits.push(`rares ×${item.rareMultiplier}`);
  } else if (item.kind === 'charm') {
    if (item.luck) bits.push(`+${item.luck} luck`);
    if (item.power) bits.push(`+${item.power} power`);
    if (item.powerBonus) bits.push(`+${pct(item.powerBonus)} power`);
    if (item.attraction) bits.push(exact ? `+${pct(item.attraction)} attraction` : 'Attracts more elves');
  } else {
    bits.push(`Sells for ${num(item.sellPrice)} gold`);
  }
  return bits.join(' · ');
}

/** Labelled stat rows, the same order everywhere: Power, Luck, Attraction, Rare bonus, Good for, Affinity. */
export function itemStatRows(item: AnyItem, exact: boolean): [string, string][] {
  const rows: [string, string][] = [];
  if (item.kind === 'trap' || item.kind === 'base') {
    rows.push(['Power', num(item.power)], ['Luck', String(item.luck)]);
    if (exact && item.attraction) rows.push(['Attraction', `+${pct(item.attraction)}`]);
    if (item.kind === 'base' && item.goodFor) rows.push(['Good for', item.goodFor]);
    if (item.kind === 'base' && item.affinity) rows.push(['Affinity', `+${pct(item.affinity.powerBonus)} power with ${item.affinity.types.map((t) => TYPE_NAME[t]).join(' or ')} traps`]);
  } else if (item.kind === 'bait') {
    if (exact) rows.push(['Attraction', pct(item.attraction)]);
    if (item.rareMultiplier) rows.push(['Rares', `×${item.rareMultiplier}`]);
  } else if (item.kind === 'charm') {
    if (item.luck) rows.push(['Luck', `+${item.luck}`]);
    if (item.power) rows.push(['Power', `+${item.power}`]);
    if (item.powerBonus) rows.push(['Power', `+${pct(item.powerBonus)}`]);
    if (item.attraction) rows.push(['Attraction', exact ? `+${pct(item.attraction)}` : 'Boost']);
  }
  return rows;
}

/** Power type medal(s) then stat rows. Shared by the Emporium and Santa's Workshop so both look the same. */
export function ItemStatBlock({ item, exact }: { item: AnyItem; exact: boolean }) {
  if (item.kind === 'material') return <small class="muted">Sells for {num(item.sellPrice)} gold</small>;
  const types = item.kind === 'trap' ? [item.type] : item.kind === 'base' ? item.affinity?.types ?? [] : [];
  const rows = itemStatRows(item, exact);
  return (
    <div class="stat-block">
      {types.length > 0 && (
        <span class="type-chip">{types.map((t) => <TypeMedal type={t} size={20} />)}{types.map((t) => TYPE_NAME[t]).join(' / ')}{item.kind === 'base' && ' affinity'}</span>
      )}
      {rows.map(([label, value]) => <div class="stat-row"><span>{label}</span><b>{value}</b></div>)}
    </div>
  );
}

export function ItemThumb({ item, class: cls = 'thumb' }: { item: AnyItem; class?: string }) {
  if (item.kind === 'trap') return <span class={`${cls} gear-thumb`}><Art slot="traps" id={item.id} alt={item.name} /></span>;
  if (item.kind === 'base') return <span class={`${cls} gear-thumb`}><Art slot="bases" id={item.id} alt={item.name} /></span>;
  return <Art slot={itemSlot(item.kind)} id={item.id} alt={item.name} class={cls} />;
}

function Compare({ setup }: { setup: Setup }) {
  const { content, player } = useGame();
  const rateText = useRateText();
  const a = huntOdds(content, player.setup, player.location);
  const b = huntOdds(content, setup, player.location);
  const line = (label: string, x: number, y: number, f: (n: number) => string) => (
    <div class="cmp"><span>{label}</span><b>{f(x)} <span class={y > x + 1e-9 ? 'up' : y < x - 1e-9 ? 'down' : ''}>→ {f(y)}</span></b></div>
  );
  return (
    <div class="compare">
      {line('Power', a.stats.power, b.stats.power, num)}
      {line('Luck', a.stats.luck, b.stats.luck, num)}
      {line('Attraction', a.stats.attraction, b.stats.attraction, rateText)}
      {line('Catch', catchIfAttracted(a), catchIfAttracted(b), rateText)}
    </div>
  );
}

export function ArsenalScreen({ slot, previewId }: { slot: Slot; previewId?: string }) {
  const { content, data, player, act } = useGame();
  const exact = useExactOdds();
  const list = [...data.items.values()].filter((i) => i.kind === slot);
  const owned = list.filter((i) => count(player, i.id) > 0);
  const forSale = list.filter((i) => count(player, i.id) === 0 && priceOf(i) !== null);
  const current = player.setup[slot];
  const previewing = previewId ?? current ?? owned[0]?.id;
  const item = previewing ? data.items.get(previewing) : undefined;
  const ownsPreview = !!item && count(player, item.id) > 0;
  const setup = { ...player.setup, [slot]: previewing ?? null };
  const pick = (id: string) => go(`arsenal/${slot}/${id}`, true);
  const noun = { trap: 'traps', base: 'bases', bait: 'bait', charm: 'charms' }[slot];

  return (
    <FullScreen class="arsenal">
      <BackRow label="Close" to="hunt" title="Arsenal" sub="Tap an item to preview it, then equip" />
      <div class="pad stack">
        <Tabs label="Slot" tabs={SLOTS} value={slot} onChange={(s) => go(`arsenal/${s}`, true)} />
        {item && (
          <div class="card preview-card">
            {(slot === 'trap' || slot === 'base')
              ? <TrapOnBase trap={setup.trap} base={setup.base} class="big" />
              : <ItemThumb item={item} class="thumb xl" />}
            <p class="small muted">{previewing === current ? 'Your current setup.' : `Your setup with ${item.name} in place of your ${slot}.`}</p>
          </div>
        )}
        <h2 class="list-head">Your {noun} ({owned.length})</h2>
        <div class="item-list">
          {owned.map((i) => (
            <button class={`item-row ${previewing === i.id ? 'on' : ''}`} onClick={() => pick(i.id)}>
              <ItemThumb item={i} />
              <span class="item-main">
                <b>{i.name}</b>{i.kind === 'trap' && <span class="type-chip"><TypeMedal type={i.type} size={20} />{TYPE_NAME[i.type]}</span>}
                <br /><small>{itemStats(i, exact)}{(i.kind === 'bait' || i.kind === 'charm') && ` · ×${num(count(player, i.id))}`}</small>
              </span>
              {current === i.id ? <span class="pill green">Equipped</span> : previewing === i.id ? <span class="pill gold">Previewing</span> : null}
            </button>
          ))}
          {owned.length === 0 && <p class="muted">You don't own any {noun} yet.</p>}
        </div>
        {forSale.length > 0 && <h2 class="list-head">In the Elf Emporium</h2>}
        <div class="item-list">
          {forSale.map((i) => {
            const locked = 'rank' in i && i.rank > player.rank;
            return (
              <button class={`item-row ${previewing === i.id ? 'on' : ''} ${locked ? 'locked' : ''}`} onClick={() => pick(i.id)}>
                <ItemThumb item={i} />
                <span class="item-main"><b>{i.name}</b><br /><small>{itemStats(i, exact)}</small></span>
                <span class="price">{locked ? `Rank ${(i as { rank: number }).rank}` : `${num(priceOf(i)!)} gold`}</span>
              </button>
            );
          })}
        </div>
      </div>
      {item && (
        <div class="dock">
          <Compare setup={setup} />
          <div class="dock-buttons">
            <button class="outline-btn dark" onClick={() => go(`item/${item.id}`)}>Details</button>
            {ownsPreview
              ? <button class="primary-btn" disabled={current === item.id} onClick={() => act('/api/setup', { slot, item: item.id }, `Equipped ${item.name}.`)}>{current === item.id ? 'Equipped' : `Equip ${item.name}`}</button>
              : 'rank' in item && item.rank > player.rank
                ? <button class="primary-btn" disabled>Unlocks at {content.ranks[item.rank - 1]?.name}</button>
                : <button class="primary-btn" onClick={() => go(`emporium/${slot === 'bait' ? 'bait' : `${slot}s`}`)}>Buy in the Emporium</button>}
          </div>
        </div>
      )}
      {slot === 'charm' && current && (
        <div class="pad"><button class="text-btn wide" onClick={() => act('/api/setup', { slot: 'charm', item: null }, 'Charm taken off.')}>Take off charm</button></div>
      )}
    </FullScreen>
  );
}

export function ItemScreen({ id }: { id: string }) {
  const { content, data, player, act } = useGame();
  const exact = useExactOdds();
  const item = data.items.get(id);
  if (!item) return <FullScreen><BackRow to="hunt" title="Not found" /></FullScreen>;
  const own = count(player, id);
  const price = priceOf(item);
  const recipe = content.recipes.find((r) => r.output.item === id);
  const usedIn = content.recipes.filter((r) => id in r.ingredients);
  const slot = item.kind === 'material' ? null : item.kind;
  const equipped = slot ? player.setup[slot] === id : false;
  const kindName = { trap: 'Trap', base: 'Base', bait: 'Bait', charm: 'Charm', material: 'Material' }[item.kind];
  const where = price !== null ? `from the Elf Emporium, ${num(price)} gold` : recipe ? "crafted in Santa's Workshop" : item.kind === 'material' ? 'dropped by hexed elves' : 'starter gear from Santa';
  const big = (label: string, value: string) => <div><b>{value}</b><span>{label}</span></div>;

  return (
    <FullScreen class="detail">
      <BackRow to={slot ? `arsenal/${slot}` : 'workshop'} title={item.name} sub={`${kindName}${item.kind === 'trap' ? ` · ${TYPE_NAME[item.type]}` : ''}`} />
      <div class="hero-art">
        {item.kind === 'trap' ? <TrapOnBase trap={id} base={player.setup.base} class="hero" />
          : item.kind === 'base' ? <TrapOnBase trap={player.setup.trap} base={id} class="hero" />
          : <ItemThumb item={item} class="thumb hero-thumb" />}
      </div>
      <div class="pad stack">
        <p class="muted">You own {num(own)} · {where}</p>
        <div class="stat-row light">
          {(item.kind === 'trap' || item.kind === 'base') && <>{big('Power', num(item.power))}{big('Luck', String(item.luck))}{exact && big('Attraction', `+${pct(item.attraction ?? 0)}`)}</>}
          {item.kind === 'bait' && <>{exact && big('Attraction', pct(item.attraction))}{big('Rare elves', `×${item.rareMultiplier ?? 1}`)}{big('Rank', String(item.rank))}</>}
          {item.kind === 'charm' && <>{big('Luck', `+${item.luck ?? 0}`)}{big('Power', item.powerBonus ? `+${pct(item.powerBonus)}` : `+${item.power ?? 0}`)}{exact && big('Attraction', `+${pct(item.attraction ?? 0)}`)}</>}
          {item.kind === 'material' && <>{big('Sells for', `${num(sellValue(data, item))}`)}{big('Used in', String(usedIn.length))}</>}
        </div>
        {item.kind === 'base' && item.goodFor && <p class="small"><strong>Good for:</strong> {item.goodFor}{item.affinity && ` (+${pct(item.affinity.powerBonus)} power with ${item.affinity.types.map((t) => TYPE_NAME[t]).join(' or ')} traps)`}</p>}
        {item.flavour && (
          <div class="flavour">
            <p class="tagline">{item.flavour.tagline}</p>
            <p>{item.flavour.description}</p>
            <p class="backstory">{item.flavour.backstory}</p>
          </div>
        )}
        {usedIn.length > 0 && <p class="small">Used in Santa's Workshop for {usedIn.map((r) => data.items.get(r.output.item)?.name).join(', ')}.</p>}
      </div>
      {slot && (
        <div class="dock">
          <div class="dock-buttons">
            <button class="outline-btn dark" onClick={() => go(`arsenal/${slot}/${id}`)}>Compare</button>
            {own > 0
              ? <button class="primary-btn" disabled={equipped} onClick={() => act('/api/setup', { slot, item: id }, `Equipped ${item.name}.`)}>{equipped ? 'Equipped' : 'Equip'}</button>
              : price !== null
                ? <button class="primary-btn" onClick={() => go(`emporium/${slot === 'bait' ? 'bait' : `${slot}s`}`)}>Buy in the Emporium</button>
                : <button class="primary-btn" onClick={() => go('workshop')}>Open the Workshop</button>}
          </div>
        </div>
      )}
    </FullScreen>
  );
}
