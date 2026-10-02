# AI Studio Suite: design

**Date:** 2026-09-30 · **Status:** approved in chat section by section, awaiting spec review · **Label:** exploration

## TL;DR

Six forked Wasserman Productions filmmaking tools run as one web suite at a single address, on Vercel and on localhost, built from one repo (`weeeha/AI-Studio-Suite`) that pins each fork to a commit. Phase 0 gets all six working in the browser with today's UI. Phase 1 restyles each tool onto Minimal Design System tokens without touching component code. Phase 2 connects the tools in pipeline order through a shared in-browser inbox. Phase 3 (per-tool features) gets its own specs later. Reuse wins every tie: existing UI, existing exports and imports, existing token names.

## 1. Decisions so far

| # | Question | Decision |
| --- | --- | --- |
| Q1 | Which tools matter | All six, rebuilt in pipeline order, hand-offs a priority |
| Q2 | Where it runs | Web suite at one address (Vercel + localhost); desktop apps keep working |
| Q2b | How much to rewrite | As little as possible; working tools first |
| Q3 | How six forks reach one address | The suite repo builds every fork into one static site |
| D1 | Design system use | Tokens only inside the forks (CozyClay recipe); `@weeeha/ui` components only in new suite UI |
| D2 | Nick's own film tools (`scene-builder-3d`, `Scene-Builder-v2`, `FilmMaker`, `CozyClay-SuperUI`) | Stay separate; ideas can come in later as phase 3 specs |

## 2. Scope

**In:** phase 0 (browser support for all six), phase 1 (Minimal DS look), phase 2 (hand-offs), the suite home, the suite pill, build, local dev, deploy, tests.

**Out:** phase 3 features, rewriting existing screens on DS components, a suite-wide data model, MCP agent control in the browser, React 19 upgrades inside the forks.

## 3. Identity map

| Repo | GitHub | Commit email | Vercel |
| --- | --- | --- | --- |
| `weeeha/AI-Studio-Suite` | weeeha | `1083934+weeeha@users.noreply.github.com` | team `nick-vyhouskis-projects` (Hobby), project `ai-studio-suite` |
| `weeeha/{blockout, scriptbreak, storyboard-reference-studio, slate, motion-previs-studio, cork-board}` | weeeha (forks of `wassermanproductions/*`) | same | not deployed on their own |

Every repo has the email set with `git config --local`. Work happens on branches with a PR per change; nothing is pushed to `main` directly.

## 4. Architecture

### 4.1 Suite repo layout

```
suite.lock.json     tool id → { repo, sha }: the exact fork commit each deploy builds
tools.json          tool registry (see 4.2)
apps/home/          suite home at "/" (React 19, Tailwind v4, @weeeha/ui components copied in)
packages/pill/      suite pill: vanilla TS in a Shadow DOM, injected into every tool
packages/inbox/     shared inbox (IndexedDB) used by the pill
packages/convert/   send-time converters between tool formats
packages/tokens/    Minimal DS value extract + drift check for forks
scripts/build.mjs   fetch forks at pinned commits, build, assemble dist/
scripts/dev.mjs     local gateway on one port
scripts/pin.mjs     write forks/*/HEAD commits into suite.lock.json
tests/              Playwright smoke + hand-off tests (Chromium + WebKit)
forks/              local working clones (gitignored)
```

### 4.2 Tool registry (`tools.json`)

| id | Tool | Path | Fork | Web build | Output |
| --- | --- | --- | --- | --- | --- |
| `cork` | Cork Board | `/cork/` | `weeeha/cork-board` | `npm run build` | `dist` |
| `script` | ScriptBreak | `/script/` | `weeeha/scriptbreak` | none (static file) | `src` |
| `slate` | Slate | `/slate/` | `weeeha/slate` | `npm run build:web` (new script; existing `vite.web.config.ts` gains `base: './'` and `build.outDir`) | `dist-web` |
| `storyboard` | Storyboard Reference Studio | `/storyboard/` | `weeeha/storyboard-reference-studio` | `npm run build:web` (new) | `dist-web` |
| `motion` | Motion Previs Studio | `/motion/` | `weeeha/motion-previs-studio` | `npm run build` (existing: already a plain Vite renderer build with `base: './'`) | `dist` |
| `blockout` | Blockout | `/blockout/` | `weeeha/blockout` | `npm run build:web` (new) | `dist-web` |

