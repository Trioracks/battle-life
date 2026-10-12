# Sloboda Software Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Самостоятельная ретро-ОС, две параллельные загрузки и удобная фоновая установка.

**Architecture:** Central OS identity, a pure transfer scheduler and existing DOM mounts. Installation state is independent of transfer state; consuming finish produces a one-shot app-open action.

**Tech Stack:** ES modules, SVG/CSS, Node.js tests, simulated game clock.

**Spec:** `docs/superpowers/specs/2026-10-12-sloboda-workflow-design.md`, shell, software websites, downloads/installations.

## Global Constraints

- Inherit `2026-10-12-sloboda-track-patch.md`; create SVG through apply_patch, no copied brand resources.
- Слобода OS: steel blue-gray frames, warm panels, amber accent; not an XP copy or another Linux distribution.
- Aggregate bandwidth <=37KB/s; retain existing per-minute rate cycle `[24,31,37,28,35,26]`.
- Client/notebook installation10 seconds, FT30. Installer and installed software occupy separate disk allocations; uninstall keeps projects and installer.

## Review Focus

- Accessible labels, boot and 3D monitor do not keep Windows HP branding — C1.
- Legacy paused downloads and clock rollback award no bytes — C2.
- Small download finishes inside a large interval; freed bandwidth is immediately redistributed — C2.
- Finish while player reads forum or leaves never forces camera — C3.
- Duplicate setup/Done never installs or opens twice — C3.

## Task 1 C1 Original desktop identity

**Files:** create `src/pc-identity.js`, `test/sloboda-shell.test.js`; modify `src/virtual-pc-shell.js`, `src/virtual-pc-presentation.js`, `src/virtual-pc-system-windows.js`, `src/virtual-pc-explorer.js`, `src/virtual-pc-icons.js`, `src/apartment-v3-computer.js`, `virtual-pc.css`; replace relevant authored SVGs in `assets/ui/virtual-pc/icons/` (start/computer/documents/folder/disk/settings/display/power/window controls).

**Interfaces:** `PC_IDENTITY={name:'Слобода OS',systemLabel:'Система',systemAddress:'C:\\System'}`. Keep createPcIcon signature/semantic IDs; retain internal EXPLORER_PATHS.windows key with new visible label/address. Keep original synthesized sound assets.

- [ ] Tests `identity in shell and transitions`, `system alias preserved`, `window controls preserved`: shell/boot/about/shutdown/monitor use Слобода OS, no Windows HP/XP; `assert.equal(EXPLORER_PATHS.windows.label,'Система')`; drag/focus/minimize/maximize/close retain behavior.
- [ ] Run `node --test test/sloboda-shell.test.js test/virtual-pc-shell.test.js test/virtual-pc-presentation.test.js test/virtual-pc-explorer.test.js`; require RED.
- [ ] Implement identity and component CSS, replacing old skin rules rather than layering a second full skin. Replace four-color flag with original one/two-color geometric mark, rectangular “Слобода” menu button and distinct boot composition. Keep desktop/explorer workflows and keyboard controls. Do not rename genuine Windows references in historical news.
- [ ] Rerun to PASS; visually inspect desktop/menu/installer/browser/FT/notebook/explorer/boot/shutdown/3D monitor. Missing brand text alone is not evidence of a distinct design.
- [ ] Commit `feat: replace desktop branding with Sloboda OS`.

## Task 2 C2 Transfer collection and shared bandwidth

**Files:** create `src/pc-transfer-runtime.js`, `test/pc-transfer-runtime.test.js`; modify `src/pc-software.js`, `src/virtual-pc-runtime.js`, `src/virtual-pc-state.js`, `src/pc-software-view.js`, `src/virtual-pc-ui.js`; tests `test/pc-software.test.js`, `test/virtual-pc-runtime.test.js`, `test/torrent-routing.test.js`.

**Interfaces:** `software.transferVersion=2`, `software.transfers={client?:Transfer,ft?:Transfer,notebook?:Transfer}`; Transfer={appId,paused,error}. Bytes live only in software[appId].receivedBytes; clock stays state.lastGameMinute. pauseTransfer/resumeTransfer/cancelTransfer gain appId, retaining `{state,ok,reason}`; missing id allowed only with exactly one task. `advanceTransfers(state,fromMinute,toMinute)->{state,advancedBytes}`; `downloadPresentation(state,appId='ft')` returns a row. state.download remains a derived legacy FT view, never a second source of truth.

