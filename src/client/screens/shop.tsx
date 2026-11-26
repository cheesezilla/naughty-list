import { useState } from 'preact/hooks';
import { count, priceOf, sellValue, type AnyItem } from '../../engine/index.js';
import { useGame } from '../game.js';
import { Art } from '../lib/art.js';
import { num, TYPE_NAME } from '../lib/format.js';
import { go } from '../lib/route.js';
import { MainScreen, Stepper, Tabs } from '../ui.js';
import { ItemThumb, itemStats } from './gear.js';

type ShopTab = 'traps' | 'bases' | 'bait' | 'charms' | 'sell';
const SHOP_TABS: { id: ShopTab; label: string }[] = [
  { id: 'traps', label: 'Traps' }, { id: 'bases', label: 'Bases' }, { id: 'bait', label: 'Bait' }, { id: 'charms', label: 'Charms' }, { id: 'sell', label: 'Sell' },
];
const KIND: Record<Exclude<ShopTab, 'sell'>, AnyItem['kind']> = { traps: 'trap', bases: 'base', bait: 'bait', charms: 'charm' };

function BuyCard({ item }: { item: AnyItem }) {
  const { content, player, act } = useGame();
  const price = priceOf(item)!;
  // Start at a full pack, or as many as the player can afford.
  const [qty, setQty] = useState(() => Math.max(1, Math.min(item.kind === 'bait' ? 100 : 10, Math.floor(player.gold / price))));
  const own = count(player, item.id);
  const rank = 'rank' in item ? item.rank : 1;
  const locked = rank > player.rank;
  const stackable = item.kind === 'bait' || item.kind === 'charm';
  const total = price * qty;
  return (
    <div class={`card shop-card ${locked ? 'locked' : ''}`}>
      <button class="shop-thumb" onClick={() => go(`item/${item.id}`)} aria-label={`${item.name} details`}><ItemThumb item={item} /></button>
      <div class="shop-main">
        <div class="row-head">
          <b>{item.name}</b>
          {item.kind === 'trap' && <span class="type-chip"><Art slot="trap_types" id={item.type} class="type-icon" />{TYPE_NAME[item.type]}</span>}
        </div>
        <small>{itemStats(item)}</small>
        <span class="price-line"><b>{num(price)} gold</b>{stackable ? ' each' : ''} · you own {num(own)}</span>
        {item.flavour && <p class="small desc">{item.flavour.description}</p>}
        {locked ? <p class="small locked-note">Unlocks at {content.ranks[rank - 1]?.name} (rank {rank})</p>
          : stackable ? (
            <div class="buy-row">
              <Stepper value={qty} onChange={setQty} step={item.kind === 'bait' ? 10 : 5} />
              <button class="primary-btn" disabled={player.gold < total} onClick={() => act('/api/buy', { item: item.id, amount: qty }, `Bought ${num(qty)} ${item.name}.`)}>Buy for {num(total)}</button>
            </div>
          ) : own > 0 ? <span class="pill green">Owned</span>
          : <button class="primary-btn" disabled={player.gold < price} onClick={() => act('/api/buy', { item: item.id, amount: 1 }, `Bought ${item.name}. Equip it from the Arsenal.`)}>Buy</button>}
      </div>
    </div>
  );
}

function SellCard({ item }: { item: AnyItem }) {
  const { data, player, act } = useGame();
  const own = count(player, item.id);
  const equipped = Object.values(player.setup).includes(item.id);
  const max = equipped && (item.kind === 'trap' || item.kind === 'base') ? 0 : own;
  const [qty, setQty] = useState(1);
  const each = sellValue(data, item);
  const n = Math.min(qty, max);
  return (
    <div class="card shop-card">
      <ItemThumb item={item} />
      <div class="shop-main">
        <div class="row-head"><b>{item.name}</b></div>
        <span class="price-line"><b>{num(each)} gold</b> each · you own {num(own)}{equipped ? ' · equipped' : ''}</span>
        {max === 0 ? <p class="small muted">Unequip it before selling.</p> : (
          <div class="buy-row">
            <Stepper value={n} onChange={setQty} max={max} step={5} />
            <button class="outline-btn dark" onClick={() => act('/api/sell', { item: item.id, amount: n }, `Sold ${num(n)} ${item.name} for ${num(n * each)} gold.`)}>Sell for {num(n * each)}</button>
          </div>
        )}
      </div>
    </div>
  );
}

