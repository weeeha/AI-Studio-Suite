# Plan 1: Suite infrastructure, with Cork Board and ScriptBreak live

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One URL (Vercel preview + `localhost`) serving the suite home, the suite pill, Cork Board at `/cork/` and ScriptBreak at `/script/`, built from pinned fork commits, with smoke tests in Chromium and WebKit.

**Architecture:** The suite repo holds a tool registry (`tools.json`) and pinned fork commits (`suite.lock.json`). `scripts/build.mjs` fetches each enabled fork (local clone or GitHub tarball), runs its existing web build, copies the output under its path, and injects the pill. The home is a small React 19 app using copied Minimal DS components. The pill is vanilla TS in a Shadow DOM. No fork is modified in this plan.

**Tech Stack:** Node 24+, `node:test`, Vite 7, React 19, Tailwind v4 (`@tailwindcss/vite`), Minimal DS (`@weeeha/ui`, copied source), esbuild, Vitest + jsdom, Playwright (Chromium + WebKit), Vercel (Hobby, team `nick-vyhouskis-projects`).

**Spec:** `docs/superpowers/specs/2026-09-30-ai-studio-suite-design.md`

**Later plans:** Plan 2 Slate adapter (includes the Safari OPFS proof), Plan 3 Storyboard adapter, Plan 4 Motion Previs adapter, Plan 5 Blockout adapter. Each flips its tool to `"enabled": true` in `tools.json`.

## Global Constraints

- Node `>=24` (`.nvmrc` = `24`). Vercel default runtime is Node 24.
- Suite repo: `weeeha/AI-Studio-Suite`, local `~/ClaudeCode Projects/AI Studio Suite`. Work on branch `feat/suite-phase-0a` (from `chore/hq-seed`). Never push to `main`.
- Commit email in every repo: `1083934+weeeha@users.noreply.github.com` (`git config --local user.email`). Check before every push: `git log --format=%ae | sort -u` shows only that address.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Forks are not modified in Plan 1.
- Every tool path is `/<segment>/` with a trailing slash; tool web builds use relative asset paths (`base: './'`).
- Fork installs run with `ELECTRON_SKIP_BINARY_DOWNLOAD=1`.
- Minimal DS files copied into the home stay byte-identical to `~/ClaudeCode Projects/Minimal Design System/src/...` at commit `0491105`. Home component code uses DS token classes only: no raw hex, no Tailwind palette classes, no arbitrary values.
- Credits to Sam Wasserman (wassermanproductions.com, Apache-2.0, ko-fi.com/samwasserman) appear on the home.
- UI copy: no exclamation marks. Docs and PR prose: no em dashes.
- `me:unslop` runs before building any screen (constraints) and before calling it done (audit).
- Done means verified on the Vercel preview URL in Chromium and WebKit, plus Nick's look in Safari.

## File map

```
AGENTS.md                         commands, where specs/plans live, rules
package.json                      workspaces, scripts, Playwright
.nvmrc                            24
tools.json                        tool registry (6 tools; cork + script enabled)
suite.lock.json                   tool id → { repo, sha }
vercel.json                       build + output + trailing slash
playwright.config.ts              chromium + webkit, local server or SUITE_URL
drafts/home.html                  approved visual for the home (Task 1)
drafts/pill.html                  approved visual for the pill (Task 1)
scripts/lib/registry.mjs          loadRegistry, validateRegistry, enabledTools, fillCommand
scripts/lib/registry.test.mjs
scripts/lib/git.mjs               forkHead, isPushed
scripts/lib/lock.mjs              nextLock
scripts/lib/lock.test.mjs         (covers git.mjs + lock.mjs)
scripts/lib/html.mjs              pillSrcFor, injectPill
scripts/lib/html.test.mjs
scripts/lib/source.mjs            tarballUrl, sourceDir
scripts/lib/source.test.mjs
scripts/lib/serve-lib.mjs         resolveRequest
scripts/lib/serve-lib.test.mjs
scripts/lib/proxy.mjs             proxyTable
scripts/lib/proxy.test.mjs
scripts/pin.mjs                   CLI: write suite.lock.json from forks/*
scripts/build.mjs                 CLI: assemble dist/
scripts/serve.mjs                 CLI: static server for dist/
scripts/dev.mjs                   CLI: local gateway on :5170
scripts/sync-ui.mjs               CLI: copy Minimal DS files into apps/home
tests/fixtures/two-scenes.fountain
tests/e2e/cork.spec.ts
tests/e2e/script.spec.ts
tests/e2e/home.spec.ts
tests/e2e/helpers.ts
apps/home/                        React 19 home (Task 6)
packages/pill/                    vanilla TS pill (Task 7)
```

---

### Task 1: Drafts for the home and the pill (approval gate)

Nick's rule: a new screen starts as something to look at. Tasks 2 to 5 do not depend on this and can run while Nick reviews. Tasks 6 and 7 start only after Nick approves.

**Files:**
- Create: `drafts/home.html`, `drafts/pill.html`

**Interfaces:**
- Produces: the approved visuals that Tasks 6 and 7 implement. Their layout, spacing and copy are the source for those tasks.

- [ ] **Step 1: Load the constraints.** Invoke the `me:unslop` skill (Phase 0: constraints first) for "suite home (launcher of six film tools in pipeline order) and a floating tool switcher". Write its constraints into the top of each draft as an HTML comment.

- [ ] **Step 2: Extract tokens.** Copy the Layer 1 and Layer 2 custom properties for `:root` (light) and `.dark` from `~/ClaudeCode Projects/Minimal Design System/src/styles/globals.css` into a `<style>` block in each draft. Light values apply by default; dark values apply under `@media (prefers-color-scheme: dark)`. Keep each property name unchanged so Task 6 maps 1:1 onto DS classes.

- [ ] **Step 3: Write `drafts/home.html`.** Use this content, in this order:
  - Title "AI Studio Suite" and the one-line subtitle "Six filmmaking tools, one address. Story to shot to motion reference."
  - Pipeline of six tool cards in order. Each card shows its name, its blurb, and a state: "Open" for Cork Board and ScriptBreak; "Desktop only for now" plus a "Fork on GitHub" link for the other four.
    1. Cork Board: Index cards, acts and arcs on a planning wall.
    2. ScriptBreak: Import a script; get scenes, elements, shot lists and prompt packs.
    3. Slate: Plan shots and coverage, keep continuity, compile prompts per generator.
    4. Storyboard Reference Studio: Turn reference images and video into storyboard stills and prompts.
    5. Motion Previs Studio: Pull pose, depth and camera motion out of a reference clip.
    6. Blockout: Stage grey-box scenes, block camera and cast, export motion-reference packages.
  - Credits block: "Tools by Sam Wasserman, Wasserman Productions (wassermanproductions.com), Apache-2.0. If they help you, support the author at ko-fi.com/samwasserman."
  - Show the light and dark versions side by side.

- [ ] **Step 4: Write `drafts/pill.html`.** Show a mock tool page (a plain dark panel standing in for a tool) with the pill bottom-left in two states: closed (one compact control labelled "Suite") and open (Home, then the six tools in order; current tool marked; disabled tools muted with "desktop only").

- [ ] **Step 5: Audit.** Run `me:unslop` again (audit + fix) on both drafts. Fix every finding it raises.

- [ ] **Step 6: Commit**

