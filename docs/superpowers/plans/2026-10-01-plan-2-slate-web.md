# Plan 2: Slate in the browser, plus Credits in the pill

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Slate runs at `/slate/` on the suite (Vercel preview and `localhost`). In the browser you can create and reload projects, import images and clips as references (frames extracted in the browser), analyze an audio file, and copy compiled prompts. Every tool's pill gets a Credits row, so Cork Board and Slate show the credit to Sam Wasserman.

**Architecture:** In the fork `weeeha/slate`, a browser implementation of the existing `SlateApi` interface lives in `src/renderer/src/web/`. It installs only when `window.slate` is missing, so Electron is unchanged. Projects and media are stored in IndexedDB. Media paths become virtual `slate-web:` paths, which a small `mediaSrc()` helper maps to object URLs. Desktop still gets `file://` URLs. Audio analysis reuses the desktop DSP, moved verbatim into `src/shared/`. The suite enables Slate in `tools.json`, adds browser smoke tests with tiny media fixtures, and adds a Credits row to the pill.

**Tech Stack:** Slate fork (Electron 43, React 18, TypeScript, Vite 8, Vitest 4), IndexedDB, HTMLVideoElement + canvas, Web Audio (`OfflineAudioContext`), `fake-indexeddb` (tests only). Suite: Playwright (Chromium + WebKit), vanilla TS pill, React 19 home.

**Spec:** `docs/superpowers/specs/2026-09-30-ai-studio-suite-design.md` (sections 5, 6.2, 7.1, 7.2, 9, 10). Plan 1 for context: `docs/superpowers/plans/2026-09-30-plan-1-suite-infrastructure.md`.

## Decisions this plan makes (need Nick's approval with the plan)

- **D1: IndexedDB instead of OPFS for Slate.** Probe on 2026-10-01: in WebKit 26.6 (Playwright), `navigator.storage.getDirectory()` followed by `getFileHandle` fails with `UnknownError`; Chromium works. IndexedDB opens in both. Media is stored as `{ type, bytes: ArrayBuffer }` records rather than Blobs, so the same records work in WebKit, Chromium and Node tests. Spec 7.1 is amended to match.
- **D2: Three one-line upstream edits in Slate's components.** `ReferencesPanel.tsx` (two places) and `Studios.tsx` (one) build `<img src={`file://${f}`}>`, which a browser cannot load. Each becomes `src={mediaSrc(f)}`, and desktop output is unchanged. The page security policy in `src/renderer/index.html` also gains `blob:` for images and media. These are the only edits to existing Slate UI files; everything else is new files.
- **D3: Frame sampling instead of scene detection.** In the browser, video frames are sampled evenly: one every 2 seconds, up to 16, scaled to 768 px wide JPEG. This matches the desktop's second pass, which handles clips with few cuts. Desktop scene detection stays desktop-only.
- **D4: Deferred.** Zip project export/import (spec 7.1), the brain (0c), Circle Take discovery and cross-tab project sync are not in this plan. In the browser, `revealProject` does nothing, and `stillsDiscover` returns an empty list.

## Global Constraints

- Node `>=24`. Suite repo `weeeha/AI-Studio-Suite` at `~/ClaudeCode Projects/AI Studio Suite`; fork clone at `forks/slate` (`origin` = `weeeha/slate`, `upstream` = `wassermanproductions/slate`).
- Fork work happens on branch `web/browser-adapter` in `forks/slate`, created from `main` at `3bf1dfe`. Suite work happens on branch `feat/slate-web`, created from `feat/suite-phase-0a`. Never push to `main`. Implementers never push; the controller pushes after Nick's yes.
- Commit email `1083934+weeeha@users.noreply.github.com` in every repo (`git config --local user.email`). The commit trailer names the model that actually wrote the commit.
- Every path resolution in Node scripts and tests uses `fileURLToPath(new URL(..., import.meta.url))`, never `URL.pathname`, because the repo path contains spaces.
- Installs in a fork use `npm ci --no-audit --no-fund` with `ELECTRON_SKIP_BINARY_DOWNLOAD=1`. Adding a devDependency in Task 2 is the one sanctioned `npm install`, and its lockfile change is committed.
- Desktop Slate behaves exactly as before. After every fork task, `npm run typecheck` and `npm test` in `forks/slate` pass, and `npm run build` (electron-vite) still succeeds.
- Keep `LICENSE`, `NOTICE`, and every credit to Sam Wasserman (wassermanproductions.com). Record fork changes in `MODIFICATIONS.md`, which Task 4 creates.
- Browser-only features answer with the exact text `Desktop app: this runs in the Slate desktop app for now.` instead of throwing.
- Suite UI uses Minimal DS tokens only. UI copy has no exclamation marks. Docs and PR prose have no em dashes.
- Any server an agent starts runs in the background and is killed before it reports. Never filter console errors to make a test pass.
- Done means `npm run test:e2e` passes against the Vercel preview in Chromium and WebKit, and Nick has looked in Safari.

## File map

Fork `forks/slate` (branch `web/browser-adapter`):

```
src/shared/audioFingerprint.ts          moved DSP (pure): constants + computeFingerprint
src/main/audio.ts                       imports DSP from shared; keeps decodePcm (ffmpeg)
src/renderer/src/web/paths.ts           slate-web: virtual path scheme
src/renderer/src/web/store.ts           IndexedDB: projects + media records
src/renderer/src/web/mediaCache.ts      sync path -> object URL map
src/renderer/src/web/frames.ts          sampleTimes (pure) + extractFrames (browser)
src/renderer/src/web/audio.ts           downmixTo16k (pure) + decodeToPcm (browser)
src/renderer/src/web/pick.ts            file-input picker
src/renderer/src/web/adapter.ts         createWebApi(): SlateApi, installWebAdapter()
src/renderer/src/lib/mediaSrc.ts        mediaSrc(path): object URL or file:// URL
src/renderer/src/main.tsx               installWebAdapter() before installDevMock()
src/renderer/src/components/ReferencesPanel.tsx   2 x src={mediaSrc(f)}
src/renderer/src/components/Studios.tsx           1 x src={mediaSrc(p)}
src/renderer/index.html                 CSP: img-src + blob:, media-src 'self' blob:
vite.web.config.ts                      base './', build.outDir dist-web
package.json                            build:web script, fake-indexeddb devDependency
MODIFICATIONS.md                        Apache change record
tests/audioFingerprint.test.ts, tests/web-paths.test.ts, tests/web-store.test.ts,
tests/web-frames.test.ts, tests/web-audio.test.ts
```

Suite (branch `feat/slate-web`):

```
packages/pill/src/pill.ts, pill.test.ts, pill.css   Credits row
apps/home/src/App.tsx, App.test.tsx                 id="credits" on the footer
tests/e2e/helpers.ts                                expectPillClear()
tests/e2e/credits.spec.ts                           Credits row reaches the home credit
tests/fixtures/clip.mp4, clip.webm, tone.wav, still.png
tests/e2e/slate.spec.ts                             Slate smoke
tools.json, suite.lock.json                         Slate enabled and pinned
```

---

### Task 1: Move Slate's audio DSP into `src/shared` (fork)

