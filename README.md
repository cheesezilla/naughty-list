# The Naughty List

A Christmas imp-trapping browser game. Scrinch's imps are raiding Santa's secret lair; you arm a trap, pick a bait and hunt them, back to back, with no wait timer. Bait cost paces progress instead.

Design plan: [docs/PLAN.md](docs/PLAN.md) (updated with every PR)

## Status

- Milestones 1 to 3 are in: hunt engine, v1 content (4 locations, 24 imps), balance simulator, invite-only accounts, server-side hunts and SQLite saves.
- Deploys to a UGREEN NAS with Docker; see [docs/DEPLOY.md](docs/DEPLOY.md).
- Next: leaderboard and catch feed.

## Run it

Needs Node.js 22 or newer.

```sh
git clone https://github.com/cheesezilla/naughty-list
cd naughty-list
npm install
npm run play           # build and serve on http://localhost:8080
```

The first account you create is the admin; use the Admin tab to make invite codes for friends. Saves live in `./data/naughty-list.db`. Any player can wipe their own progress with **Start over** at the bottom of the page.

Other commands:

```sh
npm run dev            # server on :8080 and the hot-reloading page on :5173
npm test               # engine and server tests
npm run simulate       # balance report (add -- --players 1000 --strict)
npm run check-content  # validate content/*.json
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

Follow [docs/DEPLOY.md](docs/DEPLOY.md). Pushing to `main` builds `ghcr.io/cheesezilla/naughty-list:latest`. In the NAS Docker app, create a project from `compose.yaml`, and the game is at `http://<nas-address>:8081`. An optional Cloudflare Tunnel in the same file lets friends play from anywhere.

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
