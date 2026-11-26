import { useEffect } from 'preact/hooks';
import type { PowerType } from '../../content/schema.js';
import { useGame } from '../game.js';
import { Art } from '../lib/art.js';
import { num, TIER_NAME, TYPE_NAME } from '../lib/format.js';
import { TypeMedal } from '../lib/medal.js';
import { listProgress } from '../lib/progress.js';
import { go } from '../lib/route.js';
import { useCloseKeys } from './achievements.js';

export interface NewCatch { imp: string; points: number }

/** "New elf on your Naughty List": shown the first time a given elf is caught. */
export function NewCatchPopup({ found, onClose }: { found: NewCatch; onClose: () => void }) {
  const { content, data, player } = useGame();
  const imp = data.imps.get(found.imp);
  useCloseKeys(onClose);
  if (!imp) return null;
  const location = data.locations.get(imp.location)!;
  const { here, all } = listProgress(content, player.catches, imp.location);
  const weak = Object.entries(imp.effectiveness ?? {}).filter(([, e]) => e > 1).map(([t]) => t as PowerType);
  return (
    <div class="popup-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div class={`popup newcatch tier-${imp.tier}`} role="dialog" aria-modal="true" aria-label={`New catch: ${imp.name}`}>
        <div class="nc-ribbon">✦ New elf on your Naughty List ✦</div>
        <div class="nc-frame"><Art slot="imps" id={imp.id} alt={imp.name} class="nc-portrait" /></div>
        <span class="pill green nc-unlocked">Portrait unlocked</span>
        <h2>{imp.name}</h2>
        <div class="nc-meta"><span class="nc-tier">{TIER_NAME[imp.tier]}</span> · {location.name}</div>
        {imp.flavour?.tagline && <p class="nc-tagline">{imp.flavour.tagline}</p>}
        <div class="nc-tiles">
          <div><b>{num(imp.power)}</b><span>Power</span></div>
          <div class="nc-weak"><b>{weak.length ? weak.map((t) => <TypeMedal type={t} size={24} />) : 'None'}</b><span>{weak.length ? `Weak to ${weak.map((t) => TYPE_NAME[t]).join(', ')}` : 'No weakness'}</span></div>
          <div><b>+{num(found.points)}</b><span>Points</span></div>
        </div>
        <div class="nc-progress">
          <div><span>{location.name}</span><b>{here.caught} / {here.total}</b></div>
          <div class="bar"><div style={{ width: `${here.total ? (here.caught / here.total) * 100 : 0}%` }} /></div>
          <div class="nc-all"><span>Naughty List overall</span><b>{all.caught} / {all.total}</b></div>
        </div>
        <div class="popup-buttons">
          <button class="outline-btn dark" onClick={() => { onClose(); go(`imp/${imp.id}`); }}>Open file</button>
          <button class="primary-btn" onClick={onClose}>Keep hunting</button>
        </div>
      </div>
    </div>
  );
}

/** The quiet version (achievement popups off): a small toast at the top. */
export function NewCatchToast({ found, onClose }: { found: NewCatch; onClose: () => void }) {
  const { data } = useGame();
  const imp = data.imps.get(found.imp);
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [found]);
  if (!imp) return null;
  return (
    <button class="ach-toast" onClick={() => { onClose(); go(`imp/${imp.id}`); }}>
      <Art slot="imps" id={imp.id} alt="" class="nc-toast-art" />
      <span><small class="kicker">New elf on your Naughty List</small><b>{imp.name}</b><small>{TIER_NAME[imp.tier]} · tap to open file</small></span>
    </button>
  );
}
