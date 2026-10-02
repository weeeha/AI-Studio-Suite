# AI Studio Suite: agent guide

Six forked Wasserman Productions film tools served as one web suite. Design: `docs/superpowers/specs/`. Plans: `docs/superpowers/plans/`. Research: `docs/research/`.

## Commands
- `npm test`: unit tests for the build scripts (node:test)
- `npm run build:local`: build dist/ from the clones in forks/
- `npm run serve`: serve dist/ on http://127.0.0.1:4170
- `npm run test:e2e`: Playwright smoke (Chromium + WebKit) against dist/, or against SUITE_URL when set
- `npm run dev`: all enabled tools behind one gateway on http://localhost:5170
- `npm run pin`: write the current forks/* commits into suite.lock.json (commits must be pushed)

## Rules
- Never push to main. Branch per change, PR per change.
- Commit email: 1083934+weeeha@users.noreply.github.com in this repo and every fork.
- Forks change only on their own branches with PRs to the fork's main; the suite picks them up through `npm run pin`.
- Keep LICENSE, NOTICE and every credit to Sam Wasserman (wassermanproductions.com) in forks and on the home.
- Home and pill UI use Minimal Design System tokens only; files under apps/home/src/ui are copies, never edited by hand (run `npm run sync-ui`).