**Files:**
- Create: `forks/slate/src/shared/audioFingerprint.ts`
- Modify: `forks/slate/src/main/audio.ts`
- Test: `forks/slate/tests/audioFingerprint.test.ts`

**Interfaces:**
- Produces: `src/shared/audioFingerprint.ts` exports `SAMPLE_RATE` (16000), `FRAME` (512), `MAX_SECONDS` (90) and `computeFingerprint(pcm: Int16Array, fullDurationSec: number): AudioFingerprint`. `src/main/audio.ts` still exports `computeFingerprint`, now as a re-export of the same function, plus `analyzeAudio(path)`.

- [ ] **Step 1: Set up the branch**

```bash
cd "forks/slate"
git checkout -b web/browser-adapter
git config --local user.email
```
Expected: the email prints as `1083934+weeeha@users.noreply.github.com`. Then run `npm ci --no-audit --no-fund` with `ELECTRON_SKIP_BINARY_DOWNLOAD=1` if `node_modules` is missing, and `npm test`; record the passing count as the baseline.

- [ ] **Step 2: Write the failing test** `tests/audioFingerprint.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import * as shared from '../src/shared/audioFingerprint'
import * as main from '../src/main/audio'

const SR = 16000

function sine(hz: number, seconds: number): Int16Array {
  const pcm = new Int16Array(SR * seconds)
  for (let i = 0; i < pcm.length; i++) pcm[i] = Math.round(Math.sin((2 * Math.PI * hz * i) / SR) * 12000)
  return pcm
}

describe('shared audio fingerprint', () => {
  it('exports the DSP constants the desktop decoder uses', () => {
    expect(shared.SAMPLE_RATE).toBe(16000)
    expect(shared.FRAME).toBe(512)
    expect(shared.MAX_SECONDS).toBe(90)
  })

  it('is the same function the desktop module exports', () => {
    expect(main.computeFingerprint).toBe(shared.computeFingerprint)
  })

  it('fingerprints a steady tone', () => {
    const fp = shared.computeFingerprint(sine(220, 4), 4)
    expect(fp.durationSec).toBeCloseTo(4, 0)
    expect(fp.voicedRatio).toBeGreaterThan(0.5)
  })
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run tests/audioFingerprint.test.ts`
Expected: FAIL, `Failed to resolve import "../src/shared/audioFingerprint"`.

- [ ] **Step 4: Move the code.** Cut these from `src/main/audio.ts` and paste them unchanged into `src/shared/audioFingerprint.ts`, in this order: the constants `SAMPLE_RATE`, `FRAME` and `MAX_SECONDS`; the functions `frameStats`, `windowF0`, `estimateBpm` and `describeArc`; and `computeFingerprint`. That's every top-level declaration between `decodePcm` and `analyzeAudio`, plus the three constants. Add `export` to the three constants and to `computeFingerprint`. At the top of the new file put:

```ts
// Pure audio fingerprint DSP shared by the desktop (ffmpeg decode) and the browser
// (Web Audio decode). Moved verbatim from src/main/audio.ts; see MODIFICATIONS.md.
import type { AudioFingerprint } from './types'
```

At the top of `src/main/audio.ts`, below the existing imports, add:

```ts
import { SAMPLE_RATE, MAX_SECONDS, computeFingerprint } from '../shared/audioFingerprint'

export { computeFingerprint }
```

Keep `decodePcm` and `analyzeAudio` in `src/main/audio.ts`; they now use the imported constants. If `FRAME` is referenced by `decodePcm`, import it too. If the move leaves `import type { AudioFingerprint }` unused in `main/audio.ts`, keep the existing `export type { AudioFingerprint }` line working by importing the type from `../shared/types` as before.

- [ ] **Step 5: Verify**

Run: `npx vitest run tests/audioFingerprint.test.ts tests/audio.test.ts && npm run typecheck && npm test`
Expected: the new test passes (3), the existing `audio.test.ts` passes unchanged, typecheck is clean, and the full suite equals the Step 1 baseline plus 3.

If `fp.durationSec` is not ~4 because `computeFingerprint` reports `fullDurationSec` differently, read the moved code and assert the field it really fills from `fullDurationSec`. Keep the identity assertion as is.

- [ ] **Step 6: Commit**

```bash
git add src/shared/audioFingerprint.ts src/main/audio.ts tests/audioFingerprint.test.ts
git commit -m "refactor(audio): move the fingerprint DSP to src/shared so the browser can reuse it"
```

---

### Task 2: Virtual paths and IndexedDB store (fork)

**Files:**
- Create: `forks/slate/src/renderer/src/web/paths.ts`, `forks/slate/src/renderer/src/web/store.ts`
- Modify: `forks/slate/package.json` (devDependency `fake-indexeddb`)
- Test: `forks/slate/tests/web-paths.test.ts`, `forks/slate/tests/web-store.test.ts`

**Interfaces:**
- Produces, `paths.ts`:
  - `WEB_SCHEME = 'slate-web:'`
  - `isWebPath(p: string): boolean`
  - `stagedPath(id: string, fileName: string): string` returns `slate-web:/media/<id>/<safe name>`
  - `framePath(mediaPath: string, n: number): string` returns `<mediaPath>.frames/<nnn>.jpg`
  - `fileNameOf(p: string): string`
- Produces, `store.ts`:
  - `type MediaRecord = { type: string; bytes: ArrayBuffer }`
  - `openStore(name?: string): Promise<SlateStore>` (default name `slate:web`)
  - `SlateStore` methods:
    - `putProject(p: Project): Promise<void>`
    - `getProject(id: string): Promise<Project | null>`
    - `allProjects(): Promise<Project[]>`
    - `deleteProject(id: string): Promise<void>`
    - `putMedia(path: string, rec: MediaRecord): Promise<void>`
    - `getMedia(path: string): Promise<MediaRecord | null>`
    - `deleteMedia(paths: string[]): Promise<void>`
    - `close(): void`

- [ ] **Step 1: Add the test dependency**

```bash
ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm install -D fake-indexeddb@^6 --no-audit --no-fund
```

- [ ] **Step 2: Write the failing tests**

`tests/web-paths.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { WEB_SCHEME, isWebPath, stagedPath, framePath, fileNameOf } from '../src/renderer/src/web/paths'

describe('slate-web paths', () => {
  it('builds staged media paths with a safe file name', () => {
    expect(stagedPath('abc', 'My Clip (1).mp4')).toBe('slate-web:/media/abc/My_Clip__1_.mp4')
    expect(isWebPath(stagedPath('abc', 'a.png'))).toBe(true)
    expect(isWebPath('/Users/nick/a.png')).toBe(false)
    expect(WEB_SCHEME).toBe('slate-web:')
  })

  it('builds frame paths under the media path', () => {
    expect(framePath('slate-web:/media/abc/clip.mp4', 3)).toBe('slate-web:/media/abc/clip.mp4.frames/003.jpg')
  })

  it('returns the last path segment as the file name', () => {
    expect(fileNameOf('slate-web:/media/abc/clip.mp4')).toBe('clip.mp4')
    expect(fileNameOf('/Users/nick/x.wav')).toBe('x.wav')
  })
})
```