```bash
git add drafts/home.html drafts/pill.html
git commit -m "docs: draft the suite home and the tool switcher pill

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 7: Get approval.** Publish both drafts as one private Artifact and send Nick the link. Stop until Nick approves or asks for changes. Record the approval (date and any changes) in `drafts/README.md` and commit.

---

### Task 2: Suite scaffold and tool registry

**Files:**
- Create: `package.json`, `.nvmrc`, `AGENTS.md`, `tools.json`, `suite.lock.json`, `scripts/lib/registry.mjs`
- Test: `scripts/lib/registry.test.mjs`

**Interfaces:**
- Produces:
  - `loadRegistry(root: string): Promise<{ tools: Tool[], lock: Lock }>`
  - `validateRegistry(tools: Tool[], lock: Lock): string[]` (empty array means valid)
  - `enabledTools(tools: Tool[]): Tool[]`
  - `fillCommand(template: string, vars: { port: number, path: string }): string`
  - `Tool = { id, name, blurb, path, repo, fork, enabled, theme: 'light'|'dark', build: string|null, out, devPort, dev }` (`theme` is the tool's own chrome theme; the pill matches it; every dev command binds `127.0.0.1` so the gateway can reach it)
  - `Lock = Record<toolId, { repo: string, sha: string }>`

- [ ] **Step 1: Create the scaffold files**

`package.json`:
```json
{
  "name": "ai-studio-suite",
  "private": true,
  "type": "module",
  "engines": { "node": ">=24" },
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "test": "node --test \"scripts/lib/*.test.mjs\"",
    "test:e2e": "playwright test",
    "build": "node scripts/build.mjs",
    "build:local": "node scripts/build.mjs --local",
    "serve": "node scripts/serve.mjs dist 4170",
    "dev": "node scripts/dev.mjs",
    "pin": "node scripts/pin.mjs",
    "sync-ui": "node scripts/sync-ui.mjs"
  },
  "devDependencies": {
    "@playwright/test": "^1.63.0"
  }
}
```

`.nvmrc`:
```
24
```

`tools.json` (array order is pipeline order):
```json
{
  "tools": [
    { "id": "cork", "name": "Cork Board", "blurb": "Index cards, acts and arcs on a planning wall.", "path": "/cork/", "repo": "weeeha/cork-board", "fork": "cork-board", "enabled": true, "theme": "light", "build": "npm run build", "out": "dist", "devPort": 5171, "dev": "npm run dev -- --port {port} --strictPort --base {path}" },
    { "id": "script", "name": "ScriptBreak", "blurb": "Import a script; get scenes, elements, shot lists and prompt packs.", "path": "/script/", "repo": "weeeha/scriptbreak", "fork": "scriptbreak", "enabled": true, "theme": "dark", "build": null, "out": "src", "devPort": 5172, "dev": "vite src --host 127.0.0.1 --port {port} --strictPort --base {path}" },
    { "id": "slate", "name": "Slate", "blurb": "Plan shots and coverage, keep continuity, compile prompts per generator.", "path": "/slate/", "repo": "weeeha/slate", "fork": "slate", "enabled": false, "theme": "dark", "build": "npm run build:web", "out": "dist-web", "devPort": 5173, "dev": "npx vite --config vite.web.config.ts --host 127.0.0.1 --port {port} --strictPort --base {path}" },
    { "id": "storyboard", "name": "Storyboard Reference Studio", "blurb": "Turn reference images and video into storyboard stills and prompts.", "path": "/storyboard/", "repo": "weeeha/storyboard-reference-studio", "fork": "storyboard-reference-studio", "enabled": false, "theme": "dark", "build": "npm run build:web", "out": "dist-web", "devPort": 5174, "dev": "npx vite --config vite.web.config.ts --host 127.0.0.1 --port {port} --strictPort --base {path}" },
    { "id": "motion", "name": "Motion Previs Studio", "blurb": "Pull pose, depth and camera motion out of a reference clip.", "path": "/motion/", "repo": "weeeha/motion-previs-studio", "fork": "motion-previs-studio", "enabled": false, "theme": "dark", "build": "npm run build", "out": "dist", "devPort": 5175, "dev": "npx vite --host 127.0.0.1 --port {port} --strictPort --base {path}" },
    { "id": "blockout", "name": "Blockout", "blurb": "Stage grey-box scenes, block camera and cast, export motion-reference packages.", "path": "/blockout/", "repo": "weeeha/blockout", "fork": "blockout", "enabled": false, "theme": "dark", "build": "npm run build:web", "out": "dist-web", "devPort": 5176, "dev": "npx vite --config vite.web.config.ts --host 127.0.0.1 --port {port} --strictPort --base {path}" }
  ]
}
```

`suite.lock.json` (current fork heads, all pushed as of 2026-09-30):
```json
{
  "cork": { "repo": "weeeha/cork-board", "sha": "7f071de08e55237778519ae175c88dced6719ecc" },
  "script": { "repo": "weeeha/scriptbreak", "sha": "ed9efb86125b713ce430b7337f27392adec071a9" },
  "slate": { "repo": "weeeha/slate", "sha": "3bf1dfe610fe5db93fec6a156ed37483afcd4b14" },
  "storyboard": { "repo": "weeeha/storyboard-reference-studio", "sha": "356dbf1bbdeda0c17bddb893a799f04e445d2ff1" },
  "motion": { "repo": "weeeha/motion-previs-studio", "sha": "95e7d0ff1d4cc546f7eb09a74ccbd084988a19bc" },
  "blockout": { "repo": "weeeha/blockout", "sha": "3f2d0564fd575f70fc28e9bfaa7e94b05e3955d9" }
}
```

`AGENTS.md`:
```markdown
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
```

- [ ] **Step 2: Write the failing tests** in `scripts/lib/registry.test.mjs`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadRegistry, validateRegistry, enabledTools, fillCommand } from './registry.mjs'

const tool = (over = {}) => ({
  id: 'cork', name: 'Cork Board', blurb: 'b', path: '/cork/', repo: 'weeeha/cork-board',
  fork: 'cork-board', enabled: true, theme: 'dark', build: 'npm run build', out: 'dist', devPort: 5171,
  dev: 'npm run dev -- --port {port} --base {path}', ...over,
})
const lockFor = (tools) => Object.fromEntries(tools.map(t => [t.id, { repo: t.repo, sha: 'a'.repeat(40) }]))

test('the committed registry is valid', async () => {
  const { tools, lock } = await loadRegistry(new URL('../..', import.meta.url).pathname)
  assert.deepEqual(validateRegistry(tools, lock), [])
  assert.deepEqual(tools.map(t => t.id), ['cork', 'script', 'slate', 'storyboard', 'motion', 'blockout'])
})

test('rejects duplicate ids, paths and ports', () => {
  const tools = [tool(), tool()]
  const errors = validateRegistry(tools, lockFor(tools))
  assert.ok(errors.some(e => e.includes('duplicate id cork')))
  assert.ok(errors.some(e => e.includes('duplicate path /cork/')))
  assert.ok(errors.some(e => e.includes('duplicate devPort 5171')))
})

test('paths must start and end with a slash and have one segment', () => {
  for (const path of ['cork/', '/cork', '/a/b/']) {
    const tools = [tool({ path })]
    assert.ok(validateRegistry(tools, lockFor(tools)).some(e => e.includes(`bad path ${path}`)), path)
  }
})

test('every tool needs a lock entry with a 40-hex sha and the same repo', () => {
  const tools = [tool()]
  assert.ok(validateRegistry(tools, {}).some(e => e.includes('no lock entry for cork')))
  assert.ok(validateRegistry(tools, { cork: { repo: 'weeeha/cork-board', sha: 'abc' } }).some(e => e.includes('bad sha for cork')))
  assert.ok(validateRegistry(tools, { cork: { repo: 'other/repo', sha: 'a'.repeat(40) } }).some(e => e.includes('repo mismatch for cork')))
})

test('theme must be light or dark', () => {
  const tools = [tool({ theme: 'sepia' })]
  assert.ok(validateRegistry(tools, lockFor(tools)).some(e => e.includes('bad theme for cork')))
})

test('enabledTools keeps order and drops disabled tools', () => {
  const tools = [tool(), tool({ id: 'slate', enabled: false }), tool({ id: 'script' })]
  assert.deepEqual(enabledTools(tools).map(t => t.id), ['cork', 'script'])
})

test('fillCommand substitutes port and path', () => {
  assert.equal(fillCommand('vite --port {port} --base {path}', { port: 5171, path: '/cork/' }), 'vite --port 5171 --base /cork/')
})
```

- [ ] **Step 3: Run to verify failure**

Run: `npm test`
Expected: FAIL, `Cannot find module '.../scripts/lib/registry.mjs'`.

- [ ] **Step 4: Implement** `scripts/lib/registry.mjs`:

```js
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export async function loadRegistry(root) {
  const tools = JSON.parse(await readFile(join(root, 'tools.json'), 'utf8')).tools
  const lock = JSON.parse(await readFile(join(root, 'suite.lock.json'), 'utf8'))
  return { tools, lock }
}

export function validateRegistry(tools, lock) {
  const errors = []
  const seen = { id: new Set(), path: new Set(), devPort: new Set() }
  for (const t of tools) {
    for (const key of ['id', 'path', 'devPort']) {
      if (seen[key].has(t[key])) errors.push(`duplicate ${key} ${t[key]}`)
      seen[key].add(t[key])
    }
    if (!/^\/[a-z0-9-]+\/$/.test(t.path)) errors.push(`bad path ${t.path}`)
    if (t.theme !== 'light' && t.theme !== 'dark') errors.push(`bad theme for ${t.id}`)
    const entry = lock[t.id]
    if (!entry) { errors.push(`no lock entry for ${t.id}`); continue }
    if (!/^[0-9a-f]{40}$/.test(entry.sha)) errors.push(`bad sha for ${t.id}`)
    if (entry.repo !== t.repo) errors.push(`repo mismatch for ${t.id}`)
  }
  return errors
}

export function enabledTools(tools) {
  return tools.filter(t => t.enabled)
}

export function fillCommand(template, { port, path }) {
  return template.replaceAll('{port}', String(port)).replaceAll('{path}', path)
}
```

