# Beat Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Playable three-stage skill-driven beat production using the supplied drums.

**Architecture:** Pure catalog and durable production state, Web Audio preview, stable FT/shop views, host-owned work camera and time. Keep existing v1 projects and user edits.

**Tech Stack:** Native ES modules, Web Audio, existing Three.js scene, node:test and Playwright.

**Spec:** docs/superpowers/specs/2026-10-09-beat-production.md

## Global Constraints

- Work on master is explicitly authorized; no commits that scoop pre-existing changes.
- Preserve stems in place. All build evidence on D:.
- No player BPM/track editing, real piracy/malware/payment or licensing claims.
- User explicitly waives approval pauses; questions deferred until delivery.

## Review Focus

- Reload during partial work must not reroll assets or award practice twice.
- Late audio decode after closing must not start sound.
- Duplicate acquisitions and damaged saves must not produce money or unsafe URLs.
- Hunger interruption must preserve elapsed work and allow resumption after food.
- FT input focus and scroll must survive host clock refreshes.

### Task 1: Catalog and durable production model

**Files:** Create src/beat-catalog.js, src/beat-production.js, test/beat-production.test.js; modify src/virtual-pc-state.js.

**Interfaces:** normalizeMusic(value), normalizeBeat(value), createBeat(state,{id,name,genre,assetId},skills,random), startBeatStage(state,id,sliders,skills), advanceBeatWork(state,minutes), acquireDrum(state,id,method,random), restoreMusicNeeds(state,kind,minutes). All actions return {state,ok,reason} or {state,minutes,finished,blocked}.

- [ ] Write tests: free bank unlock40, selected purchased drum identity, no BPM input, sequential stages, partial resume/reload/idempotent reward, duplicate buy/no reroll, invalid assets, nutrition recovery, preserved v1 state.
- [ ] Run `node --test test/beat-production.test.js`; Expected: FAIL missing module.
- [ ] Implement the pure model and PC normalization; fixed configurable balance with six documented genre profiles, only boom-bap playable.
- [ ] Run same command; Expected: PASS. Leave changes uncommitted to preserve mixed baseline.

### Task 2: Deterministic layered audio

**Files:** Create src/beat-audio.js, test/beat-audio.test.js.

**Interfaces:** BeatAudio({contextFactory,fetchFn}), play({drumId,stage}), stop(), dispose(); returns Promise<boolean>, error text property. Uses catalog IDs only.

- [ ] Write tests for primitive deterministic output, same-clock layering, exact 90BPM loop length, late decode cancellation, missing file and disposal.
- [ ] Run `node --test test/beat-audio.test.js`; Expected: FAIL missing module.
- [ ] Implement cached decoded user drums plus authored low-quality A-minor placeholder layer, bounded loop, cancellation generation and safe error.
- [ ] Run same command; Expected: PASS.

### Task 3: FT workflow and local sample market

**Files:** Create src/beat-studio-view.js, src/beat-market-view.js, test/beat-ui.test.js; modify virtual-pc-ui.js, virtual-pc-catalog.js, virtual-pc-explorer-view.js, underweb-view.js, desktop-apps.css, test/desktop-rework.test.js.

**Interfaces:** mountBeatStudio(root,{getState,getMetadata,onChange,onWork,audio}) -> {update,dispose}; createBeatMarket(document,{getState,onChange,audio,navigate,ripline}) -> element. Production uses Task1 state, playback Task2 audio.

- [ ] Write UI tests for name-only start, three sliders, saved project opening, store acquire, clock refresh preserving inputs; update obsolete visual-only assertion.
- [ ] Run `node --test test/beat-ui.test.js test/desktop-rework.test.js`; Expected: FAIL new workflow missing.
- [ ] Implement stable views, Underweb routes/bookmarks/search, RIPLINE install and safe simulation, Explorer v2 opening; maintain original FT layout.
- [ ] Run same command; Expected: PASS.

### Task 4: Work scene, game time and acceptance

**Files:** Modify virtual-pc-transition.js, virtual-pc-lifecycle.js, apartment-app.js, apartment-v3-scene.js, apartment-v3-time.js; create test/beat-work-scene.test.js, tools/verify-beat-production.mjs, docs/beat-production.md; update relevant tests and client revision.

**Interfaces:** PcLifecycle.work(), finishWork({blocked}), transition work-out/working/work-in; pcActorVisible supports work pose. Host calls advanceBeatWork only while working; clock receives returned minutes exactly once.

- [ ] Write transition tests for exit/work/reenter, blocked room return, hidden pause; run `node --test test/beat-work-scene.test.js`; Expected: FAIL work undefined.
- [ ] Implement work scene with faded camera cuts, sped-up seated avatar, need restoration on home actions, partial persistence, no 120-minute penalty just for leaving PC.
- [ ] Run full `node --test`; Expected: all PASS. Run Playwright full production/market/reload/interrupt at wide and narrow viewports; Expected: no console errors, screenshots inspected.
- [ ] Record genre slider table and tomorrow questions in docs/beat-production.md. Fresh whole-change review, fix important findings RED→GREEN, final full suite. Leave uncommitted, no publish.