Each entry also records a dev port (5171 to 5176), a dev command that accepts `--base /<path>/`, and `theme` (`light` for Cork Board, `dark` for the rest) so the pill matches the tool it sits in.

### 4.3 Build (`scripts/build.mjs`)

1. On Vercel, for each tool: download `codeload.github.com/<repo>/tar.gz/<sha>` from `suite.lock.json` (all forks are public, no token). With `--local`, use the `forks/<repo>` working tree instead.
2. `npm ci` with `ELECTRON_SKIP_BINARY_DOWNLOAD=1`, then the web build.
3. Copy the output to `dist/<path>/` and inject the pill (`<script type="module" src="../_suite/pill.js">`) into its `index.html`.
4. Build `apps/home` into `dist/` and the pill into `dist/_suite/`.

Web builds use `base: './'` so one output works under any path, on localhost, and inside Electron's `file://` loader.

### 4.4 Deploy

- Vercel project `ai-studio-suite`, Git-connected to `weeeha/AI-Studio-Suite`. `vercel.json`: no framework, build `node scripts/build.mjs`, output `dist`.
- Each tool path redirects from `/cork` to `/cork/`. Relative asset paths break without the trailing slash.
- No tool uses history routing (checked 2026-09-30: no `pushState`, router or `location.pathname` use in any renderer). If one adds it later, add a rewrite to its `index.html` for that path only.
- No COOP/COEP headers in phase 0 (see risks).
- Shipping a fork change: merge in the fork, `npm run pin` on a suite branch, open a suite PR, check the Vercel preview. Pinning an unmerged fork commit gives a preview before merging.

### 4.5 Local dev (`scripts/dev.mjs`)

- `npm run dev` starts each tool's dev server with `--host 127.0.0.1 --base /<path>/` on its port, and serves the home itself as the gateway on **http://localhost:5170**, proxying each tool path (WebSockets included, for hot reload). ScriptBreak runs on the suite's own Vite as static files. The pill is injected at build time only, so it appears in `npm run build:local` + `npm run serve` and on Vercel, not in `npm run dev`.
- Same paths and same origin as production, so storage and hand-offs behave the same.
- The desktop apps still run from `forks/<repo>` for ffmpeg exports and MCP.

### 4.6 Access

The tools are static and projects live in the browser. Hobby protection covers preview URLs. The production address is expected to be public; confirm with `vercel project protection` during setup. Anything that spends money (`/api/ai`, phase 0c) checks a passphrase server-side.

## 5. Changes inside each fork

All additive, on a branch per change, PR to the fork's `main`:

- **Web build:** Blockout and Storyboard get a `vite.web.config.ts` (root = renderer, `base: './'`, same aliases and plugins as the Electron renderer config) and a `build:web` script. Slate's existing `vite.web.config.ts` (today a dev-only preview with a mocked `window.slate`) is extended rather than replaced. Motion Previs reuses its existing `npm run build`. Cork Board reuses its existing Vite build. ScriptBreak needs no build.
- **Browser adapter:** `src/renderer/web/` (path per repo) implements the tool's existing desktop interface (`window.blockout`, `window.sbr`, `SlateApi` as `window.slate`, Motion Previs's bridge). It installs only when the desktop interface is missing, so Electron behaviour is unchanged. Typecheck keeps it in step with upstream interface changes.
- **Desktop-only features** report "Desktop app" through the adapter, so the UI shows a label instead of an error.
- **No dependency on suite code.** Adapters call `window.__suite` when present (section 6.2) and fall back to a plain file input and download when not.
- **License:** keep `LICENSE`, `NOTICE`, every Credits/About surface, and the credit to Sam Wasserman (wassermanproductions.com). Record changes in `MODIFICATIONS.md`; add the file to forks that lack it.
- **Upstream sync:** `git fetch upstream` and merge `upstream/<default>` on a branch, then re-pin.

## 6. Suite home, pill and hand-offs

