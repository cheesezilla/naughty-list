import { useEffect, useState } from 'preact/hooks';

/** Settings kept on this device only (localStorage), per browser. */
export interface Prefs {
  sound: boolean;
  vibrate: boolean;
  confirmRareBait: boolean;
  clock24: boolean;
  spaceHunts: boolean;
  /** Show a full popup for a first catch, or only a small toast. */
  newCatchPopups: boolean;
  /** Admins only: show exact attraction and catch percentages next to the tier bars. */
  exactOdds: boolean;
}
const DEFAULTS: Prefs = { sound: false, vibrate: true, confirmRareBait: true, clock24: false, spaceHunts: true, newCatchPopups: true, exactOdds: false };
const KEY = 'nl_prefs';
const listeners = new Set<(p: Prefs) => void>();

function read(): Prefs {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Prefs>) };
  } catch {
    return { ...DEFAULTS };
  }
}
let current = read();

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
  current = { ...current, [key]: value };
  try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* private mode: keep for this visit */ }
  for (const l of listeners) l(current);
}

export function usePrefs(): Prefs {
  const [p, setP] = useState(current);
  useEffect(() => {
    listeners.add(setP);
    return () => { listeners.delete(setP); };
  }, []);
  return p;
}

export const getPrefs = () => current;

let audio: AudioContext | undefined;
/** A short synthesised jingle: no sound files needed. */
export function playSound(kind: 'catch' | 'escape' | 'boss' | 'rank' | 'badge') {
  if (!current.sound) return;
  try {
    audio ??= new AudioContext();
    const notes = { catch: [784, 1047], escape: [330, 262], boss: [523, 659, 784, 1047], rank: [659, 784, 988, 1319], badge: [988, 1319, 1568] }[kind];
    notes.forEach((f, i) => {
      const o = audio!.createOscillator();
      const g = audio!.createGain();
      const t = audio!.currentTime + i * 0.09;
      o.type = 'triangle';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      o.connect(g).connect(audio!.destination);
      o.start(t);
      o.stop(t + 0.26);
    });
  } catch { /* no audio on this device */ }
}

export function buzz(ms = 40) {
  if (current.vibrate && 'vibrate' in navigator) navigator.vibrate(ms);
}