- [ ] **Step 5: Run to verify pass**

Run: `npm test`
Expected: PASS, 7 tests.

- [ ] **Step 6: Commit**

```bash
git checkout -b feat/suite-phase-0a
git add package.json .nvmrc AGENTS.md tools.json suite.lock.json scripts/lib/registry.mjs scripts/lib/registry.test.mjs
git commit -m "feat: add the tool registry and pinned fork commits

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `npm run pin`

**Files:**
- Create: `scripts/lib/git.mjs`, `scripts/lib/lock.mjs`, `scripts/pin.mjs`
- Test: `scripts/lib/lock.test.mjs`

**Interfaces:**
- Consumes: `loadRegistry`, `validateRegistry` (Task 2)
- Produces:
  - `forkHead(dir: string): { sha: string, branch: string }`
  - `isPushed(dir: string, sha: string): boolean` (true when a remote-tracking branch contains the commit)
  - `nextLock(tools: Tool[], heads: Record<id, { sha }>, prev: Lock): { lock: Lock, changes: string[] }`

- [ ] **Step 1: Write the failing tests** in `scripts/lib/lock.test.mjs`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { forkHead, isPushed } from './git.mjs'
import { nextLock } from './lock.mjs'

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()

function repoWithCommit() {
  const dir = mkdtempSync(join(tmpdir(), 'suite-pin-'))
  git(dir, 'init', '-q', '-b', 'main')
  git(dir, 'config', 'user.email', 'test@example.com')
  git(dir, 'config', 'user.name', 'Test')
  writeFileSync(join(dir, 'a.txt'), 'a')
  git(dir, 'add', '.')
  git(dir, 'commit', '-qm', 'first')
  return dir
}

test('forkHead returns the HEAD sha and branch', () => {
  const dir = repoWithCommit()
  const head = forkHead(dir)
  assert.equal(head.sha, git(dir, 'rev-parse', 'HEAD'))
  assert.equal(head.branch, 'main')
})

test('isPushed is false until a remote branch contains the commit', () => {
  const dir = repoWithCommit()
  const sha = git(dir, 'rev-parse', 'HEAD')
  assert.equal(isPushed(dir, sha), false)
  const remote = mkdtempSync(join(tmpdir(), 'suite-remote-'))
  git(remote, 'init', '-q', '--bare')
  git(dir, 'remote', 'add', 'origin', remote)
  git(dir, 'push', '-q', 'origin', 'main')
  git(dir, 'fetch', '-q', 'origin')
  assert.equal(isPushed(dir, sha), true)
})

test('nextLock updates shas and reports changes', () => {
  const tools = [{ id: 'cork', repo: 'weeeha/cork-board' }, { id: 'script', repo: 'weeeha/scriptbreak' }]
  const prev = { cork: { repo: 'weeeha/cork-board', sha: 'a'.repeat(40) }, script: { repo: 'weeeha/scriptbreak', sha: 'b'.repeat(40) } }
  const { lock, changes } = nextLock(tools, { cork: { sha: 'c'.repeat(40) }, script: { sha: 'b'.repeat(40) } }, prev)
  assert.equal(lock.cork.sha, 'c'.repeat(40))
  assert.equal(lock.script.sha, 'b'.repeat(40))
  assert.deepEqual(changes, ['cork aaaaaaa -> ccccccc'])
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL, `Cannot find module '.../scripts/lib/git.mjs'`.

- [ ] **Step 3: Implement** `scripts/lib/git.mjs`:

```js
import { execFileSync } from 'node:child_process'

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()

export function forkHead(dir) {
  return { sha: git(dir, 'rev-parse', 'HEAD'), branch: git(dir, 'branch', '--show-current') }
}

export function isPushed(dir, sha) {
  return git(dir, 'branch', '-r', '--contains', sha).length > 0
}
```

`scripts/lib/lock.mjs`:
```js
export function nextLock(tools, heads, prev) {
  const lock = {}
  const changes = []
  for (const t of tools) {
    const sha = heads[t.id]?.sha ?? prev[t.id]?.sha
    lock[t.id] = { repo: t.repo, sha }
    const old = prev[t.id]?.sha
    if (old && old !== sha) changes.push(`${t.id} ${old.slice(0, 7)} -> ${sha.slice(0, 7)}`)
  }
  return { lock, changes }
}
```

`scripts/pin.mjs`:
```js
import { writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { loadRegistry, validateRegistry } from './lib/registry.mjs'
import { forkHead, isPushed } from './lib/git.mjs'
import { nextLock } from './lib/lock.mjs'

const root = new URL('..', import.meta.url).pathname
const { tools, lock: prev } = await loadRegistry(root)
const heads = {}
const problems = []
for (const t of tools) {
  const dir = join(root, 'forks', t.fork)
  if (!existsSync(dir)) { problems.push(`${t.id}: forks/${t.fork} is missing`); continue }
  execFileSync('git', ['fetch', '-q', 'origin'], { cwd: dir })
  const head = forkHead(dir)
  if (!isPushed(dir, head.sha)) problems.push(`${t.id}: ${head.sha.slice(0, 7)} on ${head.branch} is not pushed`)
  heads[t.id] = head
}
if (problems.length) { console.error(problems.join('\n')); process.exit(1) }
const { lock, changes } = nextLock(tools, heads, prev)
const errors = validateRegistry(tools, lock)
if (errors.length) { console.error(errors.join('\n')); process.exit(1) }
await writeFile(join(root, 'suite.lock.json'), JSON.stringify(lock, null, 2) + '\n')
console.log(changes.length ? changes.join('\n') : 'no changes')
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test` then `npm run pin`
Expected: tests PASS (10 total); `npm run pin` prints `no changes` (forks are at the pinned commits).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/git.mjs scripts/lib/lock.mjs scripts/lib/lock.test.mjs scripts/pin.mjs
git commit -m "feat: pin fork commits with npm run pin

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Build pipeline and static server

**Files:**
- Create: `scripts/lib/html.mjs`, `scripts/lib/source.mjs`, `scripts/lib/serve-lib.mjs`, `scripts/build.mjs`, `scripts/serve.mjs`
- Test: `scripts/lib/html.test.mjs`, `scripts/lib/source.test.mjs`, `scripts/lib/serve-lib.test.mjs`

**Interfaces:**
- Consumes: `loadRegistry`, `validateRegistry`, `enabledTools` (Task 2)
- Produces:
  - `pillSrcFor(toolPath: string): string` → `'../_suite/pill.js'` for `/cork/`
  - `injectPill(html: string, src: string): string` (idempotent, marker `data-suite-pill`)
  - `tarballUrl(repo: string, sha: string): string`
  - `sourceDir(tool, lock, opts: { local: boolean, root: string }): Promise<string>`
  - `resolveRequest(root: string, urlPath: string): { kind: 'file', file: string } | { kind: 'redirect', location: string } | { kind: 'missing' }`
  - `dist/` layout: `dist/index.html` (home, once Task 6 lands), `dist/_suite/pill.js` (once Task 7 lands), `dist/<segment>/` per enabled tool

- [ ] **Step 1: Write the failing tests**

`scripts/lib/html.test.mjs`:
```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pillSrcFor, injectPill } from './html.mjs'

test('pillSrcFor walks up one level per path segment', () => {
  assert.equal(pillSrcFor('/cork/'), '../_suite/pill.js')
})

test('injectPill adds one module script before </body>', () => {
  const out = injectPill('<html><body><div id="app"></div></body></html>', '../_suite/pill.js')
  assert.equal(out, '<html><body><div id="app"></div><script type="module" src="../_suite/pill.js" data-suite-pill></script></body></html>')
})

test('injectPill appends when there is no </body>', () => {
  assert.equal(injectPill('<div></div>', 'p.js'), '<div></div><script type="module" src="p.js" data-suite-pill></script>')
})

test('injectPill is idempotent', () => {
  const once = injectPill('<body></body>', 'p.js')
  assert.equal(injectPill(once, 'p.js'), once)
})
```

`scripts/lib/source.test.mjs`:
```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tarballUrl, sourceDir } from './source.mjs'