`tests/web-store.test.ts`:
```ts
import 'fake-indexeddb/auto'
import { describe, it, expect } from 'vitest'
import { openStore } from '../src/renderer/src/web/store'
import { newProjectShape } from '../src/renderer/src/lib/newProject'

let n = 0
const fresh = () => openStore(`test-${n++}`)

describe('slate web store', () => {
  it('round-trips projects', async () => {
    const s = await fresh()
    const p = newProjectShape('Night Market')
    await s.putProject(p)
    expect((await s.getProject(p.id))?.name).toBe('Night Market')
    expect((await s.allProjects()).map((x) => x.id)).toEqual([p.id])
    expect(await s.getProject('missing')).toBeNull()
    s.close()
  })

  it('deletes a project', async () => {
    const s = await fresh()
    const p = newProjectShape('Gone')
    await s.putProject(p)
    await s.deleteProject(p.id)
    expect(await s.getProject(p.id)).toBeNull()
    s.close()
  })

  it('stores media bytes and type, and deletes them by path', async () => {
    const s = await fresh()
    const bytes = new Uint8Array([1, 2, 3]).buffer
    await s.putMedia('slate-web:/media/a/x.png', { type: 'image/png', bytes })
    const rec = await s.getMedia('slate-web:/media/a/x.png')
    expect(rec?.type).toBe('image/png')
    expect(new Uint8Array(rec!.bytes)).toEqual(new Uint8Array([1, 2, 3]))
    await s.deleteMedia(['slate-web:/media/a/x.png'])
    expect(await s.getMedia('slate-web:/media/a/x.png')).toBeNull()
    s.close()
  })
})
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run tests/web-paths.test.ts tests/web-store.test.ts`
Expected: FAIL, unresolved imports `../src/renderer/src/web/paths` and `/store`.

- [ ] **Step 4: Implement**

`src/renderer/src/web/paths.ts`:
```ts
// Virtual paths for media that lives in the browser (IndexedDB), standing in for the
// filesystem paths the desktop app passes through SlateApi.

export const WEB_SCHEME = 'slate-web:'

export function isWebPath(p: string): boolean {
  return p.startsWith(WEB_SCHEME)
}

export function stagedPath(id: string, fileName: string): string {
  const safe = fileName.replace(/[^A-Za-z0-9._-]/g, '_')
  return `${WEB_SCHEME}/media/${id}/${safe}`
}

export function framePath(mediaPath: string, n: number): string {
  return `${mediaPath}.frames/${String(n).padStart(3, '0')}.jpg`
}

export function fileNameOf(p: string): string {
  return p.split('/').pop() ?? p
}
```

`src/renderer/src/web/store.ts`:
```ts
// IndexedDB persistence for the browser build: projects by id, media by virtual path.
// Media is stored as { type, bytes } (ArrayBuffer), which every engine can clone.

import type { Project } from '../../../shared/types'

export type MediaRecord = { type: string; bytes: ArrayBuffer }

export interface SlateStore {
  putProject(p: Project): Promise<void>
  getProject(id: string): Promise<Project | null>
  allProjects(): Promise<Project[]>
  deleteProject(id: string): Promise<void>
  putMedia(path: string, rec: MediaRecord): Promise<void>
  getMedia(path: string): Promise<MediaRecord | null>
  deleteMedia(paths: string[]): Promise<void>
  close(): void
}

const PROJECTS = 'projects'
const MEDIA = 'media'

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export async function openStore(name = 'slate:web'): Promise<SlateStore> {
  const open = indexedDB.open(name, 1)
  open.onupgradeneeded = () => {
    const db = open.result
    if (!db.objectStoreNames.contains(PROJECTS)) db.createObjectStore(PROJECTS, { keyPath: 'id' })
    if (!db.objectStoreNames.contains(MEDIA)) db.createObjectStore(MEDIA)
  }
  const db = await req(open)

  const write = async (store: string, fn: (s: IDBObjectStore) => void): Promise<void> => {
    const tx = db.transaction(store, 'readwrite')
    fn(tx.objectStore(store))
    await done(tx)
  }
  const read = <T>(store: string, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> =>
    req(fn(db.transaction(store, 'readonly').objectStore(store)))

  return {
    putProject: (p) => write(PROJECTS, (s) => s.put(structuredClone(p))),
    getProject: async (id) => (await read<Project | undefined>(PROJECTS, (s) => s.get(id))) ?? null,
    allProjects: () => read<Project[]>(PROJECTS, (s) => s.getAll()),
    deleteProject: (id) => write(PROJECTS, (s) => s.delete(id)),
    putMedia: (path, rec) => write(MEDIA, (s) => s.put(rec, path)),
    getMedia: async (path) => (await read<MediaRecord | undefined>(MEDIA, (s) => s.get(path))) ?? null,
    deleteMedia: (paths) => write(MEDIA, (s) => paths.forEach((p) => s.delete(p))),
    close: () => db.close(),
  }
}
```

- [ ] **Step 5: Verify**

Run: `npx vitest run tests/web-paths.test.ts tests/web-store.test.ts && npm run typecheck && npm test`
Expected: 6 new tests pass; typecheck clean; full suite = baseline + 9.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/renderer/src/web/paths.ts src/renderer/src/web/store.ts tests/web-paths.test.ts tests/web-store.test.ts
git commit -m "feat(web): add virtual media paths and an IndexedDB store for the browser build"
```

---

### Task 3: Media helpers and `mediaSrc` (fork)

**Files:**
- Create:
  - `forks/slate/src/renderer/src/web/mediaCache.ts`
  - `forks/slate/src/renderer/src/web/frames.ts`
  - `forks/slate/src/renderer/src/web/audio.ts`
  - `forks/slate/src/renderer/src/web/pick.ts`
  - `forks/slate/src/renderer/src/lib/mediaSrc.ts`
- Modify:
  - `forks/slate/src/renderer/src/components/ReferencesPanel.tsx` (the two `src={`file://${f}`}` sites)
  - `forks/slate/src/renderer/src/components/Studios.tsx` (the one `src={`file://${p}`}` site)
- Test: `forks/slate/tests/web-frames.test.ts`, `forks/slate/tests/web-audio.test.ts`, `forks/slate/tests/web-mediasrc.test.ts`

**Interfaces:**
- Consumes: `SAMPLE_RATE`, `MAX_SECONDS` (Task 1).
- Produces:
  - `mediaCache.ts`:
    - `cacheUrl(path: string, blob: Blob): string`
    - `cachedUrl(path: string): string | undefined`
    - `forgetUrls(paths: string[]): void`
  - `frames.ts`:
    - `sampleTimes(durationSec: number, opts?: { inSec?: number | null; outSec?: number | null; everySec?: number; max?: number }): number[]` (defaults every 2 s, max 16; starts at in + 0.5 s, clamped inside the range)
    - `extractFrames(video: Blob, opts?: same opts): Promise<Blob[]>` (JPEG, 768 px wide)
  - `audio.ts`:
    - `downmixTo16k(channels: Float32Array[], fromRate: number): Int16Array` (pure; capped at `MAX_SECONDS`)
    - `decodeToPcm(blob: Blob): Promise<{ pcm: Int16Array; fullDurationSec: number }>`
  - `pick.ts`: `pickFiles(accept: string, multiple: boolean): Promise<File[]>`
  - `lib/mediaSrc.ts`: `mediaSrc(path: string): string` returns the cached object URL for `slate-web:` paths, and `file://${path}` otherwise, which is the desktop behaviour unchanged.