### 6.1 Suite home (`/`)

- The six tools in pipeline order: Cork Board → ScriptBreak → Slate → Storyboard → Motion Previs → Blockout → video generator.
- Each tool shows its name, a one-line purpose, Open, and items waiting in the inbox (phase 2).
- Credits block for Sam Wasserman with license and ko-fi link.
- Follows the system light/dark setting.
- States: no inbox items (counts hidden), inbox unavailable (counts hidden, one-line hint).
- Drafted as HTML for approval before code; `me:unslop` runs on the draft.

### 6.2 Suite pill

A small floating control in every tool, injected at build time.

- **Contents:** Home, tool switcher (pipeline order), inbox count.
- **Shadow DOM** keeps its CSS and the tool's CSS from leaking into each other.
- **Floating, not a bar**, so no tool layout shifts. The corner is per tool (`pillCorner` in `tools.json`, bottom-left by default) so it never covers a tool's own controls or its credit to Sam Wasserman; ScriptBreak uses bottom-right because its sidebar credit sits bottom-left.
- Drafted with the home.
- It also installs the runtime contract the adapters use:

```ts
type ToolId = 'cork' | 'script' | 'slate' | 'storyboard' | 'motion' | 'blockout'

interface SuiteHost {
  version: 1
  tool: ToolId
  // Download or Send; the chooser lists tools that accept this kind of file.
  offerSave(file: File, kind: string): Promise<'downloaded' | 'sent' | 'cancelled'>
  // "From your computer" or "From suite inbox (n)".
  pickFiles(opts: { accept?: string; multiple?: boolean; kinds?: string[] }): Promise<File[] | null>
  // Direct send with no chooser (Motion Previs → Blockout).
  send(to: ToolId, files: File[], kind: string): Promise<void>
}
declare global { interface Window { __suite?: SuiteHost } }
```

- **Cork Board and ScriptBreak** have no adapter. The pill hooks them at two points:
  - **Downloads:** clicks on `a[download]` links whose `href` is a blob open the Download/Send chooser.
  - **File inputs:** `input[type=file]` clicks open the computer/inbox chooser. The chosen inbox file is placed into the input through `DataTransfer`, followed by a `change` event.

### 6.3 Inbox (`packages/inbox`)

```ts
interface InboxItem {
  id: string            // crypto.randomUUID()
  from: ToolId
  to: ToolId
  kind: string          // 'fountain' | 'reference-clip' | 'board-package' | 'slate-project' | ...
  filename: string
  mime: string
  blob: Blob
  note?: string
  createdAt: number
  receivedAt?: number
}
```

- **Storage:** IndexedDB `suite-inbox`, store `items`. A `BroadcastChannel('suite-inbox')` tells open tabs about new items.
- **Persistence:** `navigator.storage.persist()` is requested on first send.
- **Lifetime:** items stay until received or dismissed.

### 6.4 Hand-offs (phase 2)

| From → To | kind | Mechanism | Work |
| --- | --- | --- | --- |
| Cork Board → ScriptBreak | `fountain` | Cork Board's Fountain export, ScriptBreak's `.fountain` import | pill hooks only |
| Motion Previs → Blockout | `reference-clip` | Motion Previs adapter `send()`, Blockout adapter reference picker | adapters |
| Storyboard → Slate | `board-package` | Storyboard board zip, Slate media import via `pickFiles` | adapters |
| ScriptBreak → Slate | `slate-project` | converter: `.scriptbreak` (scenes, shots, characters, bibles, look) → Slate `project.json`; the Slate adapter turns an arriving project into a new project in its list | converter + adapter |
| ScriptBreak → Storyboard | set by the spike | Storyboard is built around imported media; the mapping is decided by a spike (section 11) | spike first |

- **Converter failure:** nothing is sent, the chooser names the field that failed, and Download stays available.
- **Converters** live in `packages/convert/`, one file per pair, each with fixture tests.

## 7. Phase 0: browser support

### 7.1 Storage (React tools)