test('tarballUrl points at codeload for the pinned commit', () => {
  assert.equal(tarballUrl('weeeha/cork-board', 'abc'), 'https://codeload.github.com/weeeha/cork-board/tar.gz/abc')
})

test('local mode uses the forks/ clone', async () => {
  const dir = await sourceDir({ id: 'cork', fork: 'cork-board' }, {}, { local: true, root: '/suite' })
  assert.equal(dir, '/suite/forks/cork-board')
})
```

`scripts/lib/serve-lib.test.mjs`:
```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { resolveRequest } from './serve-lib.mjs'

const root = mkdtempSync(join(tmpdir(), 'suite-serve-'))
mkdirSync(join(root, 'cork', 'assets'), { recursive: true })
writeFileSync(join(root, 'index.html'), 'home')
writeFileSync(join(root, 'cork', 'index.html'), 'cork')
writeFileSync(join(root, 'cork', 'assets', 'a.js'), 'x')

test('serves index.html for the root and for directories with a slash', () => {
  assert.deepEqual(resolveRequest(root, '/'), { kind: 'file', file: join(root, 'index.html') })
  assert.deepEqual(resolveRequest(root, '/cork/'), { kind: 'file', file: join(root, 'cork', 'index.html') })
})

test('redirects a directory without its trailing slash', () => {
  assert.deepEqual(resolveRequest(root, '/cork'), { kind: 'redirect', location: '/cork/' })
})

test('serves files and reports missing ones', () => {
  assert.deepEqual(resolveRequest(root, '/cork/assets/a.js'), { kind: 'file', file: join(root, 'cork', 'assets', 'a.js') })
  assert.deepEqual(resolveRequest(root, '/nope.js'), { kind: 'missing' })
})

test('refuses to leave the root', () => {
  assert.deepEqual(resolveRequest(root, '/../etc/passwd'), { kind: 'missing' })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL, `Cannot find module '.../scripts/lib/html.mjs'`.

- [ ] **Step 3: Implement the libraries**

`scripts/lib/html.mjs`:
```js
export function pillSrcFor(toolPath) {
  const depth = toolPath.split('/').filter(Boolean).length
  return '../'.repeat(depth) + '_suite/pill.js'
}

export function injectPill(html, src) {
  if (html.includes('data-suite-pill')) return html
  const tag = `<script type="module" src="${src}" data-suite-pill></script>`
  const i = html.lastIndexOf('</body>')
  return i === -1 ? html + tag : html.slice(0, i) + tag + html.slice(i)
}
```

`scripts/lib/source.mjs`:
```js
import { mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

export function tarballUrl(repo, sha) {
  return `https://codeload.github.com/${repo}/tar.gz/${sha}`
}

export async function sourceDir(tool, lock, { local, root }) {
  if (local) return join(root, 'forks', tool.fork)
  const { repo, sha } = lock[tool.id]
  const dir = join(root, '.build', 'src', tool.id)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  const res = await fetch(tarballUrl(repo, sha))
  if (!res.ok) throw new Error(`${tool.id}: download failed ${res.status} for ${repo}@${sha}`)
  const tar = spawnSync('tar', ['-xzf', '-', '--strip-components=1', '-C', dir], { input: Buffer.from(await res.arrayBuffer()) })
  if (tar.status !== 0) throw new Error(`${tool.id}: tar failed: ${tar.stderr}`)
  return dir
}
```

`scripts/lib/serve-lib.mjs`:
```js
import { existsSync, statSync } from 'node:fs'
import { join, normalize, sep } from 'node:path'

export function resolveRequest(root, urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split('?')[0]))
  const full = join(root, clean)
  if (full !== root && !full.startsWith(root + sep)) return { kind: 'missing' }
  if (!existsSync(full)) return { kind: 'missing' }
  if (statSync(full).isDirectory()) {
    if (!urlPath.endsWith('/')) return { kind: 'redirect', location: urlPath + '/' }
    const index = join(full, 'index.html')
    return existsSync(index) ? { kind: 'file', file: index } : { kind: 'missing' }
  }
  return { kind: 'file', file: full }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test`
Expected: PASS (all lib tests).

- [ ] **Step 5: Implement the CLIs**

`scripts/build.mjs`:
```js
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'
import { loadRegistry, validateRegistry, enabledTools } from './lib/registry.mjs'
import { sourceDir } from './lib/source.mjs'
import { injectPill, pillSrcFor } from './lib/html.mjs'

const root = new URL('..', import.meta.url).pathname
const local = process.argv.includes('--local')
const only = process.argv.find(a => a.startsWith('--only='))?.slice(7)
const env = { ...process.env, ELECTRON_SKIP_BINARY_DOWNLOAD: '1' }
const run = (cmd, cwd) => { console.log(`$ (${cwd.replace(root, '')}) ${cmd}`); execSync(cmd, { cwd, env, stdio: 'inherit' }) }

const { tools, lock } = await loadRegistry(root)
const errors = validateRegistry(tools, lock)
if (errors.length) { console.error(errors.join('\n')); process.exit(1) }

const dist = join(root, 'dist')
rmSync(dist, { recursive: true, force: true })

if (existsSync(join(root, 'apps/home/package.json'))) {
  run('npm run build -w apps/home', root)
  cpSync(join(root, 'apps/home/dist'), dist, { recursive: true })
}
const pillBuilt = existsSync(join(root, 'packages/pill/package.json'))
if (pillBuilt) {
  run('npm run build -w packages/pill', root)
  cpSync(join(root, 'packages/pill/dist'), join(dist, '_suite'), { recursive: true })
}

for (const tool of enabledTools(tools).filter(t => !only || t.id === only)) {
  const src = await sourceDir(tool, lock, { local, root })
  if (tool.build) {
    if (!local) run('npm ci --no-audit --no-fund', src)
    else if (!existsSync(join(src, 'node_modules'))) run('npm install --no-audit --no-fund', src)
    run(tool.build, src)
  }
  const target = join(dist, tool.path)
  cpSync(join(src, tool.out), target, { recursive: true })
  if (pillBuilt) {
    const index = join(target, 'index.html')
    writeFileSync(index, injectPill(readFileSync(index, 'utf8'), pillSrcFor(tool.path)))
  }
  console.log(`built ${tool.id} -> dist${tool.path}`)
}
```

`scripts/serve.mjs`:
```js
import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { extname, resolve } from 'node:path'
import { resolveRequest } from './lib/serve-lib.mjs'

const [dir = 'dist', port = '4170'] = process.argv.slice(2)
const root = resolve(dir)
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.webp': 'image/webp', '.mp4': 'video/mp4', '.txt': 'text/plain' }

createServer((req, res) => {
  const r = resolveRequest(root, req.url)
  if (r.kind === 'redirect') { res.writeHead(308, { location: r.location }); return res.end() }
  if (r.kind === 'missing') { res.writeHead(404); return res.end('not found') }
  res.writeHead(200, { 'content-type': types[extname(r.file)] ?? 'application/octet-stream' })
  createReadStream(r.file).pipe(res)
}).listen(Number(port), '127.0.0.1', () => console.log(`serving ${root} on http://127.0.0.1:${port}`))
```

- [ ] **Step 6: Build and check by hand**

Run: `npm run build:local && ls dist dist/cork dist/script`
Expected: `dist/cork/index.html` and `dist/cork/assets/` exist; `dist/script/index.html` exists. (No home or pill yet.)

Run: `npm run serve` in one terminal, then `curl -sI http://127.0.0.1:4170/cork | head -3` and `curl -s http://127.0.0.1:4170/cork/ | grep -c '<script'`
Expected: `308` with `location: /cork/`; a script count of 1 or more.

- [ ] **Step 7: Commit**

```bash
printf 'dist/\n.build/\ntest-results/\nplaywright-report/\n' >> .gitignore
git add .gitignore scripts/lib/html.mjs scripts/lib/html.test.mjs scripts/lib/source.mjs scripts/lib/source.test.mjs scripts/lib/serve-lib.mjs scripts/lib/serve-lib.test.mjs scripts/build.mjs scripts/serve.mjs
git commit -m "feat: assemble dist/ from pinned forks and serve it locally

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Smoke tests for Cork Board and ScriptBreak (Chromium + WebKit)

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/helpers.ts`, `tests/e2e/cork.spec.ts`, `tests/e2e/script.spec.ts`, `tests/fixtures/two-scenes.fountain`

**Interfaces:**
- Consumes: `npm run build:local`, `npm run serve` (Task 4)
- Produces: `npm run test:e2e`, runnable against local `dist/` or `SUITE_URL` (Vercel preview, Task 9). `VERCEL_AUTOMATION_BYPASS_SECRET` adds the protection-bypass header when set.

