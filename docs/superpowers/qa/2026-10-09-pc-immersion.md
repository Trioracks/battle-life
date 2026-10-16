# PC immersion — verification record

Scope: first stage of the approved 2026-10-09 plan. Underweb and original visual-only FT Studio are still separate next stages; no new music workflow was introduced here.

Work was performed on master in D:/Project/Battle with explicit user approval. Pre-existing dirty user files and untracked artwork were not staged or overwritten.

## Delivered implementation

- 16 GB disk with 14 GB system reserve, stable live usage meter and migration-compatible saves. Duplicate Documents shortcut removed; folders/projects retained.
- One 11-second cold-boot controller, 2.4-second warm entry and reverse camera route. Shutdown persists off immediately after the existing dirty-project guard, then presents shutdown/fade/return.
- Unique live glass and power LED, recessed CRT rails, corrected keyboard/mouse/microphone/pot/hood geometry. Eight dark-monitor background renders; geometry audit has zero errors.
- Source-frame crossfade to live 3D camera, glass-derived endpoint framing, glTF-oriented CanvasTexture and no hidden-room rendering under opaque desktop.
- Separate procedural BIOS/click audio bus and four filtered-noise indoor footsteps. Original XP startup/shutdown recordings are NOT present; manifest explicitly marks these unavailable. No unverified sound files or OS installers were downloaded. Human listening remains unperformed.

## Build and recovery

- Stage: D:/Codex/Builds/Battle/pc-immersion-20261009-01 (assets, editable source, build.log, refresh.log).
- Blender 4.5.9, existing D: installation. Avatar source/rig copied unchanged, not regenerated. Computer local axes/UVs normalized in existing-source refresh; front shell exported separately.
- Validator: success, 17 required files, eight light-state PNGs, no errors.
- Installed using tools/install-apartment-v3.ps1 after staged tests. Backup: D:/Codex/Builds/Battle/pc-immersion-backup-20261009-01. Prior resources remain recoverable there.
- New cache, temporary data, generated output and QA media are on D:.

## Test evidence

- Baseline: 399/399.
- Staged suite: 426/426 before browser refinements.
- Installed suite after refinements: 428/428 (installed-suite.log).
- Final suite after review corrections: 431/431 (final-suite.log).
- Per-task RED/GREEN logs, review, execution ledger and final verification are archived at D:/Codex/Builds/Battle/pc-immersion-20261009-01/execution-record. Only this plan's scratch directory is removed after archival; sibling plans remain untouched.
- Browser run 1 found flipped screen text; fixed with a failing orientation regression test. Hidden 3D rendering was also eliminated. Run 1 was stopped, not reported as a pass.
- Browser run 2: D:/Codex/Builds/Battle/pc-immersion-qa-20261009-02. Passed all scenarios, zero page errors or unexpected missing assets. Isolated storage; player profile untouched. Includes cold/warm, resize mid-zoom, both desktop widths, disk meter, background sleep download, dirty guards, reload during shutdown, denied storage, 3D restoration and asset retry with WebAudio disabled. Recording and 21 PNG captures retained on D:.
- Inspected real screenshots: seated BIOS, portrait zoom, boot/loading/welcome, desktop and Explorer at both widths, shutdown and restored 3D view. Original flipped portrait image was replaced in run 2 and re-inspected with upright text.
- Post-review browser run 3: D:/Codex/Builds/Battle/pc-immersion-qa-20261009-03. All full acceptance scenarios passed again, zero page errors or unexpected missing assets; upright portrait BIOS inspected. Focused pending/focus/persisted-page regressions also passed (final-browser-green.log).

## Execution rulings

1. Code for Tasks 4–6 advanced during Blender rendering, but remained uncommitted until staged verification. Risk: rework before installation.
2. Pot support means the burner grate at 1.008m, not the enamel below. Risk: a further height adjustment if a different support is intended.
3. Front wall/ceiling are separate static groups hidden only for cutaway entry. Risk: static asset regeneration if the grouping is unsuitable.
4. Host orchestration is a separate lifecycle module to make stale-promise and restoration cases testable. Risk: reintegration of one module if this boundary changes.
5. Underweb search/navigation and the new visual FT Studio remain next stages, not delivered by this plan. Risk: revise next-stage scope.
6. Existing music and user dirty files stay outside changed-code review; music/guard regressions still run. Risk: a separate investigation if an existing behavior is wrong.
7. Original XP fidelity and subjective audio quality remain explicitly unaccepted. Risk: replace audio and perform a listening pass.

## Final review

Independent read-only review of 23ed5c5..1c6dfe1 found four Important issues and no Critical issues. One author fix pass added RED→GREEN regressions for cancelled approach, invisible pending desktop, focus-before-unlock and disposal on persisted pagehide. Full suite: 431/431. Focused Chromium regression passed with zero page errors; persisted PageTransitionEvents exercise BFCache handler behavior, not automatic browser BFCache eligibility. No second review.

Deferred minor: PC imports in apartment-v3-runtime.js and apartment-v3-new-game.js retain rev17; no current changed-capacity regression was found. Align at the next revision bump.

Final full browser rerun passed. No merge, push or publication is requested; retain master in place as explicitly chosen by the user. Current local preview: http://127.0.0.1:4173/?rev=18. Existing powered-on saves use warm entry; to see the full cold boot, shut the PC down through Start first or use a new game.
