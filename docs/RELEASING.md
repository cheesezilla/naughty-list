# Releasing The Naughty List

Versions follow [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`, with the current one in `package.json`. The history is in [CHANGELOG.md](../CHANGELOG.md), and every release is also a GitHub Release, a git tag and a Docker image.

## What the numbers mean

| Bump | When | Example |
| --- | --- | --- |
| **MAJOR** | A change that restarts or breaks saves, or rebuilds the game's core loop | 2.0.0 |
| **MINOR** | New content or features, or balance changes players will notice: an area, a mechanic, retuned numbers | 1.1.0 |
| **PATCH** | Bug fixes, wording, art and UI polish with no rule changes | 1.0.1 |

## Branches and images

| Branch or tag | Docker image | Used by |
| --- | --- | --- |
| `integration` | `:integration` | NAS test project (port 8082); threads may push here directly |
| `main` | `:latest` | The main NAS project (port 8081). Pull-request only |
| tag `v1.2.3` | `:1.2.3` and `:1.2` | Pin to an exact version, or roll back |

Every image also carries its commit as a tag. `/api/health` reports the running version: `1.2.3` for a release image, the commit for `:latest` and `:integration`.

## Cutting a release

1. **Prepare on a branch from `integration`.** Move the `[Unreleased]` entries in `CHANGELOG.md` under a new `## [X.Y.Z] - date` heading, written for players (what changed in the game, not how). Add the compare link at the bottom. Set the same version in `package.json` and the root entries of `package-lock.json`. Add a row to the `docs/PLAN.md` changelog and update its status table if needed.
2. **Open a pull request into `integration`**, let CI pass, and merge it. Try `:integration` on the test project.
3. **Promote:** open a pull request `integration` → `main` with the release notes as its description, and merge it once CI is green. This publishes `:latest`.
4. **Tag the merge commit on `main`:** `git tag -a vX.Y.Z -m "X.Y.Z" <commit> && git push origin vX.Y.Z`. The tag must equal the `package.json` version, or the workflow stops.
5. **The tag does the rest.** The **Docker image** workflow publishes `ghcr.io/cheesezilla/naughty-list:X.Y.Z` and `:X.Y`, then creates the GitHub Release with that version's `CHANGELOG.md` section as the notes. If it fails because the changelog section is missing, fix the changelog on `main` and re-run the workflow.
6. **Republish the doc pages** that changed (see the project rules), and tell the NAS owner to update.

Between releases, add a line under `## [Unreleased]` in every pull request that players would notice. Docs-only and internal changes need no line.

## Updating the NAS

- **Follow the latest release (default):** nothing to change in the compose file. Pull `latest` and redeploy as in [DEPLOY.md](DEPLOY.md#updating-to-a-new-version).
- **Pin a version:** set `image: ghcr.io/cheesezilla/naughty-list:1.0.0`. Nothing changes until you edit the number.
- **Roll back:** change the image line to the previous version tag and redeploy. Saves are upgraded in place by newer versions and older versions may not read them, so copy `/volume1/docker/naughty-list` first.
