import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { Content } from '../content/schema.js';
import type { GameData, JournalRow, PlayerState } from '../engine/index.js';
import type { User } from './api.js';

export interface Game {
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
  resetLog: () => void;
  logout: () => void;
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
