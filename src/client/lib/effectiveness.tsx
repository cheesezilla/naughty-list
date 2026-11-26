import { useGame } from '../game.js';
import { pct } from './format.js';
import { usePrefs } from './prefs.js';

/** Five tiers that hide the exact attraction and catch rates from players. Lower bound of each tier (rate 0 to 1). */
export const TIERS = [
  { name: 'Very weak', min: 0 },
  { name: 'Weak', min: 0.2 },
  { name: 'Medium', min: 0.4 },
  { name: 'Strong', min: 0.6 },
  { name: 'Very strong', min: 0.8 },
] as const;

/** 0 (very weak) to 4 (very strong). */
export const tierOf = (rate: number) => TIERS.reduce((t, x, i) => (rate + 1e-9 >= x.min ? i : t), 0);

/** True when the logged-in admin has switched on exact percentages (More > Admin). Players never see them. */
export function useExactOdds() {
  const { user } = useGame();
  return user.isAdmin && usePrefs().exactOdds;
}

/** Text for a rate: the tier name, or the exact percentage when the admin toggle is on. */
export function useRateText() {
  const exact = useExactOdds();
  return (rate: number) => (exact ? pct(rate) : TIERS[tierOf(rate)]!.name);
}

/** A five-segment power bar with the tier name (and the exact percentage for admins who turned it on). */
export function PowerBar({ rate }: { rate: number }) {
  const exact = useExactOdds();
  const t = tierOf(rate);
  return (
    <>
      <b class="power-label">{TIERS[t]!.name}{exact && ` ${pct(rate)}`}</b>
      <span class={`power-bar t${t}`} role="img" aria-label={TIERS[t]!.name}>
        {TIERS.map((_, i) => <i class={i <= t ? 'on' : ''} />)}
      </span>
    </>
  );
}
