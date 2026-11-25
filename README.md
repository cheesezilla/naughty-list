# The Naughty List

A Christmas imp-trapping browser game. Scrinch's imps are raiding Santa's secret lair; you arm a trap, pick a bait and hunt them, back to back, with no wait timer. Bait cost paces progress instead.

Design plan: https://claude.ai/artifact/VRKBh16CBkcZuN8FiqeWn9

## Status

- Milestones 1 and 2 are in: project skeleton, Docker image, hunt engine, v1 content (4 locations, 24 imps) and the balance simulator.
- The web page is a **prototype** that runs the engine in the browser and saves to localStorage. Accounts, server-side hunts, invites and the leaderboard come in milestone 3.

## Run it

```sh
npm install
npm run dev            # server on :8080 and the Vite dev page on :5173
npm test               # engine and server tests
npm run simulate       # balance report (add -- --players 1000 --strict)
npm run check-content  # validate content/*.json
npm run build && npm start   # production build on :8080
```

## Tuning the game

All numbers live in `content/`:

| File | What's in it |
| --- | --- |
| `constants.json` | Starting gold and gear, caps, sell-back rate, free-cookie rescue, the stamina switch |
| `ranks.json` | Rank names and points needed |
| `locations.json` | Locations, unlock costs and their imps (power, gold, points, weights, type matchups, loot) |
| `items.json` | Traps, bases, baits, charms and materials |
| `recipes.json` | Elf Forge crafting recipes |

Edit, then run `npm run check-content` and `npm run simulate` to see the effect. The stamina meter (`constants.json` > `stamina.enabled`) is built but switched off.

## Formulas

- Power = (trap + base + charm power) x (1 + charm power bonus); luck adds up.
- Attraction = min(95%, bait attraction x (1 + attraction bonuses)), halved in the Reindeer Stables without Hot Cocoa.
- Imp pick: weighted by each imp's weight; Fruitcake doubles rare, mini boss and boss weights.
- Catch = clamp((P x E + L^2) / (P x E + M), 0, 98%), where E is 0 / 0.5 / 1 / 1.5 by trap type and M is the imp's power. Luck only counts when E > 0.

## Deploy on the UGREEN NAS

Pushing to `main` builds `ghcr.io/cheesezilla/naughty-list:latest` (see `.github/workflows/docker.yml`). On the NAS, open the Docker app, create a project and paste `compose.yaml`. The game is then at `http://<nas-address>:8080`.

The package is private by default: either make it public under the repository's Packages settings, or log the NAS in to ghcr.io with a read-only token.

## Layout

```
content/          game data (JSON)
src/engine/       pure game rules: odds, hunts, shop, crafting, travel (shared by server, client, simulator)
src/content/      content schema and loader
src/server/       Fastify server: API + built client
src/client/       Preact web client
scripts/          simulator, content check, server build
test/             Vitest tests
```
