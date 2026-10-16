# Battle FPS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Keep walking responsive throughout the battle lifecycle, including persistence failure.

**Architecture:** A coalescing Worker owns heavy social calculations and archive preparation. The host validates captured inputs, atomically saves and publishes a small patch; the normal frame excludes social advancement.

**Tech Stack:** ES modules, module Workers, localStorage, node:test, existing browser QA tooling.

**Spec:** docs/superpowers/specs/2026-10-13-battle-fps.md

## Global Constraints

- Preserve saves, deterministic outcomes and migration backups; no graphics downgrade.
- D: only for generated artifacts. Work in the user's existing codex branch; do not touch untracked backlog/assets.
- One job in flight, integer-minute coalescing and 250 ms minimum interval. Errors require explicit retry.
- User already authorized autonomous implementation; no additional routine confirmation.

## Review Focus

- Registration, blocking a contact or marking a message read during a worker job must not be overwritten.
- Creative progress and needs continue during long calculations and survive commit.
- New game, dispose and worker failure cannot leak old events or retry forever.
- Legacy migration backups and failed localStorage writes preserve original bytes.
- Sleeping/catch-up, reload and final archives must preserve one-time outcomes and bounded frame work.

### Task 1: Background lifecycle and save preparation

**Files:** src/social-background.js, src/social-worker.js, src/social-worker-runtime.js, src/social-runtime.js, src/virtual-pc-state.js, src/pc-save-codec.js; test/social-background.test.js.

**Interfaces:** Consumes advanceSocial(state, minute, options). Produces createSocialBackground({createWorker,getState,persist,onState,onError}), with tick(minute, options, realMs), retry(), reset(), dispose(); worker protocol {id,patch,nowMinute,options} -> {id,patch,archives,durable,error}. Save helpers preparePcSaveArchives(state, keys) and primePcSaveArchives(storage, entries).

- [ ] Write tests: one job for repeated fractional frames; real synchronous-reference parity; no event visible before persistence; failure retries only explicitly; stale social/application/skills input rejected while unrelated project progress is retained; reset/dispose ignores old result; prepared save round-trip and failed write preserve prior bytes.
- [ ] Run `node --test test/social-background.test.js`. Expected: RED (missing implementation), then GREEN after implementation.
- [ ] Implement bounded worker mirror/delta protocol, dependency guards, prepared archives and error latch. Propagate lifecycle reasons instead of swallowing them.
- [ ] Run the tests and relevant save/social tests. Expected: all pass. Commit only task files.

### Task 2: Host frame isolation and error recovery UI

**Files:** src/virtual-pc-runtime.js, src/apartment-app.js, test/virtual-pc-runtime.test.js, test/social-background.test.js; existing revision-bearing host assets as necessary.

**Interfaces:** Consumes Task 1 coordinator; produces advanceVirtualPc(...,{deferSocial:true}) retaining transfers but leaving domain refs untouched. Every host path uses it and ticks the background coordinator once. Reset on new game; dispose on page exit. Visible status/retry separate from movement controls.

- [ ] Write frame-isolation tests: crossing a deadline with deferSocial retains tournament/archives yet advances downloads; durable wrapper does not save a social event. Existing synchronous API still advances normally.
- [ ] Run `node --test test/virtual-pc-runtime.test.js test/social-background.test.js`. Expected: RED for frame isolation, then GREEN after integration.
- [ ] Integrate worker, primed saves, recovery UI and session reset. Keep walking/working/download time independent of background completion.
- [ ] Run `npm test`. Expected: all pass. Commit task files.

### Task 3: Native browser regression and final review

**Files:** test/browser/battle-fps.mjs (or existing QA tools), docs/qa/2026-10-13-battle-fps.md.

**Interfaces:** Actual host, Worker and save pipeline from Tasks 1–2; isolated browser storage.

- [ ] Exercise real movement before deadline, through selection close, judging and final archive; collect frame/update p50/p95/max and domain timings against recorded baseline. Inject failed storage, verify no repeated calculation, visible retry and saved-byte preservation. Reload and compare results/event counts.
- [ ] Run native browser script. Expected: no per-frame social work, no repeat job/save storm, uninterrupted frames during heavy worker job, exact reference results. Investigate failures under systematic-debugging.
- [ ] Run `npm test`. Expected: all pass. Record evidence and limitations, commit QA.
- [ ] One independent whole-patch review; fix Important/Critical findings with RED→GREEN and full-suite validation. Retain branch, no push.
