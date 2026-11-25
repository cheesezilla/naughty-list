# Working on The Naughty List

- `docs/PLAN.md` is the living design doc. Every PR that changes game rules, content numbers, features, architecture or deployment must update it in the same PR: the implementation status table, any changed tables or formulas, the latest simulator results when balance changes, and a changelog row.
- Game numbers live in `content/*.json`. After changing them run `npm run check-content`, `npm test` and `npm run simulate`, and copy the new numbers into `docs/PLAN.md`.
- Keep the game original: no names, art, text or data tables from existing games.
