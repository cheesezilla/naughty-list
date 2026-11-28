# The Naughty List

A Christmas elf-trapping browser game for eddy and friends. Scrinch, a horned devil, has hexed Santa's own elves and taken over his secret lair at the North Pole. Santa hires you as an elf hunter: arm a trap, a base, a bait and a charm, then hunt, back to back, with **no wait timer**. Bait cost paces progress instead.

- Four main areas plus an optional side area (Cookie Pantry, Wrapping Room, Toy Workshop, Reindeer Stables, Carol Loft), 29 elves with rares, mini bosses and local bosses, and ranks 1 to 5.
- Gold buys gear in the Elf Emporium; boss loot crafts stronger gear in Santa's Workshop; every elf you catch joins your Naughty List collection.
- Every hunt meets an elf (Allure), a Cheer Meter gives pick-1-of-3 boons, and Santa and Mrs. Claus drop in with gifts. Achievements, badges and a hunters' leaderboard keep friends competing.
- Phone-first web page with original art, accounts with open sign-up, server-side hunts and SQLite saves.

## Current version: 1.0.0

Release notes for every version are in [CHANGELOG.md](CHANGELOG.md). The version lives in `package.json`.

### What's new

Unreleased (on `integration`, not shipped yet):

- If the game is updated while you have it open, a popup asks you to refresh your browser so you get the new version.

1.0.0 (2026-11-27), the first full release:

- Every hunt now meets an elf; bait attraction became **Allure**, which pulls rarer elves.
- **Cheer Meter** with boons and Overcharge, plus Santa and Mrs. Claus boons and free Grand Gifts.
- Parallel Toy Workshop orders, tougher Madame Shredwell, a Cookie Pantry goals panel, and an all-elves Naughty List tab.
- Rank 5 now needs 217,000 points.

## How it's deployed

The game ships as one Docker image, built by GitHub Actions:

- Push to `main` publishes `ghcr.io/cheesezilla/naughty-list:latest`. A new version number in `package.json` also publishes a pinned image (for example `:1.0.0`), a `v1.0.0` tag and a GitHub Release.
- Push to `integration` publishes `:integration`, which runs as a test project on the NAS (port 8082). Feature PRs target `integration`; `main` only gets releases.
- The live game runs on a UGREEN NAS. In the UGOS Docker app, create a project from `compose.yaml`; the game is at `http://<nas-address>:8081`, with saves in `/volume1/docker/naughty-list`. An optional Cloudflare Tunnel in the same file lets friends play from anywhere.

Full steps: [Developer notes, Deployment guide](docs/DEVELOPER_NOTES.md#deployment-guide-nas) and [Releasing](docs/DEVELOPER_NOTES.md#releasing).

## Run it locally

Needs Node.js 22 or newer.

```sh
git clone https://github.com/cheesezilla/naughty-list
cd naughty-list
npm install
npm run play           # build and serve on http://localhost:8080
```

The first account you create is the admin. Other commands: `npm run dev` (hot reload), `npm test`, `npm run simulate`, `npm run balance`, `npm run check-content`. All game numbers live in `content/*.json`.

## Docs

- [Wiki](docs/WIKI.md): player reference and full-game walkthrough.
- [Developer notes](docs/DEVELOPER_NOTES.md): design, formulas, art, deployment, releasing.
- [Balance notes](docs/BALANCE.md): gear balance check and simulation reports.
- The UI design canvas is an artifact, linked in `CLAUDE.md`.

## Layout

```
content/          game data (JSON)
src/engine/       pure game rules (shared by server, client, simulator)
src/content/      content schema and loader
src/server/       Fastify server: API + built client
src/client/       Preact web client
scripts/          simulator, balance check, content check, server build
test/             Vitest tests
```