- **Projects:** stored in the browser's private file system (OPFS), behind each tool's interface. Works in Chrome and Safari.
- **Zip import/export:** "Export project (.zip)" and "Import project" use the desktop folder layout, so projects move between browser and desktop.
- **Existing storage stays:** Cork Board and ScriptBreak keep their `localStorage` keys (`cork-board-*`, `scriptbreak*`).
- **Namespacing:** new storage is prefixed `<tool id>:`. No collisions exist today.

### 7.2 0a: Runs

| Tool | In the browser | Later or desktop-only |
| --- | --- | --- |
| Cork Board | everything | MCP |
| ScriptBreak | everything, including PDF/FDX/Fountain import and print sheets | MCP, double-click open |
| Slate | projects, media import, audio analysis (Web Audio decode, same DSP), prompt compiling, Markdown/CSV export | brain (0c), Circle Take becomes a JSON import, MCP |
| Storyboard | projects, media import, frame grabs (video + canvas), crop, annotate, prompt editing, board zip, CSV, print-to-PDF | scene detect and animatic MP4 (0b), Claude prompts (0c), MCP |
| Motion Previs | video file import, pose and depth analysis, camera solve, 3D preview, text bundle zip | control-video MP4s and edge/line-art passes (0b), URL import (yt-dlp), MCP |
| Blockout | Stage and Shoot modes, assets, scans, reference underlay, stills, prompts, ComfyUI JSON, glTF | MP4 passes (0b), Claude reference analysis (0c), MCP |

### 7.3 0b: Exports

- **Video encoding:** WebCodecs `VideoEncoder` plus an MP4 muxer for Blockout's clean/depth/normal passes, the Storyboard animatic, and Motion Previs control videos.
- **ffmpeg replacements:** video + canvas for frame grabs and simple filters; a frame-difference function for scene detect.
- **Not byte-identical:** browser encodes are labelled "preview encode". Blockout's byte-identical export rule (its AGENTS.md and smoke test) stays a desktop guarantee.

### 7.4 0c: AI

- **One route:** `/api/ai` (Vercel Function, AI Gateway, model as a `provider/model` string) serves Blockout reference analysis, Storyboard vision prompts, and Slate's brain.
- **Passphrase:** checked server-side, stored per browser after first entry, 401 without it.
- **Local only:** Slate can reach a local model server when served from localhost.

### 7.5 Stays desktop-only

MCP agent control, yt-dlp URL import, Circle Take auto-discovery, Reveal in Finder, byte-identical exports.

## 8. Phase 1: Minimal DS look

- **Source:** Minimal DS `src/styles/globals.css` (Layer 1 primitives and Layer 2 semantic tokens).
- **Value copies:** each fork copies the values it uses into its own `:root`, each with a comment naming the DS token (`--bg: #09090b; /* ds: surface-page */`).
- **Drift check:** `npm run tokens:check` in the suite compares those comments against the DS and reports drift.
- **Order:** pipeline order (Cork Board first, Blockout last).

**Per tool:**
1. **Pixel-identical refactor:** literals equal to an existing token become `var(--…)`, swapped only where the role matches (background, border, text).
2. **Name the rest:** remaining chrome colours become local tokens at current values.
3. **Value swap:** one commit changes only `:root` values to DS values. Anti-slop cleanup (glows, gradient fills, `transition: all`) goes in the same commit.
4. **Gates:** port `check:tokens` (strict for new categories; legacy literals in a baseline that can only shrink) and `audit:contrast` (4.5:1, text tokens on surface tokens) into the fork's test script.