- [ ] **Step 1: Install Playwright browsers**

Run: `npm install && npx playwright install chromium webkit`
Expected: both browsers downloaded.

- [ ] **Step 2: Write config, helper, fixture and tests**

`playwright.config.ts`:
```ts
import { defineConfig, devices } from '@playwright/test'

const remote = process.env.SUITE_URL
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: remote ?? 'http://127.0.0.1:4170',
    extraHTTPHeaders: bypass ? { 'x-vercel-protection-bypass': bypass, 'x-vercel-set-bypass-cookie': 'true' } : undefined,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: remote ? undefined : { command: 'npm run serve', url: 'http://127.0.0.1:4170/cork/', reuseExistingServer: true },
})
```

`tests/e2e/helpers.ts`:
```ts
import type { Page } from '@playwright/test'

// Collects console errors and uncaught exceptions for one page.
export function watchErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', e => errors.push(e.message))
  return errors
}
```

`tests/fixtures/two-scenes.fountain`:
```
Title: Smoke Test

INT. KITCHEN - NIGHT

MARA stands at the sink, watching the window.

EXT. ROOFTOP - DAY

The city hums below. MARA steps to the edge.
```

`tests/e2e/cork.spec.ts`:
```ts
import { test, expect } from '@playwright/test'
import { watchErrors } from './helpers'

test('Cork Board loads, keeps the project after reload, exports Fountain, imports JSON', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/cork/')
  const title = page.locator('#projectTitle')
  await expect(title).toBeVisible()

  await title.fill('Smoke Test Film')
  await title.press('Tab')
  await page.waitForTimeout(800) // autosave is debounced at 400ms
  await page.reload()
  await expect(page.locator('#projectTitle')).toHaveValue('Smoke Test Film')

  await page.locator('#exportBtn').click()
  const download = page.waitForEvent('download')
  await page.locator('#downloadFountainBtn').click()
  expect((await download).suggestedFilename()).toMatch(/\.fountain$/)

  // Round-trip in the same Export dialog (download buttons keep it open): JSON out, then back in.
  const jsonDownload = page.waitForEvent('download')
  await page.locator('#downloadJsonBtn').click()
  const jsonPath = await (await jsonDownload).path()
  const chooser = page.waitForEvent('filechooser')
  await page.locator('#importJsonBtn').click()
  await (await chooser).setFiles(jsonPath)
  await expect(page.locator('#projectTitle')).toHaveValue('Smoke Test Film')

  expect(errors).toEqual([])
})
```

`tests/e2e/script.spec.ts`:
```ts
import { test, expect } from '@playwright/test'
import { watchErrors } from './helpers'

test('ScriptBreak imports a Fountain script, keeps it after reload, saves the project', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/script/')
  await page.locator('#fileInput').setInputFiles('tests/fixtures/two-scenes.fountain')
  await expect(page.locator('.scene-card')).toHaveCount(2)

  const stored = await page.evaluate(() => localStorage.getItem('scriptbreak.db.v2') ?? '')
  expect(stored).toContain('KITCHEN')
  await page.reload()
  const afterReload = await page.evaluate(() => localStorage.getItem('scriptbreak.db.v2') ?? '')
  expect(afterReload).toContain('KITCHEN')

  const download = page.waitForEvent('download')
  await page.locator('#btnSaveProj').click()
  expect((await download).suggestedFilename()).toMatch(/\.(scriptbreak|json)$/)

  expect(errors).toEqual([])
})
```

- [ ] **Step 3: Run**

Run: `npm run build:local && npm run test:e2e`
Expected: 4 passing (2 specs × chromium, webkit). If an import (ScriptBreak script, Cork Board JSON) opens a confirmation first, accept it in the spec through its visible button text, then re-run. `#importJsonBtn` lives in the Export dialog next to the download buttons and opens a hidden file input, so the spec drives it through Playwright's `filechooser` event. If any console error appears, fix its cause in the build script (for example a wrong asset path), never by filtering errors out.

- [ ] **Step 4: Commit**

```bash
git add playwright.config.ts tests/ package.json package-lock.json
git commit -m "test: smoke Cork Board and ScriptBreak in Chromium and WebKit

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Suite home (after Task 1 approval)

**Files:**
- Create: `apps/home/package.json`, `apps/home/index.html`, `apps/home/vite.config.ts`, `apps/home/tsconfig.json`, `apps/home/src/main.tsx`, `apps/home/src/App.tsx`, `apps/home/src/ToolCard.tsx`, `apps/home/src/index.css`, `scripts/sync-ui.mjs`
- Create (copied, never edited): `apps/home/src/ui/components/{button,card}.tsx`, `apps/home/src/ui/lib/utils.ts`, `apps/home/src/ui/styles/globals.css`, `apps/home/src/ui/tokens.ts`
- Create: `ds-architecture.config.json`
- Test: `apps/home/src/App.test.tsx`, `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes: `tools.json` (Task 2), approved `drafts/home.html` (Task 1)
- Produces: `npm run build -w apps/home` → `apps/home/dist/` (relative asset paths). `build.mjs` (Task 4) copies it to `dist/`.

- [ ] **Step 1: Copy the DS files.** Create `scripts/sync-ui.mjs`:

```js
import { cpSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

const mds = process.env.MDS_PATH ?? join(new URL('..', import.meta.url).pathname, '..', 'Minimal Design System')
const dest = new URL('../apps/home/src/ui/', import.meta.url).pathname
const files = ['components/button.tsx', 'components/card.tsx', 'lib/utils.ts', 'styles/globals.css', 'tokens.ts']
for (const f of files) {
  const from = join(mds, 'src', f)
  mkdirSync(dirname(join(dest, f)), { recursive: true })
  cpSync(from, join(dest, f))
  console.log(`copied ${f}`)
}
```

Run: `npm run sync-ui`
Expected: 5 files copied. `git diff --no-index "../Minimal Design System/src/components/card.tsx" apps/home/src/ui/components/card.tsx` prints nothing.

- [ ] **Step 2: Scaffold the app**

`apps/home/package.json`:
```json
{
  "name": "@suite/home",
  "private": true,
  "type": "module",
  "scripts": { "dev": "vite", "build": "tsc --noEmit && vite build", "test": "vitest run" },
  "dependencies": {
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "radix-ui": "^1.6.0",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "tailwind-merge": "^3.6.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.3.3",
    "@testing-library/jest-dom": "^6.8.0",
    "@testing-library/react": "^16.3.2",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "@vitejs/plugin-react": "^6.0.3",
    "jsdom": "^30.0.1",
    "shadcn": "^4.11.0",
    "tailwindcss": "^4.3.3",
    "tw-animate-css": "^1.4.0",
    "typescript": "^5.9.0",
    "vite": "^8.1.4",
    "vitest": "^4.1.10"
  }
}
```

Versions follow Minimal DS (`react`, `radix-ui`, `shadcn`, `tw-animate-css`, `tailwind-merge`, `jsdom`, `vitest`) and the forks (`vite` 8, `@vitejs/plugin-react` 6, which requires Vite 8).

`apps/home/vite.config.ts`:
```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

const ui = fileURLToPath(new URL('./src/ui', import.meta.url))

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: { alias: [{ find: /^@weeeha\/ui\/(.*)$/, replacement: `${ui}/$1` }] },
  test: { environment: 'jsdom', globals: true, setupFiles: ['./src/test-setup.ts'] },
})
```

`apps/home/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022", "module": "ESNext", "moduleResolution": "Bundler", "jsx": "react-jsx",
    "strict": true, "skipLibCheck": true, "resolveJsonModule": true, "noEmit": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"],
    "paths": { "@weeeha/ui/*": ["./src/ui/*"] }
  },
  "include": ["src"]
}
```

`apps/home/src/test-setup.ts`:
```ts
import '@testing-library/jest-dom/vitest'
```

`apps/home/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AI Studio Suite</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`apps/home/src/index.css`:
```css
@import "./ui/styles/globals.css";
@source "./";
```

`apps/home/src/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'
import registry from '../../../tools.json'

// Follow the system light/dark setting (DS dark mode is a .dark class on <html>).
const media = window.matchMedia('(prefers-color-scheme: dark)')
const sync = () => document.documentElement.classList.toggle('dark', media.matches)
sync()
media.addEventListener('change', sync)