- [ ] **Step 1: Write the failing tests**

`tests/web-frames.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { sampleTimes } from '../src/renderer/src/web/frames'

describe('sampleTimes', () => {
  it('samples every 2 seconds from 0.5s, up to 16 frames', () => {
    expect(sampleTimes(7)).toEqual([0.5, 2.5, 4.5, 6.5])
    expect(sampleTimes(100)).toHaveLength(16)
  })
  it('always returns at least one frame for very short clips', () => {
    expect(sampleTimes(0.3)).toEqual([0.15])
  })
  it('respects an in/out range', () => {
    expect(sampleTimes(60, { inSec: 10, outSec: 15 })).toEqual([10.5, 12.5, 14.5])
  })
})
```

`tests/web-audio.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { downmixTo16k } from '../src/renderer/src/web/audio'

describe('downmixTo16k', () => {
  it('averages channels and resamples 48k to 16k', () => {
    const l = new Float32Array(48000).fill(0.5)
    const r = new Float32Array(48000).fill(-0.5)
    const pcm = downmixTo16k([l, r], 48000)
    expect(pcm.length).toBe(16000)
    expect(Math.abs(pcm[100])).toBeLessThanOrEqual(1)
  })
  it('scales mono to int16 and clamps', () => {
    const pcm = downmixTo16k([new Float32Array(16000).fill(2)], 16000)
    expect(pcm[0]).toBe(32767)
  })
  it('caps at 90 seconds', () => {
    const pcm = downmixTo16k([new Float32Array(16000 * 100)], 16000)
    expect(pcm.length).toBe(16000 * 90)
  })
})
```

`tests/web-mediasrc.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'

vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:test/1', revokeObjectURL: () => undefined }))
const { mediaSrc } = await import('../src/renderer/src/lib/mediaSrc')
const { cacheUrl, forgetUrls } = await import('../src/renderer/src/web/mediaCache')

describe('mediaSrc', () => {
  it('keeps desktop paths as file:// URLs', () => {
    expect(mediaSrc('/Users/nick/a.jpg')).toBe('file:///Users/nick/a.jpg')
  })
  it('maps cached slate-web paths to object URLs and forgets them', () => {
    cacheUrl('slate-web:/media/a/x.png', new Blob(['x']))
    expect(mediaSrc('slate-web:/media/a/x.png')).toBe('blob:test/1')
    forgetUrls(['slate-web:/media/a/x.png'])
    expect(mediaSrc('slate-web:/media/a/x.png')).toBe('')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/web-frames.test.ts tests/web-audio.test.ts tests/web-mediasrc.test.ts`
Expected: FAIL, unresolved imports.

- [ ] **Step 3: Implement**

`src/renderer/src/web/mediaCache.ts`:
```ts
// Synchronous path -> object URL lookups for media held in IndexedDB, so components
// can render <img src={mediaSrc(path)}> without awaiting.

const urls = new Map<string, string>()

export function cacheUrl(path: string, blob: Blob): string {
  const old = urls.get(path)
  if (old) URL.revokeObjectURL(old)
  const url = URL.createObjectURL(blob)
  urls.set(path, url)
  return url
}

export function cachedUrl(path: string): string | undefined {
  return urls.get(path)
}

export function forgetUrls(paths: string[]): void {
  for (const p of paths) {
    const url = urls.get(p)
    if (url) URL.revokeObjectURL(url)
    urls.delete(p)
  }
}
```

`src/renderer/src/lib/mediaSrc.ts`:
```ts
import { isWebPath } from '../web/paths'
import { cachedUrl } from '../web/mediaCache'

/** Image/video URL for a media path: object URL in the browser build, file:// on desktop. */
export function mediaSrc(path: string): string {
  return isWebPath(path) ? (cachedUrl(path) ?? '') : `file://${path}`
}
```

`src/renderer/src/web/frames.ts`:
```ts
// Browser frame sampling: even samples (desktop's few-cuts fallback), JPEG at 768px wide.

type Range = { inSec?: number | null; outSec?: number | null; everySec?: number; max?: number }

export function sampleTimes(durationSec: number, opts: Range = {}): number[] {
  const every = opts.everySec ?? 2
  const max = opts.max ?? 16
  const start = Math.max(0, opts.inSec ?? 0)
  const end = Math.min(durationSec, opts.outSec ?? durationSec)
  if (end - start <= 0.5) return [Math.round(((start + end) / 2) * 100) / 100]
  const times: number[] = []
  for (let t = start + 0.5; t < end && times.length < max; t += every) times.push(Math.round(t * 100) / 100)
  return times
}

function once(el: HTMLMediaElement, event: string): Promise<void> {
  return new Promise((resolve, reject) => {
    el.addEventListener(event, () => resolve(), { once: true })
    el.addEventListener('error', () => reject(new Error('This video could not be decoded in the browser.')), { once: true })
  })
}

export async function extractFrames(video: Blob, opts: Range = {}): Promise<Blob[]> {
  const url = URL.createObjectURL(video)
  const el = document.createElement('video')
  el.muted = true
  el.playsInline = true
  el.preload = 'auto'
  el.src = url
  try {
    await once(el, 'loadedmetadata')
    const width = Math.min(768, el.videoWidth || 768)
    const height = Math.round((width * (el.videoHeight || 432)) / (el.videoWidth || 768))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D is not available in this browser.')
    const out: Blob[] = []
    for (const t of sampleTimes(el.duration, opts)) {
      el.currentTime = t
      await once(el, 'seeked')
      ctx.drawImage(el, 0, 0, width, height)
      const jpg = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.82))
      if (jpg) out.push(jpg)
    }
    return out
  } finally {
    el.removeAttribute('src')
    el.load()
    URL.revokeObjectURL(url)
  }
}
```

`src/renderer/src/web/audio.ts`:
```ts
// Browser audio decode for analyzeAudio: Web Audio decode -> mono 16 kHz int16 PCM,
// the same input the desktop feeds computeFingerprint after ffmpeg.

import { SAMPLE_RATE, MAX_SECONDS } from '../../../shared/audioFingerprint'

export function downmixTo16k(channels: Float32Array[], fromRate: number): Int16Array {
  const ratio = fromRate / SAMPLE_RATE
  const srcLen = channels[0]?.length ?? 0
  const outLen = Math.min(Math.floor(srcLen / ratio), SAMPLE_RATE * MAX_SECONDS)
  const pcm = new Int16Array(outLen)
  for (let i = 0; i < outLen; i++) {
    const j = Math.floor(i * ratio)
    let sum = 0
    for (const ch of channels) sum += ch[j] ?? 0
    const v = Math.max(-1, Math.min(1, sum / channels.length))
    pcm[i] = v < 0 ? Math.round(v * 32768) : Math.round(v * 32767)
  }
  return pcm
}

