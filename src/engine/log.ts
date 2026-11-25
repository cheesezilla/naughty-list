import type { JournalEntry } from './hunt.js';

/** Something the player did between hunts, shown in the hunt log. */
export type GameEvent =
  | { type: 'buy' | 'sell'; item: string; amount: number; gold: number }
  | { type: 'equip'; slot: 'trap' | 'base' | 'bait' | 'charm'; item: string | null; previous: string | null }
  | { type: 'craft'; recipe: string; item: string; amount: number; gold: number }
  | { type: 'travel'; location: string; unlockCost: number }
  /** The intro letter (content/story.json), logged when a game starts: sign-up and Start over. */
  | { type: 'intro' };
export type LogKind = 'hunt' | 'event';
/** One hunt-log row. Hunts carry a JournalEntry; events carry a GameEvent and the hunt number they follow. */
export type JournalRow =
  | { id: number; n: number; at: number; kind: 'hunt'; entry: JournalEntry }
  | { id: number; n: number; at: number; kind: 'event'; entry: GameEvent };