createRoot(document.getElementById('root')!).render(
  <StrictMode><App tools={registry.tools} /></StrictMode>,
)
```

- [ ] **Step 3: Write the failing test** `apps/home/src/App.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react'
import { App, type SuiteTool } from './App'
import registry from '../../../tools.json'

const tools = registry.tools as SuiteTool[]

test('lists the six tools in pipeline order', () => {
  render(<App tools={tools} />)
  const names = screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent)
  expect(names).toEqual(['Cork Board', 'ScriptBreak', 'Slate', 'Storyboard Reference Studio', 'Motion Previs Studio', 'Blockout'])
})

test('enabled tools link to their path; disabled tools say desktop only and link the fork', () => {
  render(<App tools={tools} />)
  const cork = screen.getByRole('article', { name: 'Cork Board' })
  expect(within(cork).getByRole('link', { name: 'Open Cork Board' })).toHaveAttribute('href', './cork/')
  const slate = screen.getByRole('article', { name: 'Slate' })
  expect(within(slate).getByText('Desktop only for now')).toBeInTheDocument()
  expect(within(slate).getByRole('link', { name: 'Slate fork on GitHub' })).toHaveAttribute('href', 'https://github.com/weeeha/slate')
})

test('credits the author with license and donation links', () => {
  render(<App tools={tools} />)
  expect(screen.getByText(/Sam Wasserman/)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'wassermanproductions.com' })).toHaveAttribute('href', 'https://wassermanproductions.com')
  expect(screen.getByRole('link', { name: 'ko-fi.com/samwasserman' })).toHaveAttribute('href', 'https://ko-fi.com/samwasserman')
})
```

- [ ] **Step 4: Run to verify failure**

Run: `npm install && npm test -w apps/home`
Expected: FAIL, `Failed to resolve import "./App"`.

- [ ] **Step 5: Implement** the structure below. Apply spacing, type sizes and layout from the approved `drafts/home.html` using DS token classes only (`bg-surface-*`, `text-text-*`, `border-border-*`, scale spacing and radius). Keep the roles, names and copy exactly as written here, because the tests and the pill depend on them.

`apps/home/src/ToolCard.tsx`:
```tsx
import { Button } from '@weeeha/ui/components/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@weeeha/ui/components/card'
import type { SuiteTool } from './App'

export function ToolCard({ tool, step }: { tool: SuiteTool; step: number }) {
  const id = `tool-${tool.id}`
  return (
    <Card role="article" aria-labelledby={id} data-enabled={tool.enabled}>
      <CardHeader>
        <span className="text-text-tertiary text-xs">Step {step}</span>
        <h2 id={id} className="text-text-primary text-base font-medium">{tool.name}</h2>
        <CardDescription>{tool.blurb}</CardDescription>
      </CardHeader>
      <CardContent />
      <CardFooter>
        {tool.enabled ? (
          <Button asChild>
            <a href={`.${tool.path}`} aria-label={`Open ${tool.name}`}>Open</a>
          </Button>
        ) : (
          <div className="flex flex-col gap-1">
            <span className="text-text-secondary text-sm">Desktop only for now</span>
            <a className="text-text-secondary text-sm underline" href={`https://github.com/${tool.repo}`} aria-label={`${tool.name} fork on GitHub`}>
              Fork on GitHub
            </a>
          </div>
        )}
      </CardFooter>
    </Card>
  )
}
```

`apps/home/src/App.tsx`:
```tsx
import { ToolCard } from './ToolCard'

export type SuiteTool = { id: string; name: string; blurb: string; path: string; repo: string; enabled: boolean }

export function App({ tools }: { tools: SuiteTool[] }) {
  return (
    <main className="bg-surface-page text-text-primary min-h-dvh">
      <header>
        <h1 className="text-2xl font-medium">AI Studio Suite</h1>
        <p className="text-text-secondary">Six filmmaking tools, one address. Story to shot to motion reference.</p>
      </header>
      <ol aria-label="Pipeline">
        {tools.map((tool, i) => (
          <li key={tool.id}><ToolCard tool={tool} step={i + 1} /></li>
        ))}
      </ol>
      <footer className="text-text-secondary text-sm">
        Tools by Sam Wasserman, Wasserman Productions (<a href="https://wassermanproductions.com">wassermanproductions.com</a>), Apache-2.0.
        If they help you, support the author at <a href="https://ko-fi.com/samwasserman">ko-fi.com/samwasserman</a>.
      </footer>
    </main>
  )
}
```

- [ ] **Step 6: Run to verify pass**

Run: `npm test -w apps/home && npm run build -w apps/home`
Expected: 3 tests PASS; `apps/home/dist/index.html` exists and references `./assets/`.

- [ ] **Step 7: Add the e2e check** `tests/e2e/home.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import { watchErrors } from './helpers'

test('home lists the pipeline and opens Cork Board', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(6)
  await page.getByRole('link', { name: 'Open Cork Board' }).click()
  await expect(page).toHaveURL(/\/cork\/$/)
  expect(errors).toEqual([])
})
```

Run: `npm run build:local && npm run test:e2e`
Expected: 6 passing (3 specs × 2 browsers).

- [ ] **Step 8: Conformance.** Create `ds-architecture.config.json` at the suite root:

```json
{
  "profile": "component-library",
  "adoption": "greenfield",
  "scopeRoles": { "components": ["apps/home/src/**"], "styles": ["apps/home/src/ui/styles/**"], "app": ["apps/home/src/**"] },
  "paths": { "nameContract": "apps/home/src/ui/tokens.ts", "styleEntry": ["apps/home/src/ui/styles/globals.css"] },
  "axes": [],
  "commands": { "test": "npm test" }
}
```

Run: `node "../ds-architecture/scripts/conformance.mjs" . --stage 00 && node "../ds-architecture/scripts/conformance.mjs" . --stage 01`
Expected: exit 0 for both. Exit 2 means the config is unreadable; compare it field by field with `../ds-architecture/stages/01-token-contract/__fixtures__/conformant-consumer-paths/ds-architecture.config.json` and fix. Exit 1 lists unmet claims; fix the suite side (AGENTS.md wording, or re-run `npm run sync-ui` if the copied DS files drifted), never by editing copied DS files.

- [ ] **Step 9: Audit.** Run `me:unslop` (audit + fix) against the home at `http://127.0.0.1:4170/` in light and dark, then compare against `drafts/home.html`. Fix differences and findings, re-run Steps 6 and 7.

- [ ] **Step 10: Commit**

```bash
git add apps/home scripts/sync-ui.mjs ds-architecture.config.json tests/e2e/home.spec.ts package.json package-lock.json
git commit -m "feat: add the suite home on Minimal Design System

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Suite pill (after Task 1 approval)

**Files:**
- Create: `packages/pill/package.json`, `packages/pill/src/pill.ts`, `packages/pill/src/pill.css`, `packages/pill/src/entry.ts`, `packages/pill/vitest.config.ts`
- Test: `packages/pill/src/pill.test.ts`, extend `tests/e2e/cork.spec.ts`

**Interfaces:**
- Consumes: `tools.json` (Task 2), approved `drafts/pill.html` (Task 1); `build.mjs` injects `dist/_suite/pill.js` (Task 4)
- Produces:
  - `currentTool(tools: PillTool[], pathname: string): PillTool | undefined`
  - `hrefTo(fromPath: string, toPath: string): string` (relative, e.g. `/cork/` to `/slate/` gives `../slate/`, to `/` gives `../`)
  - `PillTool = { id: string, name: string, path: string, enabled: boolean, theme: 'light' | 'dark' }`
  - `mountPill(opts: { tools: PillTool[], pathname: string, doc?: Document }): HTMLElement` (returns the `<suite-pill>` host; `host.dataset.theme` matches the current tool's theme, or `dark` outside a tool)
  - The pill exposes no `window.__suite` in phase 0a; the inbox contract arrives in phase 2.

- [ ] **Step 1: Write the failing tests** `packages/pill/src/pill.test.ts`:

```ts
import { currentTool, hrefTo, mountPill, type PillTool } from './pill'

const tools: PillTool[] = [
  { id: 'cork', name: 'Cork Board', path: '/cork/', enabled: true, theme: 'light' },
  { id: 'script', name: 'ScriptBreak', path: '/script/', enabled: true, theme: 'dark' },
  { id: 'slate', name: 'Slate', path: '/slate/', enabled: false, theme: 'dark' },
]

test('takes the theme of the tool it sits in', () => {
  expect(mountPill({ tools, pathname: '/cork/' }).dataset.theme).toBe('light')
  expect(mountPill({ tools, pathname: '/script/' }).dataset.theme).toBe('dark')
})