export async function decodeToPcm(blob: Blob): Promise<{ pcm: Int16Array; fullDurationSec: number }> {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new AC()
  try {
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer())
    const channels = Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c))
    return { pcm: downmixTo16k(channels, buf.sampleRate), fullDurationSec: buf.duration }
  } finally {
    void ctx.close()
  }
}
```

`src/renderer/src/web/pick.ts`:
```ts
/** Open the browser file picker and resolve with the chosen files ([] if cancelled). */
export function pickFiles(accept: string, multiple: boolean): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.multiple = multiple
    input.style.display = 'none'
    input.addEventListener('change', () => {
      resolve(Array.from(input.files ?? []))
      input.remove()
    }, { once: true })
    input.addEventListener('cancel', () => {
      resolve([])
      input.remove()
    }, { once: true })
    document.body.append(input)
    input.click()
  })
}
```

- [ ] **Step 4: Switch the three `<img>` call sites.** In `ReferencesPanel.tsx` (two sites) and `Studios.tsx` (one site), replace `` src={`file://${f}`} `` with `src={mediaSrc(f)}`, or `src={mediaSrc(p)}` in Studios. Add `import { mediaSrc } from '../lib/mediaSrc'` to both files. Confirm nothing else is left:

Run: `grep -rn 'file://' src/renderer/src/components`
Expected: no output.

- [ ] **Step 5: Verify**

Run: `npx vitest run tests/web-frames.test.ts tests/web-audio.test.ts tests/web-mediasrc.test.ts && npm run typecheck && npm test`
Expected: 8 new tests pass; typecheck clean; full suite = baseline + 17.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/web/mediaCache.ts src/renderer/src/web/frames.ts src/renderer/src/web/audio.ts src/renderer/src/web/pick.ts src/renderer/src/lib/mediaSrc.ts src/renderer/src/components/ReferencesPanel.tsx src/renderer/src/components/Studios.tsx tests/web-frames.test.ts tests/web-audio.test.ts tests/web-mediasrc.test.ts
git commit -m "feat(web): add browser media helpers and route <img> sources through mediaSrc"
```

---

### Task 4: The browser `SlateApi` and the web build (fork)

**Files:**
- Create: `forks/slate/src/renderer/src/web/adapter.ts`, `forks/slate/MODIFICATIONS.md`
- Modify:
  - `forks/slate/src/renderer/src/main.tsx`
  - `forks/slate/src/renderer/index.html`
  - `forks/slate/vite.web.config.ts`
  - `forks/slate/package.json` (`build:web` script)
- Test: `forks/slate/tests/web-adapter.test.ts`

**Interfaces:**
- Consumes:
  - from Task 2: `openStore`, `SlateStore`, `stagedPath`, `framePath`, `fileNameOf`, `isWebPath`
  - from Task 3: `cacheUrl`, `forgetUrls`, `extractFrames`, `decodeToPcm`, `pickFiles`
  - from Task 1: `computeFingerprint`
  - existing: `newProjectShape(name)` from `lib/newProject`
- Produces:
  - `createWebApi(deps?: { store?: Promise<SlateStore>; pick?: typeof pickFiles }): SlateApi`
  - `installWebAdapter(): void` (no-op when `window.slate` exists)
  - `DESKTOP_ONLY = 'Desktop app: this runs in the Slate desktop app for now.'`
  - `npm run build:web` writes `dist-web/` with relative asset paths.

- [ ] **Step 1: Write the failing test** `tests/web-adapter.test.ts`. It covers the parts that run in Node; browser-only media paths are covered by the suite e2e in Task 6.

```ts
import 'fake-indexeddb/auto'
import { describe, it, expect } from 'vitest'
import { createWebApi, DESKTOP_ONLY } from '../src/renderer/src/web/adapter'
import { openStore } from '../src/renderer/src/web/store'

let n = 0
const api = () => createWebApi({ store: openStore(`adapter-${n++}`), pick: async () => [] })

