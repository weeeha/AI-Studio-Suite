# AI Studio Suite

Personal fork of the Wasserman Productions AI-filmmaking tools, restyled on the Minimal Design System (`@weeeha/ui`) and tailored to Nick's workflow.

**Status:** exploration · **Live:** none yet (local only) · **Started:** 2026-09-30

## Repo map

| Tool | Fork | Upstream | Shell | Branch |
| --- | --- | --- | --- | --- |
| Blockout | [weeeha/blockout](https://github.com/weeeha/blockout) | [wassermanproductions/blockout](https://github.com/wassermanproductions/blockout) | Electron + React + three.js | `main` |
| ScriptBreak | [weeeha/scriptbreak](https://github.com/weeeha/scriptbreak) | [wassermanproductions/scriptbreak](https://github.com/wassermanproductions/scriptbreak) | Tauri, single `src/index.html` | `master` |
| Storyboard Reference Studio | [weeeha/storyboard-reference-studio](https://github.com/weeeha/storyboard-reference-studio) | [wassermanproductions/storyboard-reference-studio](https://github.com/wassermanproductions/storyboard-reference-studio) | Electron + React | `main` |
| Slate | [weeeha/slate](https://github.com/weeeha/slate) | [wassermanproductions/slate](https://github.com/wassermanproductions/slate) | Electron + React (has a web Vite config) | `main` |
| Motion Previs Studio | [weeeha/motion-previs-studio](https://github.com/weeeha/motion-previs-studio) | [wassermanproductions/motion-previs-studio](https://github.com/wassermanproductions/motion-previs-studio) | Electron + React + three.js | `main` |
| Cork Board | [weeeha/cork-board](https://github.com/weeeha/cork-board) | [wassermanproductions/cork-board](https://github.com/wassermanproductions/cork-board) | Electron + vanilla JS (Vite) | `main` |

## Local layout

- `forks/<tool>` holds a local clone of each fork, with `origin` = weeeha fork and `upstream` = wassermanproductions. It is gitignored here; each fork keeps its own history and PRs.
- Commit email for every repo is `1083934+weeeha@users.noreply.github.com` (set per repo with `git config --local`).

## Attribution

All six tools are Apache-2.0, by Sam Wasserman / [Wasserman Productions](https://wassermanproductions.com). Each fork keeps its `LICENSE`, `NOTICE` and third-party notices, and records changes in its own modifications log. If these tools help you, the author asks for a donation at [ko-fi.com/samwasserman](https://ko-fi.com/samwasserman).