test('currentTool matches the first path segment', () => {
  expect(currentTool(tools, '/script/')?.id).toBe('script')
  expect(currentTool(tools, '/script/index.html')?.id).toBe('script')
  expect(currentTool(tools, '/')).toBeUndefined()
})

test('hrefTo builds relative links', () => {
  expect(hrefTo('/cork/', '/script/')).toBe('../script/')
  expect(hrefTo('/cork/', '/')).toBe('../')
})

test('mounts in a shadow root, closed by default', () => {
  const host = mountPill({ tools, pathname: '/cork/' })
  const root = host.shadowRoot!
  const toggle = root.querySelector('button')!
  expect(toggle.getAttribute('aria-expanded')).toBe('false')
  expect(root.querySelector('[role="menu"]')!.hasAttribute('hidden')).toBe(true)
})

test('opens with links for enabled tools, marks the current one, mutes disabled ones', () => {
  const host = mountPill({ tools, pathname: '/cork/' })
  const root = host.shadowRoot!
  root.querySelector('button')!.click()
  expect(root.querySelector('button')!.getAttribute('aria-expanded')).toBe('true')
  const links = [...root.querySelectorAll('a')].map(a => [a.textContent, a.getAttribute('href'), a.getAttribute('aria-current')])
  expect(links).toEqual([['Home', '../', null], ['Cork Board', '../cork/', 'page'], ['ScriptBreak', '../script/', null]])
  expect(root.querySelector('[data-disabled="slate"]')!.textContent).toContain('desktop only')
})

test('Escape closes the menu and returns focus to the toggle', () => {
  const host = mountPill({ tools, pathname: '/cork/' })
  const root = host.shadowRoot!
  const toggle = root.querySelector('button')!
  toggle.click()
  root.querySelector('[role="menu"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  expect(toggle.getAttribute('aria-expanded')).toBe('false')
  expect(root.activeElement ?? document.activeElement).toBe(toggle)
})
```

- [ ] **Step 2: Scaffold and run to verify failure**

`packages/pill/package.json`:
```json
{
  "name": "@suite/pill",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "esbuild src/entry.ts --bundle --format=esm --minify --loader:.css=text --outfile=dist/pill.js",
    "test": "vitest run"
  },
  "devDependencies": { "esbuild": "^0.28.2", "jsdom": "^30.0.1", "vitest": "^4.1.10", "typescript": "^5.9.0" }
}
```

`packages/pill/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
export default defineConfig({ test: { environment: 'jsdom', globals: true } })
```

Run: `npm install && npm test -w packages/pill`
Expected: FAIL, `Failed to resolve import "./pill"`.

- [ ] **Step 3: Implement**

`packages/pill/src/pill.ts`:
```ts
import css from './pill.css'

export type PillTool = { id: string; name: string; path: string; enabled: boolean; theme: 'light' | 'dark' }

export function currentTool(tools: PillTool[], pathname: string): PillTool | undefined {
  return tools.find(t => pathname === t.path || pathname.startsWith(t.path))
}