describe('web SlateApi', () => {
  it('creates, lists, saves, reopens and deletes projects', async () => {
    const s = api()
    const p = await s.createProject('Night Market')
    expect((await s.listProjects()).map((m) => [m.name, m.path])).toEqual([['Night Market', `slate-web:/projects/${p.id}`]])
    await s.saveProject({ ...p, logline: 'A market at night.' })
    expect((await s.openProject(p.id))?.logline).toBe('A market at night.')
    await s.deleteProject(p.id)
    expect(await s.listProjects()).toEqual([])
    expect(await s.openProject(p.id)).toBeNull()
  })

  it('reports desktop-only features instead of throwing', async () => {
    const s = api()
    const status = await s.brainStatus()
    expect(status.claude.available).toBe(false)
    const run = await s.brainRun({ id: 'r1', task: 't', system: '', prompt: '', tier: 'fast' })
    expect(run).toMatchObject({ id: 'r1', ok: false, error: DESKTOP_ONLY })
    expect(await s.stillsDiscover()).toEqual([])
    await expect(s.revealProject('x')).resolves.toBeUndefined()
  })

  it('returns no paths when the picker is cancelled', async () => {
    expect(await api().pickMedia()).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/web-adapter.test.ts`
Expected: FAIL, unresolved import `../src/renderer/src/web/adapter`.

- [ ] **Step 3: Implement** `src/renderer/src/web/adapter.ts`:

```ts
// Browser implementation of SlateApi (the interface the Electron preload exposes as
// window.slate). Installed only when window.slate is missing; Electron is unchanged.

import type { AudioFingerprint, BrainResult, Project, ProjectMeta, SlateApi } from '../../../shared/types'
import { computeFingerprint } from '../../../shared/audioFingerprint'
import { newProjectShape } from '../lib/newProject'
import { openStore, type SlateStore } from './store'
import { stagedPath, framePath, fileNameOf, isWebPath } from './paths'
import { cacheUrl, forgetUrls } from './mediaCache'
import { extractFrames } from './frames'
import { decodeToPcm } from './audio'
import { pickFiles } from './pick'

export const DESKTOP_ONLY = 'Desktop app: this runs in the Slate desktop app for now.'

const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,image/bmp'
const VIDEO_ACCEPT = 'video/mp4,video/quicktime,video/webm,video/x-m4v'
const AUDIO_ACCEPT = 'audio/*'

const noop = (): (() => void) => () => undefined
const desktopOnly = (id: string): BrainResult => ({ id, ok: false, text: '', error: DESKTOP_ONLY, elapsedMs: 0 })

function meta(p: Project): ProjectMeta {
  return {
    id: p.id,
    name: p.name,
    logline: p.logline,
    path: `slate-web:/projects/${p.id}`,
    updatedAt: p.updatedAt,
    sceneCount: p.scenes.length,
    shotCount: p.scenes.reduce((n, s) => n + s.shots.length, 0),
  }
}

/** Every media path a project points at (references and their frames, sheet images). */
function mediaPathsOf(p: Project): string[] {
  const paths = [
    ...p.references.flatMap((r) => [r.path, ...r.frames]),
    ...p.characters.flatMap((c) => c.images ?? []),
    ...p.locations.flatMap((l) => l.images ?? []),
    ...p.lookbook.flatMap((l) => l.images ?? []),
  ]
  return [...new Set(paths.filter(isWebPath))]
}

export function createWebApi(deps: { store?: Promise<SlateStore>; pick?: typeof pickFiles } = {}): SlateApi {
  const store = deps.store ?? openStore()
  const pick = deps.pick ?? pickFiles
  const staged = new Map<string, File>()

  const stage = (file: File): string => {
    const path = stagedPath(crypto.randomUUID(), file.name)
    staged.set(path, file)
    cacheUrl(path, file)
    return path
  }

  const blobFor = async (path: string): Promise<Blob | null> => {
    const file = staged.get(path)
    if (file) return file
    const rec = await (await store).getMedia(path)
    return rec ? new Blob([rec.bytes], { type: rec.type }) : null
  }

  const persist = async (path: string, blob: Blob): Promise<void> => {
    await (await store).putMedia(path, { type: blob.type, bytes: await blob.arrayBuffer() })
    cacheUrl(path, blob)
  }

  const saveFrames = async (mediaPath: string, frames: Blob[]): Promise<string[]> => {
    const paths: string[] = []
    for (const [i, jpg] of frames.entries()) {
      const p = framePath(mediaPath, i + 1)
      await persist(p, jpg)
      paths.push(p)
    }
    return paths
  }

  /** Load every media blob a project references into the object-URL cache before UI renders it. */
  const warm = async (p: Project): Promise<void> => {
    const s = await store
    for (const path of mediaPathsOf(p)) {
      const rec = await s.getMedia(path)
      if (rec) cacheUrl(path, new Blob([rec.bytes], { type: rec.type }))
    }
  }

  return {
    async listProjects() {
      const all = await (await store).allProjects()
      return all.map(meta).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    },
    async createProject(name) {
      const p = newProjectShape(name)
      await (await store).putProject(p)
      return structuredClone(p)
    },
    async openProject(id) {
      const p = await (await store).getProject(id)
      if (p) await warm(p)
      return p
    },
    async saveProject(project) {
      await (await store).putProject({ ...project, updatedAt: new Date().toISOString() })
    },
    async deleteProject(id) {
      const s = await store
      const p = await s.getProject(id)
      if (p) {
        const paths = mediaPathsOf(p)
        await s.deleteMedia(paths)
        forgetUrls(paths)
      }
      await s.deleteProject(id)
    },
    async revealProject() {},
    async brainStatus() {
      return {
        claude: { available: false, version: null },
        codex: { available: false, version: null },
        local: { available: false, version: null, endpoint: null },
      }
    },
    async brainRun(req) {
      return desktopOnly(req.id)
    },
    async brainCancel() {},
    async brainTest() {
      return desktopOnly('test')
    },
    async localModels() {
      return { endpoint: null, models: [] }
    },
    async pickMedia() {
      return (await pick(`${IMAGE_ACCEPT},${VIDEO_ACCEPT}`, true)).map(stage)
    },
    async pickAudio() {
      return (await pick(AUDIO_ACCEPT, false)).map(stage)
    },
    async ingestMedia(_projectId, path) {
      const blob = await blobFor(path)
      if (!blob) throw new Error(`Media not found: ${fileNameOf(path)}`)
      await persist(path, blob)
      if (blob.type.startsWith('image/')) return { kind: 'image' as const, frames: [path] }
      return { kind: 'video' as const, frames: await saveFrames(path, await extractFrames(blob)) }
    },
    async stillsDiscover() {
      return []
    },
    async stillsExtract(_projectId, mediaPath, inSec, outSec) {
      const blob = await blobFor(mediaPath)
      if (!blob) throw new Error(`Media not found: ${fileNameOf(mediaPath)}`)
      return saveFrames(`${mediaPath}.stills`, await extractFrames(blob, { inSec, outSec }))
    },
    async analyzeAudio(path): Promise<AudioFingerprint> {
      const blob = await blobFor(path)
      if (!blob) throw new Error(`Audio not found: ${fileNameOf(path)}`)
      const { pcm, fullDurationSec } = await decodeToPcm(blob)
      return computeFingerprint(pcm, fullDurationSec)
    },
    pathForFile(file) {
      return stage(file)
    },
    async copyText(text) {
      await navigator.clipboard.writeText(text)
    },
    onProjectsChanged: noop,
    onHelpOpen: noop,
    onAboutOpen: noop,
  }
}

export function installWebAdapter(): void {
  if (typeof window === 'undefined' || (window as unknown as { slate?: SlateApi }).slate) return
  ;(window as unknown as { slate: SlateApi }).slate = createWebApi()
}
```

- [ ] **Step 4: Run to verify the unit test passes**

Run: `npx vitest run tests/web-adapter.test.ts`
Expected: PASS, 3 tests. In Node, `crypto.randomUUID`, `structuredClone` and `Blob` are globals.

- [ ] **Step 5: Wire it in, and make the web build**

`src/renderer/src/main.tsx`: add the import and call `installWebAdapter()` immediately before `installDevMock()`, which then no-ops because `window.slate` exists. Leave every other line as it is:

```ts
import { installWebAdapter } from './web/adapter'
// ...
installWebAdapter()
installDevMock()
```

`src/renderer/index.html`: replace the CSP `content` value with:
```
default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' file: data: blob:; media-src 'self' blob:;
```

`vite.web.config.ts`: add `base: './'` and a `build` block. Keep the existing comment, `root`, `plugins`, `resolve` and `server` as they are:

```ts
  base: './',
  build: { outDir: resolve(__dirname, 'dist-web'), emptyOutDir: true },
```

`package.json` scripts: add `"build:web": "vite build --config vite.web.config.ts"`. Append `dist-web/` to `.gitignore`.

`MODIFICATIONS.md` (new):
```markdown
# Modifications

This fork (weeeha/slate) modifies Slate by Sam Wasserman (wassermanproductions.com), Apache-2.0.

## 2026-10-01: browser build for the AI Studio Suite
- Moved the audio fingerprint DSP from `src/main/audio.ts` to `src/shared/audioFingerprint.ts` unchanged; the desktop decoder imports it.
- Added `src/renderer/src/web/` (browser implementation of `SlateApi`: IndexedDB storage, file-input picking, canvas frame sampling, Web Audio decode) and `src/renderer/src/lib/mediaSrc.ts`.
- `ReferencesPanel.tsx` and `Studios.tsx`: image sources go through `mediaSrc()` (desktop still gets `file://` URLs).
- `src/renderer/index.html`: CSP allows `blob:` images and media.
- `src/renderer/src/main.tsx`: installs the browser adapter when `window.slate` is missing.
- `vite.web.config.ts`, `package.json`: `npm run build:web` builds the browser version into `dist-web/`.
```

- [ ] **Step 6: Verify desktop and web builds**

Run, in order:
```bash
npm run typecheck && npm test
npm run build:web && ls dist-web && grep -c '\./assets/' dist-web/index.html
ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm run build
git status --porcelain
```
Expected:
- typecheck is clean, and the full suite equals the baseline plus 20;
- `dist-web/index.html` exists and references `./assets/`;
- the electron-vite build succeeds;
- `git status --porcelain` lists only this task's files (`dist-web/` and `out/` are ignored).

- [ ] **Step 7: Commit**

```bash
git add src/renderer/src/web/adapter.ts src/renderer/src/main.tsx src/renderer/index.html vite.web.config.ts package.json .gitignore MODIFICATIONS.md tests/web-adapter.test.ts
git commit -m "feat(web): browser SlateApi on IndexedDB, and npm run build:web"
```

---

### Task 5: Credits row in the pill, and a "pill stays clear" check (suite)

**Files:**
- Modify: `packages/pill/src/pill.ts`, `packages/pill/src/pill.css`, `apps/home/src/App.tsx`, `tests/e2e/helpers.ts`, `tests/e2e/cork.spec.ts`, `tests/e2e/script.spec.ts`
- Test: `packages/pill/src/pill.test.ts`, `apps/home/src/App.test.tsx`, `tests/e2e/credits.spec.ts`

**Interfaces:**
- Consumes: `mountPill`, `hrefTo`, `PillTool` (Plan 1).
- Produces:
  - The pill menu ends with a separator and a `menuitem` link named `Credits`, pointing at `hrefTo(from, '/') + '#credits'`.
  - The home `<footer>` has `id="credits"`.
  - `tests/e2e/helpers.ts` exports `expectPillClear(page: Page): Promise<void>`. With the pill closed, it fails if the pill's box intersects any visible `button`, `a`, `input`, `select`, `textarea` or `[role="button"]` outside the pill.

- [ ] **Step 1: Branch**

```bash
git checkout feat/slate-web && git branch --show-current
```
The controller created `feat/slate-web` from `feat/suite-phase-0a` when committing this plan.

- [ ] **Step 2: Write the failing tests.** Append to `packages/pill/src/pill.test.ts`:

```ts
test('ends with a Credits link to the home credits', () => {
  const host = mountPill({ tools, pathname: '/script/' })
  const root = host.shadowRoot!
  root.querySelector('button')!.click()
  const items = [...root.querySelectorAll('[role="menuitem"]')]
  const last = items[items.length - 1] as HTMLAnchorElement
  expect(last.textContent).toBe('Credits')
  expect(last.getAttribute('href')).toBe('../#credits')
})
```

Append to `apps/home/src/App.test.tsx`:
```tsx
test('the credits footer is the #credits anchor target', () => {
  const { container } = render(<App tools={tools} />)
  expect(container.querySelector('footer#credits')).not.toBeNull()
})
```

`tests/e2e/credits.spec.ts`:
```ts
import { test, expect } from './fixtures'
import { watchErrors } from './helpers'

for (const path of ['/cork/', '/script/']) {
  test(`Credits in the pill leads from ${path} to the author credit`, async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto(path)
    const pill = page.locator('suite-pill')
    await pill.getByRole('button', { name: 'Suite' }).click()
    await pill.getByRole('menuitem', { name: 'Credits' }).click()
    await expect(page).toHaveURL(/\/#credits$/)
    await expect(page.locator('#credits')).toContainText('Sam Wasserman')
    await expect(page.locator('#credits')).toBeInViewport()
    expect(errors).toEqual([])
  })
}
```

- [ ] **Step 3: Run to verify failure**

Run: `npm test -w packages/pill; npm test -w apps/home`
Expected: the two new unit tests FAIL (no Credits item; no `#credits`).

- [ ] **Step 4: Implement**
  - In `mountPill`, after the loop over tools, append `const sep = doc.createElement('hr')` and a link: `textContent` `'Credits'`, `href` `hrefTo(from, '/') + '#credits'`, `role="menuitem"`. Arrow keys and Home/End include it automatically if they work over `a[role="menuitem"]`; confirm with the existing keyboard tests.
  - In `pill.css`, add `hr { border: 0; border-top: 1px solid var(--pill-border); margin: 4px 0; }`.
  - In `apps/home/src/App.tsx`, give the `<footer>` the attribute `id="credits"`. Change nothing else.

- [ ] **Step 5: Add the "pill stays clear" check.** Append to `tests/e2e/helpers.ts`:

```ts
import { expect } from '@playwright/test'

/** Fails if the closed suite pill overlaps any visible control of the tool underneath. */
export async function expectPillClear(page: Page): Promise<void> {
  const overlaps = await page.evaluate(() => {
    const host = document.querySelector('suite-pill')
    if (!host) return ['no suite-pill on the page']
    const pill = host.getBoundingClientRect()
    const hits: string[] = []
    for (const el of document.querySelectorAll<HTMLElement>('button, a, input, select, textarea, [role="button"]')) {
      if (host.contains(el)) continue
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0 || getComputedStyle(el).visibility === 'hidden') continue
      const intersects = r.left < pill.right && r.right > pill.left && r.top < pill.bottom && r.bottom > pill.top
      if (intersects) hits.push(`${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 40)}"`)
    }
    return hits
  })
  expect(overlaps, 'controls covered by the suite pill').toEqual([])
}
```

Change `import type { Page } from '@playwright/test'` at the top of helpers.ts to a value-and-type import if needed. Then call `await expectPillClear(page)` near the start of one existing test in each of `cork.spec.ts` and `script.spec.ts`, right after the page loads at 1280x800 (`await page.setViewportSize({ width: 1280, height: 800 })`).

- [ ] **Step 6: Verify**

Run: `npm test -w packages/pill && npm test -w apps/home && npm run build:local && npm run test:e2e`
Expected: pill 13, home 4, e2e all passing (previous 14 plus 4 Credits runs) in Chromium and WebKit. If `expectPillClear` finds an overlap on Cork Board or ScriptBreak, report it with the element list. Don't move the pill without a ruling from the controller.

- [ ] **Step 7: Commit**

```bash
git add packages/pill apps/home/src tests/e2e
git commit -m "feat(pill): add a Credits row that leads to the author credit on the home"
```

---

### Task 6: Enable Slate in the suite, with browser smoke tests (suite)

**Files:**
- Modify: `tools.json` (slate `enabled: true`), `suite.lock.json` (slate sha)
- Create:
  - `tests/fixtures/clip.mp4`, `tests/fixtures/clip.webm`, `tests/fixtures/tone.wav`, `tests/fixtures/still.png`
  - `tests/e2e/slate.spec.ts`

**Interfaces:**
- Consumes: the fork branch `web/browser-adapter` (Tasks 1 to 4) with `npm run build:web` writing `dist-web/`; `expectPillClear` and the stubbed fixtures from Task 5 and Plan 1.
- Produces: `dist/slate/` in `npm run build:local`; Slate e2e passing in both engines.

- [ ] **Step 1: Make the fixtures** (from the suite root):

```bash
ffmpeg -hide_banner -loglevel error -y -f lavfi -i testsrc=size=320x180:rate=24:duration=6 -c:v libx264 -pix_fmt yuv420p -movflags +faststart tests/fixtures/clip.mp4
ffmpeg -hide_banner -loglevel error -y -f lavfi -i testsrc=size=320x180:rate=24:duration=6 -c:v libvpx -b:v 300k tests/fixtures/clip.webm
ffmpeg -hide_banner -loglevel error -y -f lavfi -i sine=frequency=220:duration=4 -ac 1 -ar 44100 tests/fixtures/tone.wav
ffmpeg -hide_banner -loglevel error -y -f lavfi -i testsrc=size=320x180 -frames:v 1 tests/fixtures/still.png
ls -la tests/fixtures
```
Expected: the four files exist, each under 200 KB.

- [ ] **Step 2: Enable Slate.** In `tools.json` set the slate entry's `"enabled": true`; keep `"pillCorner": "bottom-left"` for now. In `suite.lock.json` set `slate.sha` to `git -C forks/slate rev-parse web/browser-adapter`. `npm run pin` will refuse until it is pushed; local builds use `forks/` anyway. The controller re-pins after pushing.

Run: `npm test`
Expected: registry tests pass.

- [ ] **Step 3: Write the e2e** `tests/e2e/slate.spec.ts`:

```ts
import { test, expect } from './fixtures'
import { watchErrors, expectPillClear } from './helpers'

