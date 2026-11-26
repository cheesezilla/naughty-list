import { useState } from 'preact/hooks';
import type { Content, Imp } from '../../content/schema.js';
import { api } from '../api.js';
import { useGame } from '../game.js';
import { Art } from '../lib/art.js';
import { num, pct, TIER_NAME, TYPE_NAME, when } from '../lib/format.js';
import { usePrefs } from '../lib/prefs.js';
import { go } from '../lib/route.js';
import { BackRow, FullScreen, MainScreen, Tabs, useAsync } from '../ui.js';

export function NaughtyListScreen() {
  const { content, player } = useGame();
  const [loc, setLoc] = useState(player.location);
  const total = content.locations.reduce((n, l) => n + l.imps.length, 0);
  const caught = Object.keys(player.catches).length;
  const location = content.locations.find((l) => l.id === loc)!;
  const seen = player.seen ?? {};
  return (
    <MainScreen tab="list">
      <div class="pad stack">
        <div>
          <h1 class="screen-title">Naughty List</h1>
          <p class="sub">{caught} of {total} portraits unlocked. Catch an imp once to reveal it.</p>
        </div>
        <Tabs
          label="Location"
          value={loc}
          onChange={setLoc}
          tabs={content.locations.map((l) => ({ id: l.id, label: <>{l.name} <small>{l.imps.filter((i) => player.catches[i.id]).length}/{l.imps.length}</small></> }))}
        />
        <div class="portrait-grid">
          {location.imps.map((imp) => {
            const n = player.catches[imp.id] ?? 0;
            const s = seen[imp.id] ?? 0;
            return (
              <button class={`portrait-card ${n ? '' : 'locked'}`} onClick={() => go(`imp/${imp.id}`)}>
                <Art slot="imps" id={n ? imp.id : '_locked'} alt={n ? imp.name : 'Not caught yet'} class="portrait" />
                <b>{n ? imp.name : '???'}</b>
                <small>{TIER_NAME[imp.tier]} · {n ? `caught ${num(n)}` : s ? `seen ${s === 1 ? 'once' : `${num(s)} times`}, never caught` : 'not seen yet'}</small>
              </button>
            );
          })}
        </div>
      </div>
    </MainScreen>
  );
}

export function ImpScreen({ id }: { id: string }) {
  const { content, data, player } = useGame();
  const prefs = usePrefs();
  const imp = data.imps.get(id);
  const stats = useAsync(() => api<{ firstCatches: Record<string, number> }>('GET', '/api/stats'), [id]);
  if (!imp) return <FullScreen><BackRow to="list" title="Not found" /></FullScreen>;
  const location = data.locations.get(imp.location)!;
  const caught = player.catches[id] ?? 0;
  const seen = player.seen?.[id] ?? 0;
  const known = caught > 0;
  const big = (label: string, value: string) => <div><b>{value}</b><span>{label}</span></div>;
  const eff = Object.entries(imp.effectiveness ?? {});
  const weak = eff.filter(([, e]) => e > 1).map(([t, e]) => `${TYPE_NAME[t]} traps (×${e})`);
  const resists = eff.filter(([, e]) => e < 1).map(([t, e]) => `${TYPE_NAME[t]} traps (${e === 0 ? 'immune' : `×${e}`})`);
  const first = stats.data?.firstCatches[id];

  return (
    <FullScreen class="detail">
      <BackRow to="list" title={known || seen ? imp.name : '???'} sub={`${TIER_NAME[imp.tier]} · ${location.name}`} />
      <div class={`hero-art imp-hero tier-${imp.tier}`}>
        <Art slot="imps" id={known ? id : '_locked'} alt={known ? imp.name : 'Not caught yet'} class="hero-portrait" />
      </div>
      <div class="pad stack">
        <div class="stat-row light">
          {big('Power', known ? num(imp.power) : '???')}
          {big('Gold', known ? num(imp.gold) : '???')}
          {known ? big('Points', num(imp.points)) : big('Seen', num(seen))}
          {big('Caught', num(caught))}
        </div>
        {known ? (
          <>
            <p class="small">
              {weak.length > 0 && <>Weak to {weak.join(', ')}. </>}
              {resists.length > 0 && <>Resists {resists.join(', ')}. </>}
              {imp.loot?.length ? <>Drops {imp.loot.map((l) => `${data.items.get(l.item)?.name} (${pct(l.chance)})`).join(', ')}. </> : null}
              {pillageRisk(imp, content)}. 
              {first && <>First caught {when(first, prefs.clock24)}.</>}
            </p>
            {imp.flavour && (
              <div class="flavour">
                <p class="tagline">{imp.flavour.tagline}</p>
                <p>{imp.flavour.description}</p>
                <p class="backstory">{imp.flavour.backstory}</p>
              </div>
            )}
          </>
        ) : (
          <>
            {imp.flavour && <div class="flavour"><p class="label">Rumour</p><p class="tagline">{imp.flavour.rumour}</p></div>}
            <div class="sealed">
              <b>File sealed</b>
              <p>Catch this imp once to unlock its portrait, description and backstory.</p>
            </div>
            {!player.unlocked.includes(location.id) && <p class="small muted">Found in the {location.name}, which opens at {content.ranks[location.rank - 1]?.name}.</p>}
          </>
        )}
      </div>
    </FullScreen>
  );
}

/** "Pillage risk: Often (35% of escapes)" for the imp file. */
function pillageRisk(imp: Imp, content: Content): string {
  if (imp.pillage?.chance === 1 && imp.pillage.takes.length === 1 && imp.pillage.takes[0] === 'bait') return 'Pillage risk: always steals a bait when it escapes';
  const chance = (imp.pillage ?? content.constants.pillage.tiers[imp.tier]).chance;
  const word = chance >= 0.5 ? 'Very often' : chance >= 0.2 ? 'Often' : chance >= 0.06 ? 'Sometimes' : 'Rarely';
  return `Pillage risk: ${word} (${pct(chance)} of escapes)`;
}
