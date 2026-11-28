import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { Content } from '../content/schema.js';
import type { GameData, JournalRow, PlayerState } from '../engine/index.js';
import type { User } from './api.js';

/** Gold flow since the page was opened (or since the player reset it): the "gold this session" card. */
export interface SessionStats { hunts: number; earned: number; spent: number; since: number }
export const emptySession = (): SessionStats => ({ hunts: 0, earned: 0, spent: 0, since: Date.now() });

/** Net gold of one hunt: catch gold minus bait, sleigh upkeep and anything pillaged. */
export function huntNet(e: { gold: number; baitCost?: number; upkeep?: number; pillage?: { gold: number } }): number {
  return e.gold - (e.baitCost ?? 0) - (e.upkeep ?? 0) - (e.pillage?.gold ?? 0);
}

export interface Game {
  /** Gold earned and spent since the page opened. */
  session: SessionStats;
  resetSession: () => void;
  content: Content;
  data: GameData;
  user: User;
  player: PlayerState;
  /** The hunt log on the Hunt screen: the last 50 hunts and the events between them, newest first. */
  log: JournalRow[];
  /** POSTs a game action; updates the player and the log. Returns false (and shows the error) when it fails. */
  act: (path: string, body: object, ok?: string) => Promise<boolean>;
  toast: (message: string, kind?: 'info' | 'good' | 'bad') => void;
  hunt: () => Promise<void>;
  busy: boolean;
  setPlayer: (p: PlayerState) => void;
  resetLog: (rows?: JournalRow[]) => void;
  logout: () => void;
  /** Shows the earn popup (or toast) for these achievement ids. */
  celebrate: (ids: string[], backfill?: boolean) => void;
}

export const GameContext = createContext<Game | null>(null);
export const useGame = () => useContext(GameContext)!;

/** Keeps the newest rows up to and including the `hunts`-th newest hunt. */
export function trimLog(rows: JournalRow[], hunts = 50): JournalRow[] {
  let seen = 0;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i]!.kind === 'hunt' && ++seen === hunts) return rows.slice(0, i + 1);
  }
  return rows;
}