- [ ] Tests `fair share`, `pause releases capacity`, `completion inside delta`, `legacy migration`, `disk aggregate`: first minute two unfinished tasks each receive720000 bytes, single task1440000. Assert long-interval and split-interval states match within1 byte; aggregate never exceeds disk free. Saved pause/bytes survive JSON.
- [ ] Run `node --test test/pc-transfer-runtime.test.js test/pc-software.test.js test/virtual-pc-runtime.test.js test/torrent-routing.test.js`; require RED.
- [ ] Migrate one software.task preserving receivedBytes, pause/error and time without repeated credit. Backup `battle-life-virtual-pc-v1-before-parallel-transfers` before rewrite. Segment time by bandwidth change/file completion/disk exhaustion, divide equally among active tasks. Power off/rollback/first tick after load only reset time. Completed tasks disappear but artifacts remain; repeated metadata is idempotent. Replace all src software.task reads, including old FT wrappers; no shadow task.
- [ ] Rerun to PASS; selected-row pause/resume/cancel, unknown id, both paused, midnight, disk full, large multi-day intervals without per-frame iteration, load with no offline bonus. Compute ETA using the same scheduler on a copy, accounting for another transfer completing.
- [ ] Commit `feat: share torrent bandwidth across downloads`.

## Task 3 C3 Installer controls and lifecycle

**Files:** modify `src/pc-software.js`, `src/pc-software-view.js`, `src/virtual-pc-ui.js`, `src/virtual-pc-explorer.js`, `src/virtual-pc-explorer-view.js`, `src/pc-software-catalog.js`; tests `test/pc-software-ui.test.js`, `test/virtual-pc-explorer.test.js`, `test/virtual-pc-lifecycle.test.js`.

**Interfaces:** installer gains openAfterInstall:boolean default true. Add `setInstallerOpenAfter(state,value)->Result`, `uninstallSoftware(state,appId)->Result`; finish advanceInstaller returns openAppId:string|null only once. SOFTWARE gains iconId and desktopAppId. Persist owner unchanged.

- [ ] Tests `selection toolbar install`, `double click setup`, `finish opens once`, `uninstall preserves documents`: `assert.equal(secondFinish.openAppId,null)`; project list and installer bytes unchanged after uninstall. Each wizard has its own app icon; unchecked option opens nothing.
- [ ] Run `node --test test/pc-software-ui.test.js test/virtual-pc-explorer.test.js test/virtual-pc-lifecycle.test.js`; require RED.
- [ ] Selected torrent/explorer file drives top Install/Uninstall action; double-click opens wizard. Remove separate bottom per-program launch buttons. Show icon and checkbox at finish, open once on Done without forcing camera. Uninstall confirmation closes only that app, retains projects/archive; pause active beat/text safely through A1, never destroy an unfinished vocal job (explain that it must first be completed). Downloads continue while other windows/room active. Metadata opens client; only the client bootstrap is direct.
- [ ] Rerun to PASS; real10/30-second progress, forum use/leave, disk error, cancelled wizard, repeated finish after reload, keyboard checkbox. If away, prepare app on virtual desktop, do not return player to PC.
- [ ] Commit `feat: improve installer and app lifecycle controls`.

## Task 4 C4 Distinct software tracker

**Files:** modify `src/pc-software-view.js`, `underweb-world.css`; extend `test/pc-software-ui.test.js`, `test/torrent-routing.test.js`.

**Interfaces:** keep softwareForum(document,{topic,state,navigate,onAction,message}) and routes; consume PC_IDENTITY, SOFTWARE, createPcIcon instead of duplicated metadata.

- [ ] Tests `software category already open`, `three release pages`: client/FT/notebook each have icon, correct download/install MB and working action, with no prerequisite category click. Existing direct URLs still resolve.
- [ ] Run `node --test test/pc-software-ui.test.js test/torrent-routing.test.js`; require RED for new structure.
- [ ] Add left categories and immediate available-software list, individual release poster using original SVG/CSS, description, requirements, sizes and actions. Distinguish from discussion forum; do not copy RuTracker mark or create nonfunctional clickable categories.
- [ ] Rerun to PASS; screenshots of all three releases at800×600 and1280×900, keyboard access to download/client actions.
- [ ] Commit `feat: give software releases a distinct tracker design`.