export function hrefTo(fromPath: string, toPath: string): string {
  const up = '../'.repeat(fromPath.split('/').filter(Boolean).length)
  return up + toPath.replace(/^\//, '')
}

export function mountPill({ tools, pathname, doc = document }: { tools: PillTool[]; pathname: string; doc?: Document }): HTMLElement {
  const here = currentTool(tools, pathname)
  const from = here?.path ?? '/'
  const host = doc.createElement('suite-pill')
  host.dataset.theme = here?.theme ?? 'dark'
  const root = host.attachShadow({ mode: 'open' })

  const style = doc.createElement('style')
  style.textContent = css
  const toggle = doc.createElement('button')
  toggle.type = 'button'
  toggle.textContent = 'Suite'
  toggle.setAttribute('aria-expanded', 'false')
  toggle.setAttribute('aria-haspopup', 'menu')
  const menu = doc.createElement('div')
  menu.setAttribute('role', 'menu')
  menu.hidden = true

  const home = doc.createElement('a')
  home.textContent = 'Home'
  home.href = hrefTo(from, '/')
  home.setAttribute('role', 'menuitem')
  menu.append(home)
  for (const t of tools) {
    if (t.enabled) {
      const a = doc.createElement('a')
      a.textContent = t.name
      a.href = hrefTo(from, t.path)
      a.setAttribute('role', 'menuitem')
      if (t.id === here?.id) a.setAttribute('aria-current', 'page')
      menu.append(a)
    } else {
      const span = doc.createElement('span')
      span.dataset.disabled = t.id
      span.textContent = `${t.name} · desktop only`
      menu.append(span)
    }
  }

  const setOpen = (open: boolean) => {
    menu.hidden = !open
    toggle.setAttribute('aria-expanded', String(open))
    if (open) (menu.querySelector('a') as HTMLElement | null)?.focus()
    else toggle.focus()
  }
  toggle.addEventListener('click', () => setOpen(menu.hidden))
  menu.addEventListener('keydown', e => { if ((e as KeyboardEvent).key === 'Escape') setOpen(false) })

  root.append(style, toggle, menu)
  doc.body.append(host)
  return host
}
```

`packages/pill/src/entry.ts`:
```ts
import { mountPill, type PillTool } from './pill'
import registry from '../../../tools.json'

mountPill({ tools: registry.tools as PillTool[], pathname: location.pathname })
```

`packages/pill/src/pill.css`: colours are Minimal DS values copied from `globals.css` (`:root` for light, `.dark` for dark), one comment per value naming the DS token. Layout, radius and spacing follow the approved `drafts/pill.html`; the block below is the required starting point.

```css
:host {
  all: initial;
  position: fixed;
  left: 12px;
  bottom: 12px;
  z-index: 2147483000;
  font: 500 13px/1.3 system-ui, -apple-system, sans-serif;
  --pill-surface: #ffffff;      /* ds: surface-card (light) */
  --pill-text: #09090b;         /* ds: text-primary = ink-950 */
  --pill-muted: #52525b;        /* ds: text-secondary = ink-600 */
  --pill-border: #e4e4e7;       /* ds: border = ink-200 */
  --pill-hover: #09090b1a;      /* ds: surface-hover */
  --pill-ring: #a1a1aa;         /* ds: border-focus-ring = ink-400 */
}
:host([data-theme="dark"]) {
  --pill-surface: #18181b;      /* ds: surface-card (dark) = ink-900 */
  --pill-text: #fafafa;         /* ds: text-primary = ink-50 */
  --pill-muted: #a1a1aa;        /* ds: text-secondary = ink-400 */
  --pill-border: #ffffff1a;     /* ds: border (dark) */
  --pill-hover: #fafafa1a;      /* ds: surface-hover (dark) */
  --pill-ring: #71717a;         /* ds: border-focus-ring (dark) = ink-500 */
}
button, [role="menu"] {
  background: var(--pill-surface);
  color: var(--pill-text);
  border: 1px solid var(--pill-border);
  border-radius: 8px;
}
button { padding: 6px 12px; font: inherit; cursor: pointer; }
[role="menu"] { position: absolute; bottom: calc(100% + 6px); left: 0; min-width: 220px; padding: 4px; display: flex; flex-direction: column; }
[role="menu"][hidden] { display: none; }
a, [data-disabled] { padding: 6px 8px; border-radius: 6px; text-decoration: none; color: inherit; }
a:hover { background: var(--pill-hover); }
a[aria-current="page"] { background: var(--pill-hover); }
[data-disabled] { color: var(--pill-muted); }
:focus-visible { outline: 2px solid var(--pill-ring); outline-offset: 2px; }
```

Disabled tools use `text-secondary`, not `text-tertiary`: Minimal DS dark `text-tertiary` (`#52525b` on `#18181b`) is below 4.5:1, and the "desktop only" label carries information.

- [ ] **Step 4: Run to verify pass**

Run: `npm test -w packages/pill && npm run build -w packages/pill`
Expected: 6 tests PASS; `packages/pill/dist/pill.js` exists.

- [ ] **Step 5: Add e2e coverage.** Append to `tests/e2e/cork.spec.ts`:

```ts
test('the suite pill switches from Cork Board to ScriptBreak', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/cork/')
  const pill = page.locator('suite-pill')
  await pill.getByRole('button', { name: 'Suite' }).click()
  await pill.getByRole('menuitem', { name: 'ScriptBreak' }).click()
  await expect(page).toHaveURL(/\/script\/$/)
  expect(errors).toEqual([])
})
```

Run: `npm run build:local && npm run test:e2e`
Expected: 8 passing (4 tests × 2 browsers).

- [ ] **Step 6: Audit.** Run `me:unslop` (audit + fix) on the pill over Cork Board and ScriptBreak at `http://127.0.0.1:4170/`, check it never covers a control either tool needs at 1280×800 and 1440×900, compare with `drafts/pill.html`, fix, re-run Step 5.

- [ ] **Step 7: Commit**

```bash
git add packages/pill tests/e2e/cork.spec.ts package.json package-lock.json
git commit -m "feat: add the suite pill to switch between tools

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Local gateway (`npm run dev`)

**Files:**
- Create: `scripts/lib/proxy.mjs`, `scripts/dev.mjs`
- Test: `scripts/lib/proxy.test.mjs`

**Interfaces:**
- Consumes: `loadRegistry`, `enabledTools`, `fillCommand` (Task 2); `apps/home` (Task 6)
- Produces: `proxyTable(tools: Tool[]): Record<string, { target: string, ws: true }>`; `npm run dev` serving `http://localhost:5170`

- [ ] **Step 1: Write the failing test** `scripts/lib/proxy.test.mjs`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { proxyTable } from './proxy.mjs'

test('one regex route per tool, matching the path with or without the slash', () => {
  const table = proxyTable([{ id: 'cork', path: '/cork/', devPort: 5171 }])
  assert.deepEqual(Object.keys(table), ['^/cork(/.*)?$'])
  assert.deepEqual(table['^/cork(/.*)?$'], { target: 'http://127.0.0.1:5171', ws: true })
  const re = new RegExp(Object.keys(table)[0])
  assert.ok(re.test('/cork') && re.test('/cork/') && re.test('/cork/assets/a.js'))
  assert.ok(!re.test('/corkboard'))
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL, `Cannot find module '.../scripts/lib/proxy.mjs'`.

- [ ] **Step 3: Implement**

`scripts/lib/proxy.mjs`:
```js
export function proxyTable(tools) {
  return Object.fromEntries(tools.map(t => {
    const segment = t.path.replaceAll('/', '')
    return [`^/${segment}(/.*)?$`, { target: `http://127.0.0.1:${t.devPort}`, ws: true }]
  }))
}
```

`scripts/dev.mjs`:
```js
import { spawn, execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { createServer } from 'vite'
import { loadRegistry, enabledTools, fillCommand } from './lib/registry.mjs'
import { proxyTable } from './lib/proxy.mjs'

const root = new URL('..', import.meta.url).pathname
const { tools } = await loadRegistry(root)
const enabled = enabledTools(tools)
const env = { ...process.env, ELECTRON_SKIP_BINARY_DOWNLOAD: '1', PATH: `${join(root, 'node_modules/.bin')}:${process.env.PATH}` }
const children = []

for (const t of enabled) {
  const cwd = join(root, 'forks', t.fork)
  if (existsSync(join(cwd, 'package.json')) && !existsSync(join(cwd, 'node_modules'))) {
    execSync('npm install --no-audit --no-fund', { cwd, env, stdio: 'inherit' })
  }
  const child = spawn(fillCommand(t.dev, { port: t.devPort, path: t.path }), { cwd, env, shell: true })
  const tag = `[${t.id}] `
  child.stdout.on('data', d => process.stdout.write(tag + d))
  child.stderr.on('data', d => process.stderr.write(tag + d))
  children.push(child)
}

const server = await createServer({
  root: join(root, 'apps/home'),
  configFile: join(root, 'apps/home/vite.config.ts'),
  server: { port: 5170, strictPort: true, proxy: proxyTable(enabled) },
})
await server.listen()
console.log('suite on http://localhost:5170  ' + enabled.map(t => t.path).join('  '))

const stop = () => { children.forEach(c => c.kill()); server.close().then(() => process.exit(0)) }
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
```

Add `vite` to the root `devDependencies` (same version as `apps/home`) so ScriptBreak's `vite src ...` and `scripts/dev.mjs` resolve it: `npm install -D vite@^8.1.4`.

- [ ] **Step 4: Run to verify pass**

Run: `npm test`
Expected: PASS.

Run: `npm run dev`, then in another terminal `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:5170/ http://localhost:5170/cork/ http://localhost:5170/script/`
Expected: `200` three times. Open `http://localhost:5170/cork/`, edit a card, confirm hot reload by touching `forks/cork-board/src/styles.css`. The pill does not appear in dev; it is injected at build time.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/proxy.mjs scripts/lib/proxy.test.mjs scripts/dev.mjs package.json package-lock.json
git commit -m "feat: run every enabled tool behind one local port

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Vercel project and preview deploy

**Files:**
- Create: `vercel.json`
- Modify: `README.md` (status line and live URL)

**Interfaces:**
- Consumes: `scripts/build.mjs` (remote mode), `npm run test:e2e` with `SUITE_URL`
- Produces: Vercel project `ai-studio-suite` in team `nick-vyhouskis-projects`, Git-connected; preview URL for branch `feat/suite-phase-0a`

- [ ] **Step 1: Write `vercel.json`**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": null,
  "installCommand": "npm ci",
  "buildCommand": "node scripts/build.mjs",
  "outputDirectory": "dist",
  "trailingSlash": true
}
```

- [ ] **Step 2: Remote-mode build locally.** Proves the tarball path before Vercel runs it.

Run: `rm -rf dist .build && node scripts/build.mjs && ls dist dist/cork dist/script dist/_suite`
Expected: same layout as the local build; `.build/src/cork` contains Cork Board at commit `7f071de`.

- [ ] **Step 3: Preflight identity, then push**

Run: `git config --local user.email && git log --format=%ae | sort -u`
Expected: only `1083934+weeeha@users.noreply.github.com`.

Run: `git push -u origin feat/suite-phase-0a`

- [ ] **Step 4: Create and connect the Vercel project**

Run: `vercel link --yes --project ai-studio-suite --scope nick-vyhouskis-projects`
Then: `vercel git connect https://github.com/weeeha/AI-Studio-Suite.git --yes` (skip if `vercel link` reports the repo as already connected).
Check: `cat .vercel/project.json` shows the `nick-vyhouskis-projects` team id; `.vercel` stays gitignored.

- [ ] **Step 5: Get the preview.** Push triggers a Git deployment. Find it:

Run: `vercel ls ai-studio-suite --scope nick-vyhouskis-projects | head -5`
Expected: a `Ready` preview for `feat/suite-phase-0a`. On `Error`, read `vercel inspect <url> --logs` and fix the build before continuing.

- [ ] **Step 6: Check protection**

Run: `vercel project protection ai-studio-suite --scope nick-vyhouskis-projects`
Expected: Vercel Authentication on for previews. Record what it says about the production domain in `docs/research/2026-09-30-findings.md` under a new "Access" heading.

- [ ] **Step 7: Smoke the preview in both engines**

Run: `vercel project protection enable ai-studio-suite --protection-bypass --scope nick-vyhouskis-projects` and keep the printed secret only in the shell environment (never commit it). Then:
`SUITE_URL=<preview url> VERCEL_AUTOMATION_BYPASS_SECRET=<secret> npm run test:e2e`
Expected: 8 passing.

Check: `curl -sI <preview url>/cork` with the bypass header shows a redirect to `/cork/`.

- [ ] **Step 8: Look at it.** Open the preview in the Browser pane: front the tab, set the viewport to 1440×900, screenshot `/`, `/cork/`, `/script/` with the pill open. Ask Nick to open the same preview URL in Safari and confirm.

- [ ] **Step 9: Update README and commit**

In `README.md`, change the status line to:
```
**Status:** exploration · **Live:** <preview url> (preview, Cork Board + ScriptBreak) · **Started:** 2026-09-30
```

```bash
git add vercel.json README.md docs/research/2026-09-30-findings.md
git commit -m "chore: deploy the suite to Vercel with Cork Board and ScriptBreak live

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

- [ ] **Step 10: Open the PR** from `feat/suite-phase-0a` into `main` with a short description (what is live, how to run it, test results, preview link). Do not merge; Nick merges.

---

## Acceptance (Plan 1)

- [ ] `npm test`, `npm test -w apps/home`, `npm test -w packages/pill` pass.
- [ ] `npm run test:e2e` passes locally and against the preview, Chromium and WebKit.
- [ ] Preview shows the home, Cork Board at `/cork/`, ScriptBreak at `/script/`, the pill in both tools; Nick confirmed in Safari.
- [ ] `npm run dev` serves all three on `http://localhost:5170`.
- [ ] Credits to Sam Wasserman visible on the home; both tools' own credit surfaces untouched.
- [ ] No fork changed.