export function EmporiumScreen({ tab }: { tab: ShopTab }) {
  const { data, player } = useGame();
  const items = [...data.items.values()];
  const list = tab === 'sell' ? [] : items.filter((i) => i.kind === KIND[tab]);
  const forSale = list.filter((i) => priceOf(i) !== null);
  const craftedOnly = list.filter((i) => priceOf(i) === null && i.id !== 'starlit_stocking' && i.id !== 'cardboard_box');
  const sellable = items.filter((i) => count(player, i.id) > 0 && sellValue(data, i) > 0)
    .sort((a, b) => (a.kind === 'material' ? 0 : 1) - (b.kind === 'material' ? 0 : 1));
  return (
    <MainScreen tab="emporium">
      <div class="pad stack">
        <div>
          <h1 class="screen-title">Elf Emporium</h1>
          <p class="sub">You have {num(player.gold)} gold</p>
        </div>
        <Tabs label="Shelf" tabs={SHOP_TABS} value={tab} onChange={(t) => go(`emporium/${t}`, true)} />
        {tab !== 'sell' && forSale.map((i) => <BuyCard key={i.id} item={i} />)}
        {tab !== 'sell' && craftedOnly.length > 0 && (
          <p class="note">{craftedOnly.map((i) => i.name).join(' and ')} {craftedOnly.length === 1 ? "isn't" : "aren't"} sold in the Emporium. Craft {craftedOnly.length === 1 ? 'it' : 'them'} in <button class="link" onClick={() => go('workshop')}>Santa's Workshop</button>.</p>
        )}
        {tab === 'sell' && (
          <>
            <p class="note">The Emporium buys gear, bait and charms back at 40% of the price, and pays a fixed price for materials.</p>
            {sellable.map((i) => <SellCard key={i.id} item={i} />)}
            {sellable.length === 0 && <p class="muted center-pad">Nothing to sell yet.</p>}
          </>
        )}
      </div>
    </MainScreen>
  );
}

type CraftFilter = 'all' | 'trap' | 'base' | 'bait' | 'charm';
export function WorkshopScreen() {
  const { content, data, player, act } = useGame();
  const [filter, setFilter] = useState<CraftFilter>('all');
  const [onlyNow, setOnlyNow] = useState(false);
  const canCraft = (r: (typeof content.recipes)[number]) =>
    r.rank <= player.rank && player.gold >= r.gold && Object.entries(r.ingredients).every(([id, n]) => count(player, id) >= n);
  const kindOf = (r: (typeof content.recipes)[number]) => data.items.get(r.output.item)!.kind;
  const counts = (k: CraftFilter) => content.recipes.filter((r) => k === 'all' || kindOf(r) === k).length;
  const shown = content.recipes.filter((r) => (filter === 'all' || kindOf(r) === filter) && (!onlyNow || canCraft(r)));
  const tabs: { id: CraftFilter; label: string }[] = [
    { id: 'all', label: `All ${counts('all')}` }, { id: 'trap', label: `Traps ${counts('trap')}` }, { id: 'base', label: `Bases ${counts('base')}` },
    { id: 'bait', label: `Bait ${counts('bait')}` }, { id: 'charm', label: `Charms ${counts('charm')}` },
  ];
  return (
    <MainScreen tab="workshop">
      <div class="pad stack">
        <div>
          <h1 class="screen-title">Santa's Workshop</h1>
          <p class="sub">Elves turn loot into gear</p>
        </div>
        <Tabs label="Type" tabs={tabs} value={filter} onChange={setFilter} />
        <label class="check"><input type="checkbox" checked={onlyNow} onChange={(e) => setOnlyNow((e.target as HTMLInputElement).checked)} /> Only show what I can craft now</label>
        {shown.map((r) => {
          const out = data.items.get(r.output.item)!;
          const rankName = content.ranks[r.rank - 1]?.name ?? `rank ${r.rank}`;
          const missing = Object.entries(r.ingredients).filter(([id, n]) => count(player, id) < n);
          const ownsGear = (out.kind === 'trap' || out.kind === 'base') && count(player, out.id) > 0;
          const reason = r.rank > player.rank ? `Reach ${rankName} to craft`
            : ownsGear ? 'You already own one'
            : missing.length ? 'Missing ingredients'
            : player.gold < r.gold ? `Needs ${num(r.gold)} gold` : null;
          const kindName = { trap: 'Trap', base: 'Base', bait: 'Bait', charm: 'Charm', material: 'Material' }[out.kind];
          return (
            <div class={`card recipe ${r.rank > player.rank ? 'locked' : ''}`}>
              <div class="recipe-head">
                <button class="shop-thumb" onClick={() => go(`item/${out.id}`)} aria-label={`${out.name} details`}><ItemThumb item={out} /></button>
                <div>
                  <b>{out.name}</b> <span class="muted">×{r.output.amount}</span><br />
                  <small>{kindName} · you own {num(count(player, out.id))}</small><br />
                  <small>Rank: {rankName}</small>
                </div>
              </div>
              <div class="ingredients">
                {Object.entries(r.ingredients).map(([id, n]) => {
                  const have = count(player, id);
                  const it = data.items.get(id)!;
                  return (
                    <button class={`ingredient ${have >= n ? 'ok' : 'short'}`} onClick={() => go(`item/${id}`)}>
                      <ItemThumb item={it} class="thumb small" />
                      <span>{it.name}</span>
                      <b>{num(have)} / {n}</b>
                    </button>
                  );
                })}
                <div class={`ingredient ${player.gold >= r.gold ? 'ok' : 'short'}`}>
                  <span class="thumb small gold-coin" aria-hidden="true" />
                  <span>Gold</span>
                  <b>{num(r.gold)}</b>
                </div>
              </div>
              <button class="primary-btn wide" disabled={!!reason} onClick={() => act('/api/craft', { recipe: r.id }, `Crafted ${r.output.amount > 1 ? `${r.output.amount} ` : ''}${out.name}.`)}>
                {reason ?? `Craft ×${r.output.amount}`}
              </button>
            </div>
          );
        })}
        {shown.length === 0 && <p class="muted center-pad">Nothing you can craft right now. Bosses and rare imps drop the materials.</p>}
      </div>
    </MainScreen>
  );
}