**Decisions:**
- **Theme:** the five dark tools take DS dark. Cork Board keeps its paper and cork wall; its toolbars, drawers and dialogs take DS light. A light mode for the dark tools is phase 3.
- **Chrome and accents:** chrome is neutral DS. Each tool keeps one accent, marked `local` and contrast-checked. Meaning-carrying colours stay (Slate syntax categories, ScriptBreak INT/EXT and day/night, status colours), adjusted only for contrast.
- **Literal on purpose:** colours in exports or project data (pose skeletons, contact-sheet labels, stored card/label/annotation colours, Cork Board textures, print sheets, Blockout's label swatches).
- **3D viewport chrome:** viewport background and grid read tokens through a small `cssColor('--token')` helper at init. Skip any viewport colour that also lands in an export.
- **Fonts and spacing:** unchanged in phase 1.
- **Compare-page draft:** before step 3 lands, the DS values are applied live to the tool's web build and screenshotted. Nick approves the before/after page. `me:unslop` runs on it first.

## 9. Testing and verification

- **Desktop untouched:** each fork's existing checks pass on every fork PR (Blockout: typecheck, lint, unit, smoke, e2e; Storyboard: typecheck, lint, smoke; Slate: typecheck, test; Motion Previs: its `verify` scripts).
- **Suite smoke** (`tests/`, Playwright, Chromium and WebKit, against `dist/` served locally and against the Vercel preview), per tool:
  - the page loads with no console errors;
  - create a project and reload, and the project is still there;
  - import a fixture file;
  - one export produces a file.
- **Hand-off tests:** one per row in 6.4 once built.
- **Converters:** fixture tests in `packages/convert/`.
- **Phase 1:**
  - Steps 1 and 2: zero screenshot diff against a capture taken before the step.
  - Step 3: the compare page is approved and both gates pass.
- **Conformance:** `ds-architecture` stages 00 and 01 run against the suite repo (`apps/home`).
- **Definition of done:** verified on the Vercel preview URL in Chrome and Safari, not only on localhost.

## 10. Acceptance criteria

**Phase 0a**
- [ ] `/` and all six tool paths load in Chrome and Safari on the preview URL with no console errors.
- [ ] Per tool: create a project, reload, it is still there; import a fixture; one export downloads.
- [ ] Desktop-only controls show a "Desktop app" label; none throws.
- [ ] Each fork's existing checks pass; each desktop app still launches with `npm run dev`.
- [ ] Credits to Sam Wasserman are visible in every tool and on the home.

**Phase 0b**
- [ ] Browser MP4 exports play in Chrome and Safari and carry the "preview encode" label.

**Phase 0c**
- [ ] `/api/ai` returns 401 without the passphrase and works with it; all three callers use it.

**Phase 1 (per tool)**
- [ ] Steps 1 and 2 show zero screenshot diff.
- [ ] Compare page approved by Nick.
- [ ] `check:tokens` and `audit:contrast` pass in the fork's test script.
- [ ] Credits surfaces intact; exported files unchanged in colour.

**Phase 2**
- [ ] The first four hand-offs in 6.4 pass their Playwright tests in Chromium and WebKit.
- [ ] Inbox items survive a reload; Download is still offered next to Send.
- [ ] A failing converter sends nothing and names the failing field.

## 11. Risks and open questions

| Risk | Mitigation |
| --- | --- |
| Renderers reach Electron outside the typed interface (`process`, `require`) | Adapter work starts with a grep per fork; fix with small guarded shims |
| Vercel build time with six `npm ci` runs (Hobby limit is 45 min) | Measure on the first deploy; cache per fork if needed |
| Safari OPFS write API differs from Chrome | Prove the OPFS write path in Safari in the first adapter (Slate) before the others |
| Safari WebCodecs H.264 encode support | Spike in 0b before committing to the encoder per tool |
| OPFS and IndexedDB eviction | `navigator.storage.persist()`; zip export as the backup path |
| Upstream changes the desktop interface | Adapters implement the typed interface, so typecheck fails on the merge branch |
| Hobby plan is for non-commercial use | Personal use only; revisit if that changes |

**Open:**
- ScriptBreak → Storyboard mapping (spike).
- COOP/COEP headers to enable multithreaded depth inference in Motion Previs (measure first; `credentialless` keeps Hugging Face model downloads working).
- Production domain name.

## 12. Phase 3 (outline only)

Per-tool features, each with its own spec. Candidates from the research: keyboard and accessibility passes (all six), splitting Blockout's 2,135-line `Inspector.tsx` and Motion Previs's 2,008-line `App.tsx` when a feature touches them, a light mode for the dark tools, unified type scale, and ideas from Nick's own film tools.

## 13. Attribution

All six tools are Apache-2.0 by Sam Wasserman / Wasserman Productions. The suite keeps every `LICENSE` and `NOTICE`, credits him on the home and in each tool, and links his ko-fi.
