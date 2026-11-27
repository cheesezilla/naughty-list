# Releasing The Naughty List

A release is **merging `integration` into `main` and deploying `main` on the NAS**. Everything else happens by itself.

Versions follow [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`, with the current one in `package.json`.

| Bump | When | Example |
| --- | --- | --- |
| **MAJOR** | A change that restarts or breaks saves, or rebuilds the core loop | 2.0.0 |
| **MINOR** | New content, features or balance changes players will notice | 1.1.0 |
| **PATCH** | Bug fixes, wording, art and UI polish with no rule changes | 1.0.1 |

## Before the integration → main PR

Do these on `integration` (a normal pull request into it, or the release PR itself):

1. Bump `version` in `package.json` and the root entries of `package-lock.json`.
2. In `CHANGELOG.md`, rename `## [Unreleased]` to `## [X.Y.Z] - date` (plus a new empty `[Unreleased]` above it and the compare links at the bottom). Write for players.
3. Add the same notes to the top of `content/releases.json` (newest first). This is the **What's new** popup, shown once to every player after an update, and the **More > What's new** screen. A test fails if its first version differs from `package.json` or is missing from `CHANGELOG.md`.
4. Add a `docs/PLAN.md` changelog row.

Between releases, add a line under `[Unreleased]` in every pull request that players would notice.

## What happens when `integration` is merged into `main`

The **Docker image** workflow runs on the `main` push:

- publishes `ghcr.io/cheesezilla/naughty-list:latest` (the image the NAS pulls),
- if `package.json` has a version with no git tag yet, it also publishes `:X.Y.Z` and `:X.Y`, then creates the tag `vX.Y.Z` and a GitHub Release using that version's `CHANGELOG.md` section as the notes. If the section is missing, the release step fails: fix the changelog on `main` and re-run the workflow.
- a push to `main` with the same version as before only refreshes `:latest`, so the version tag is never overwritten.

`/api/health` shows the running version: `X.Y.Z` for a release image, the commit for other images.

## Deploying on the NAS

After the workflow finishes (about 3 minutes), pull `latest` and redeploy the project, as in [DEPLOY.md](DEPLOY.md#updating-to-a-new-version). The first time each player opens the game after the update, they see the What's new popup.

To stay on a version or roll back, set the image line to `ghcr.io/cheesezilla/naughty-list:1.0.0`. Newer versions upgrade saves in place and older ones may not read them, so copy `/volume1/docker/naughty-list` first.
