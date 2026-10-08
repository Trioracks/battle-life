# Virtual PC and FT Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the apartment computer a persistent fictional desktop where the player downloads FT Studio, creates an audible beat, saves it to virtual Projects, and reopens it.

**Architecture:** A pure virtual-PC state/runtime layer owns virtual disk, game-time download progress, and persistence. A project/audio layer owns serializable sequencer data and synthesized playback. A DOM controller renders Sloboda Desk 96 over the active apartment and an integration bridge feeds it the existing `ApartmentTime` without changing that time model.

**Tech Stack:** Native ES modules, DOM/CSS, Web Audio API, `node:test`, localStorage, existing Three.js apartment application.

**Spec:** `docs/superpowers/specs/2026-10-08-virtual-pc-ft-studio-design.md`

## Global Constraints

- `ApartmentTime` is the only source of in-game time; no wall-clock or second world timer.
- All virtual disk, torrent, and browser data stays in browser game state; never read or write real `C:` or network resources.
- Use the exact application spelling `torent`.
- FT Studio download is 800,000,000 bytes over 360 game minutes; installed FT Studio occupies 800 MB once and leaves 700 MB from a 1,500 MB disk.
- Four audible instruments, 16 steps, eight bars, BPM 72–150, Projects at 2 MB each.
- Preserve pre-existing dirty files; stage only files owned by this feature for any task commit.
- Do not restore 2.5D or replace the active `apartment-app.js` entry point with `main.js`.

## Review Focus

- A clock crossing midnight must progress an active download exactly once from absolute game minutes; cover in Task 2.
- An installed FT Studio package must never occupy the completed payload plus its installed size; cover in Task 1.
- Closing/reloading the browser must not award elapsed real-world download time; cover in Task 2.
- An edited studio project must not be silently discarded by closing, leaving, or power-off; cover in Task 4 and manual QA in Task 6.
- Audio creation failure or a blocked AudioContext must leave the project state usable and savable; cover in Task 3.

---

### Task 1: Virtual disk and persistent PC state

**Files:**
- Create: `src/virtual-pc-state.js`
- Test: `test/virtual-pc-state.test.js`

**Interfaces:**
- Produces: `VIRTUAL_PC_STORAGE_KEY`, `createVirtualPcState(seed?)`, `loadVirtualPcState(storage)`, `saveVirtualPcState(storage, state)`, `diskUsage(state)`, `setPcPower(state, power)`, `setWallpaper(state, id)`, `startFtDownload(state)`, `cancelFtDownload(state)`, `markFtDownloadComplete(state)`, `installFtStudio(state)`, and `saveStudioProject(state, project)`.
- Consumes: serializable project records shaped by Task 3.

- [ ] **Step 1: Write failing virtual-state tests**