const clipFor = (browserName: string) => (browserName === 'chromium' ? 'tests/fixtures/clip.webm' : 'tests/fixtures/clip.mp4')

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  // Capture clipboard writes so the export check works in both engines.
  await page.addInitScript(() => {
    ;(window as unknown as { __copied: string[] }).__copied = []
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (t: string) => { (window as unknown as { __copied: string[] }).__copied.push(t) } },
    })
  })
})

test('Slate creates a project that survives a reload, and the pill stays clear', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/slate/')
  await expectPillClear(page)
  await page.getByPlaceholder('New project title — e.g. Night Market').fill('Smoke Market')
  await page.getByRole('button', { name: 'Create Project' }).click()
  await page.reload()
  await expect(page.getByText('Smoke Market').first()).toBeVisible()
  expect(errors).toEqual([])
})

test('Slate imports an image and a clip as references and shows their frames', async ({ page, browserName }) => {
  const errors = watchErrors(page)
  await page.goto('/slate/')
  await page.getByPlaceholder('New project title — e.g. Night Market').fill('Refs Test')
  await page.getByRole('button', { name: 'Create Project' }).click()
  await page.getByRole('button', { name: 'Refs', exact: true }).click()
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: '+ Add images or clips' }).click()
  await (await chooser).setFiles(['tests/fixtures/still.png', clipFor(browserName)])
  // still.png is 1 frame; a 6 s clip sampled every 2 s from 0.5 s gives 3 frames.
  await expect(page.locator('img[src^="blob:"]')).toHaveCount(4, { timeout: 20_000 })
  await page.reload()
  await page.getByText('Refs Test').first().click()
  await page.getByRole('button', { name: 'Refs', exact: true }).click()
  await expect(page.locator('img[src^="blob:"]')).toHaveCount(4, { timeout: 20_000 })
  expect(errors).toEqual([])
})

