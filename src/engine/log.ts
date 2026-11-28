import type { JournalEntry } from './hunt.js';

/** Something the player did between hunts, shown in the hunt log. */
export type GameEvent =
  | { type: 'buy' | 'sell'; item: string; amount: number; gold: number }
  | { type: 'equip'; slot: 'trap' | 'base' | 'bait' | 'charm'; item: string | null; previous: string | null }
  | { type: 'craft'; recipe: string; item: string; amount: number; gold: number }
  | { type: 'travel'; location: string; unlockCost: number; cheerReset?: { pips: number; boons: number } }
  /** First arrival in a location: its intro from content/story.json. */
  | { type: 'arrival'; location: string }
  /** A player action on a location's loop. */
  | { type: 'objective'; location: string; action: 'start_run' | 'rush_order' }
  /** Achievements earned by the hunt or action just before it. `backfill` marks badges awarded to a save from before achievements. */
  | { type: 'achievement'; ids: string[]; backfill?: boolean; /** Free items the badges gave (item id → amount). */ rewards?: Record<string, number> }
  /** The intro letter (content/story.json), logged when a game starts: sign-up and Start over. */
  | { type: 'intro' }
  /** A Cheer boon picked from the draw. */
  | { type: 'cheer_pick'; boon: string }
  /** An answer to a boon card (`text` says what was taken). */
  | { type: 'event_answer'; id: string; name: string; text: string };
export type LogKind = 'hunt' | 'event';
/** One hunt-log row. Hunts carry a JournalEntry; events carry a GameEvent and the hunt number they follow. */
export type JournalRow =
  | { id: number; n: number; at: number; kind: 'hunt'; entry: JournalEntry }
  | { id: number; n: number; at: number; kind: 'event'; entry: GameEvent };