Test default 1,500 MB free state, corrupt/blocked storage fallback, wallpaper persistence, unfinished-download cancellation, 800 MB completion/install accounting, 700 MB remaining after installation, and 2 MB per saved project.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test test/virtual-pc-state.test.js`  
Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the immutable state transitions in `src/virtual-pc-state.js`**

Use a versioned normalized snapshot with power (`off`/`on`), wallpaper id, download state (`idle`/`downloading`/`ready-to-install`/`installed`), received bytes, projects, and optional draft. Reject invalid state without mutating the caller's object. Disk accounting counts either partial payload or the installed package, never both.

- [ ] **Step 4: Run focused tests to verify they pass**

Run: `node --test test/virtual-pc-state.test.js`  
Expected: PASS.

- [ ] **Step 5: Commit only Task 1 files**

Run: `git add src/virtual-pc-state.js test/virtual-pc-state.test.js && git commit -m "feat: add virtual pc state"`  
Expected: a commit containing only the two listed files; do not stage pre-existing dirty files.

### Task 2: Game-time download runtime and fictional catalog

**Files:**
- Create: `src/virtual-pc-runtime.js`
- Create: `src/virtual-pc-catalog.js`
- Test: `test/virtual-pc-runtime.test.js`
- Test: `test/virtual-pc-catalog.test.js`

**Interfaces:**
- Consumes: Task 1 virtual-PC snapshot and a clock `{day:number, minutes:number}`.
- Produces: `advanceVirtualPc(state, clock)` returning `{state, advancedBytes}`, `gameMinuteStamp(clock)`, `downloadPresentation(state)`, `desktopApps(state)`, `resolveUnderweb(address)`, `BATTLE_BRIEFS`, and `WALLPAPERS`.

- [ ] **Step 1: Write failing runtime and catalog tests**

Assert exact six-hour completion, no progression while off, no progression without advancing game time, midnight rollover, stable repeat reconciliation, rounded 37 KB/s presentation, original desktop apps, three battle briefs, and an error result for unknown Underweb addresses.

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `node --test test/virtual-pc-runtime.test.js test/virtual-pc-catalog.test.js`  
Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement time reconciliation and fixed catalog**

Convert `{day, minutes}` to a monotonic game-minute stamp. Store the last reconciled stamp in PC state, advance only a powered `downloading` state, clamp at 800,000,000 bytes, and never infer elapsed time on load. Keep Underweb local: a battle route/search result resolves to one of three static briefs and every other route is a fiction-only error page.

- [ ] **Step 4: Run focused tests to verify they pass**

Run: `node --test test/virtual-pc-runtime.test.js test/virtual-pc-catalog.test.js`  
Expected: PASS.

- [ ] **Step 5: Commit only Task 2 files**

Run: `git add src/virtual-pc-runtime.js src/virtual-pc-catalog.js test/virtual-pc-runtime.test.js test/virtual-pc-catalog.test.js && git commit -m "feat: advance virtual pc downloads from game time"`

### Task 3: FT Studio project model and synthesized playback

**Files:**
- Create: `src/ft-studio-project.js`
- Create: `src/ft-studio-audio.js`
- Test: `test/ft-studio-project.test.js`
- Test: `test/ft-studio-audio.test.js`

**Interfaces:**
- Consumes: catalog brief ids from Task 2.
- Produces: `createStudioProject(input)`, `normalizeStudioProject(value)`, `setStudioStep(project, trackId, step, enabled)`, `setArrangementCell(project, trackId, bar, enabled)`, `setTrackGain(project, trackId, gain)`, `setBpm(project, bpm)`, `projectFingerprint(project)`, and `FtStudioAudio` with `play(project)`, `stop()`, `dispose()`.

- [ ] **Step 1: Write failing project and fake-audio tests**

Cover required name/brief validation, 32-character maximum, four named tracks, 16 steps, eight bars, BPM clamping, immutable edits, complete serialization/reopen equality, and AudioContext failure that is reported without changing the project. Use a fake AudioContext to prove the four track paths schedule different event frequencies.

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `node --test test/ft-studio-project.test.js test/ft-studio-audio.test.js`  
Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement the model and Web Audio adapter**

Use a serialized object with id, name, battle id, BPM, four 16-cell patterns, four eight-bar lane masks, and four gains. The audio adapter may synthesize kick/snare/hat/bass with oscillators and short envelopes; it must only start after an explicit UI gesture, schedule from BPM, and stop all timers/nodes on `stop` or `dispose`.

- [ ] **Step 4: Run focused tests to verify they pass**

Run: `node --test test/ft-studio-project.test.js test/ft-studio-audio.test.js`  
Expected: PASS.

- [ ] **Step 5: Commit only Task 3 files**

Run: `git add src/ft-studio-project.js src/ft-studio-audio.js test/ft-studio-project.test.js test/ft-studio-audio.test.js && git commit -m "feat: add ft studio project and audio model"`

### Task 4: Virtual PC window controller and original visual assets

**Files:**
- Create: `src/virtual-pc-ui.js`
- Create: `virtual-pc.css`
- Create: `assets/ui/virtual-pc/wallpaper-courtyard.png`
- Create: `assets/ui/virtual-pc/wallpaper-factory.png`
- Create: `assets/ui/virtual-pc/wallpaper-room.png`
- Test: `test/virtual-pc-ui.test.js`

**Interfaces:**
- Consumes: Task 1 state, Task 2 catalog/presentation, Task 3 project actions, and host callbacks `onPersist`, `onLeave`, `onShutdown`, `onOpenProject`, `onSaveProject`.
- Produces: `mountVirtualPc(root, callbacks)` with `boot(state)`, `showDesktop(state)`, `render(state)`, `open(appId)`, `closeWindow()`, and `dispose()`.

- [ ] **Step 1: Generate the three original wallpapers and add their asset paths**

Use the image-generation workflow for low-resolution PS1-style 4:3 scenes: night courtyard, factory dawn, fluorescent apartment wall. Keep them original, non-branded, moderately compressed, and under the asset directory; do not download images from the web.

- [ ] **Step 2: Write failing DOM-controller tests**

Use the project's minimal DOM test approach or extracted pure view-state functions to assert boot-to-desktop timing state, conditional FT Studio icon, My Computer empty/projects view, local Underweb error, `torent` controls, safe close prompt, and accessible Russian controls.

- [ ] **Step 3: Run the focused test to verify it fails**

Run: `node --test test/virtual-pc-ui.test.js`  
Expected: FAIL because the controller does not exist.

- [ ] **Step 4: Implement Sloboda Desk 96 and FT Studio UI**

Render full PC content inside one mounted layer: 5.5-second boot sequence, desktop wallpaper picker, icons, taskbar/Start, windows, folder navigation, Underweb route form, `torent` state, install flow, project name/brief form, four 16-step rows, eight-bar lanes, mixer, transport, save/reopen, and save/discard/cancel confirmation. Use original rowan-berry leaf markup rather than an FL Studio logo. Ensure narrow screens scroll the layer instead of clipping it.

- [ ] **Step 5: Run focused tests to verify they pass**

Run: `node --test test/virtual-pc-ui.test.js`  
Expected: PASS.

- [ ] **Step 6: Commit only Task 4 files**

Run: `git add src/virtual-pc-ui.js virtual-pc.css assets/ui/virtual-pc test/virtual-pc-ui.test.js && git commit -m "feat: add virtual pc desktop ui"`

### Task 5: Apartment integration and shared persistence

**Files:**
- Modify: `index.html`
- Modify: `src/apartment-app.js`
- Modify: `src/apartment-v3-runtime.js`
- Modify: `apartment-v3.css` only for PC-layer layout integration if needed
- Test: `test/apartment-v3-runtime.test.js`
- Test: `test/virtual-pc-integration.test.js`

**Interfaces:**
- Consumes: Tasks 1–4 and existing `ApartmentMotion`, `ApartmentTime`, `advanceHomeFrame`.
- Produces: computer-specific runtime events/hold behavior that keep the hero seated while the PC overlay is open and return safely to the apartment on leave/shutdown.

- [ ] **Step 1: Write failing integration tests**

Assert a computer action becomes visible only after the seated `started` event, receives normal clock advancement while held, does not auto-complete after its ten-second scene duration, resumes normal motion on leave/shutdown, reconciles virtual downloads through sleep and ordinary frames, and never creates an extra clock.

- [ ] **Step 2: Run focused tests to verify they fail**

Run: `node --test test/apartment-v3-runtime.test.js test/virtual-pc-integration.test.js`  
Expected: FAIL on the new PC assertions.

- [ ] **Step 3: Integrate the mounted controller into the active app**

Add a hidden `#virtual-pc` root and its scoped stylesheet link. Load and persist virtual-PC state in `apartment-app.js`, open it after the existing computer fade/seated event, call `advanceHomeFrame` with the action held while in PC mode, then reconcile virtual state from `homeTime` after every active/sleeping frame. `Отойти от ПК` leaves power on and calls `motion.leaveAction()`; shutdown first stops audio, powers off, persists state, then uses the same return transition. Keep camera input, controls, and canvas picking inactive while the overlay is visible.