test('Slate copies a compiled prompt (clipboard export)', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/slate/')
  await page.getByPlaceholder('New project title — e.g. Night Market').fill('Copy Test')
  await page.getByRole('button', { name: 'Create Project' }).click()
  await page.getByRole('button', { name: 'Deliver', exact: true }).click()
  await page.getByRole('button', { name: 'Copy' }).first().click()
  const copied = await page.evaluate(() => (window as unknown as { __copied: string[] }).__copied)
  expect(copied.length).toBeGreaterThan(0)
  expect(errors).toEqual([])
})
```

Selector notes:
- **Project titles:** labels come from Slate's own code (`Home.tsx`, `RightRail.tsx` tabs `Refs` and `Deliver`, `ReferencesPanel.tsx`). If the project list shows titles differently after reload, use the `.home-project-name` text.
- **New projects with no shot:** if a new project has no shot and Deliver shows no Copy button, create a shot through the Navigator's "New scene" control first. Keep the assertion that a copy happened.
- **Image counts:** `img[src^="blob:"]` counts every rendered frame thumbnail. If the References panel renders each frame twice (list and detail), assert the count Slate actually renders for 1 image + 3 frames, and explain it in the report.

- [ ] **Step 4: Run**

Run: `npm run build:local && npm run test:e2e`
Expected: all tests pass in Chromium and WebKit: the previous 18 plus 6 Slate runs.

If WebKit can't decode `clip.mp4` or Chromium can't decode `clip.webm`, the error comes from `extractFrames` as "This video could not be decoded in the browser." In that case swap which engine gets which fixture and note it in the report.

Then add an audio check. Open the Sound department from the Studios tab, the screen that renders `SoundDept.tsx`. Use its "pick audio" control with `tests/fixtures/tone.wav` through the file chooser, and assert a fingerprint value renders, for example a duration near 4 s. Do this only if the control is reachable in two clicks. Otherwise report the path you found, and the controller will rule.

- [ ] **Step 5: Look at it.** With `npm run serve` running, front the Browser pane tab, set 1440x900, open `http://127.0.0.1:4170/slate/` and screenshot the home, a project with references, and the pill open. Check that the pill doesn't cover Slate's controls. If it does, set `"pillCorner": "bottom-right"` for slate and re-run the e2e. Kill the server.

- [ ] **Step 6: Commit**

```bash
git add tools.json suite.lock.json tests/fixtures tests/e2e/slate.spec.ts
git commit -m "feat: enable Slate in the suite with browser smoke tests"
```

---

### Task 7: Ship (controller, after Nick's yes)

Implementers do not run this task. The controller runs it in the main session, because pushes need Nick's explicit approval.

- [ ] **Step 1:** Preflight both repos: `git log --format=%ae | sort -u` shows only the noreply address.
- [ ] **Step 2:** Push the fork branch, then open its PR: `git -C forks/slate push -u origin web/browser-adapter`, then `gh pr create --repo weeeha/slate --base main --head web/browser-adapter` with a short description, no em dashes.
- [ ] **Step 3:** `npm run pin`. It must show `slate 3bf1dfe -> <new sha>` and nothing else. Commit `suite.lock.json`, then push `feat/slate-web`.
- [ ] **Step 4:** Wait for the Vercel preview of `feat/slate-web`. Run `npm run test:e2e` against it with `SUITE_URL` and the bypass secret held only in the shell. Expected: everything passes in both engines.
- [ ] **Step 5:** Open the suite PR from `feat/slate-web`, stacked on PR #1 (base `feat/suite-phase-0a` until #1 merges). Send Nick the preview link to check Slate in Safari.

---

## Acceptance (Plan 2)

- [ ] In `forks/slate`: `npm run typecheck`, `npm test` (baseline + 20), `npm run build:web`, and `npm run build` (desktop) all pass; `git diff main --stat` touches only the files in this plan.
- [ ] Suite: `npm test`, pill 13, home 4, and `npm run test:e2e` pass locally and against the Vercel preview, in Chromium and WebKit.
- [ ] `/slate/`: a project survives a reload. Image and clip references show frames after a reload. Copy reaches the clipboard. Desktop-only buttons show the "Desktop app" message instead of an error.
- [ ] The pill shows Credits in Cork Board, ScriptBreak and Slate, and it lands on the home credit to Sam Wasserman. The pill covers no control in any of the three tools.
- [ ] Nick has looked at `/slate/` in Safari.