- [ ] **Step 4: Run focused integration tests to verify they pass**

Run: `node --test test/apartment-v3-runtime.test.js test/virtual-pc-integration.test.js`  
Expected: PASS.

- [ ] **Step 5: Commit only Task 5 files**

Run: `git add index.html src/apartment-app.js src/apartment-v3-runtime.js apartment-v3.css test/apartment-v3-runtime.test.js test/virtual-pc-integration.test.js && git commit -m "feat: connect virtual pc to apartment"`

### Task 6: Regression verification and user-facing acceptance

**Files:**
- Modify: `docs/superpowers/qa/2026-10-08-virtual-pc-ft-studio.md`

**Interfaces:**
- Consumes: completed Tasks 1–5.
- Produces: command results and an honest manual/browser QA record; browser automation failure remains a recorded limitation rather than a passed check.

- [ ] **Step 1: Run all automated tests**

Run: `npm test`  
Expected: every existing test plus virtual-PC tests passes.

- [ ] **Step 2: Run the relevant static/module checks and inspect Git scope**

Run: `git diff --check` and `git status --short`  
Expected: no whitespace errors; only feature files are new/modified in addition to the known pre-existing dirty files.

- [ ] **Step 3: Perform browser acceptance if the existing supported automation is available**

Exercise the complete spec route at 1280×720 and 640×900, including real audible Start/Stop and saved-project reopen. If the supported browser automation again fails before verification, record it as not completed; do not replace this with a claim based on source code or Blender output.

- [ ] **Step 4: Write the QA evidence**

Record test totals, virtual-disk/download edge cases, audio result, responsive observations, and any uncompleted visual checks in `docs/superpowers/qa/2026-10-08-virtual-pc-ft-studio.md`.

- [ ] **Step 5: Request one independent whole-branch review**

Give the reviewer the spec, this plan, tests, and generated assets. Address verified findings without touching pre-existing unrelated changes.

- [ ] **Step 6: Commit only the QA evidence**

Run: `git add docs/superpowers/qa/2026-10-08-virtual-pc-ft-studio.md && git commit -m "test: verify virtual pc flow"`  
Expected: no unrelated dirty file enters the commit. Make any reviewer-approved source fix in a separate commit that names only the exact feature files it changes.
