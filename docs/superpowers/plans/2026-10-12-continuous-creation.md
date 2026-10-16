# Continuous Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Одно действие запускает оставшиеся этапы текста/бита с честным возобновлением и без повторного XP.

**Architecture:** A persisted workflow owns stage plans and paused jobs. Existing music/writing jobs remain the only active jobs and own XP accounting. The shared creative runtime advances stage boundaries; views only invoke and display it.

**Tech Stack:** ES modules, DOM/CSS, localStorage, Node.js tests.

**Spec:** `docs/superpowers/specs/2026-10-12-sloboda-workflow-design.md`, continuous work, notebook and compatibility sections.

## Global Constraints

- Inherit constraints from `2026-10-12-sloboda-track-patch.md`.
- Three stages, practice `1/3` per stage, existing `BEAT_RULES.workSeconds=8` per complete stage; a chain sums remaining time instead of compressing three stages into eight seconds.
- Writing below25 remains prose; basic notes unlock at25, punch/comparison/meter notes at50. Genre button hidden below beatmaking25 without removing genre progression.

## Review Focus

- Repeated Start never rerolls plans — A1.
- Legacy partial jobs never earn retroactive XP merely from migration — A1.
- Hunger exactly at a stage boundary prevents the next stage — A2.
- Switching projects after pausing preserves the first project — A1–A2.
- Stored prose/word errors survive normalization without becoming poetry — A3.

## Task 1 A1 Persisted plans and pause

**Files:** create `src/creative-workflow.js`, `test/creative-workflow.test.js`, `test/helpers/creative-fixtures.js`; modify `src/beat-production.js`, `src/lyric-production.js`, `src/virtual-pc-state.js`, `test/virtual-pc-recovery.test.js`.

**Interfaces:** `state.creativeWork={version:1,activeId:null,items:[]}`. Each item is `{projectId,kind:'beat'|'lyrics',plans:[{stage,total,sliders}],pausedJob:null|Job}`; plans include all three positions. While active, pausedJob is null and the existing job owns time/XP; pausing transfers ownership, not copies it. Export `normalizeCreativeWork(value,projects)`, `startCreativeChain(state,{kind,projectId,stageSliders,gameDay},skills={},random=Math.random)->{state,ok,reason}`, `pauseCreativeChain(state)->state`, `creativeChainProgress(state,projectId)->{overall,stage,index,count:3}`. Test helper `creativeFixture(kind,{skill=10,satiety=100,energy=100}={})` returns `{state,projectId,skills}` using real creation functions.

- [ ] Write tests `repeat start preserves plan`, `pause resume keeps ledger`, `legacy job adoption`, `backup quota failure`: `assert.deepEqual(resumedJob,pausedJob)`; `assert.equal(afterPractice,beforePractice)` on restore. A legacy elapsed30/total60 job preserves both fields, sliders and skill. Failed backup leaves the raw save untouched and saveVirtualPcState returns false.
- [ ] Run `node --test test/creative-workflow.test.js test/virtual-pc-recovery.test.js`; require RED for new behavior.
- [ ] Implement interfaces. Reuse stage normalizers to validate paused jobs. Preserve practiceCredit/genreCredit and already stored beat mix. Add optional final `plan={total,sliders}` argument to startBeatStage/startLyricWork; it never overrides an existing job. Freeze future decisions/durations once; capture actual result skills at each stage start. Backup raw save to `battle-life-virtual-pc-v1-before-creative-work` before first schema write. Retain malformed project data for an explanatory UI error, not silent deletion.
- [ ] Rerun to PASS; test idempotent repeated normalization and JSON round-trip. A paused project can be resumed after working on another; conflicting active work fails without losing either.
- [ ] Commit `feat: persist resumable creative workflows` with only task files.

## Task 2 A2 Continuous runtime and two progress bars

**Files:** modify `src/home-creative-work.js`, `src/apartment-app.js`, `src/beat-studio-view.js`, `src/rap-notebook-view.js`, `src/beat-work-view.js`, `src/virtual-pc-ui.js`, `apartment-v3.css`; create `test/creative-chain-runtime.test.js`; extend `test/beat-work-view.test.js`, `test/studio-immersion.test.js`.

**Interfaces:** `advanceCreativeWork(state,seconds,clock=null,skills={})` retains `{state,minutes,finished,blocked,practiceGained}` and adds `stageFinished`; finished means entire chain completed, or the one job for vocals/additions. `creativeWorkDescriptor` adds chainProgress from A1; panel update accepts it.

- [ ] Tests `three stages one run`, `same outcome split delta`, `blocked at stage boundary`, `resume no extra XP`: `assert.equal(project.stages.length,3)`, `assert.ok(Math.abs(practiceGain-1)<1e-9)`; compare24 seconds once with240 ticks of .1. At the hunger threshold after stage1 there is no stage2 job. DOM shows two progress bars, stage1/3–3/3 and nondecreasing overall percentage.
- [ ] Run `node --test test/creative-chain-runtime.test.js test/beat-work-view.test.js test/studio-immersion.test.js`; require RED.
- [ ] Consume delta up to each boundary, persist result, check needs, then consume remainder. Use planned durations for weighted overall progress, existing advance functions for XP. Update work sound/label without returning the camera; finishWork only on completion/blocking. Cancel/leave/switch calls A1 pause. Use actual consumed minutes across midnight. Additions and vocal stages remain single jobs. Atomic start failure leaves current work untouched; loading never auto-starts work.
- [ ] Rerun to PASS; check zero/negative/NaN delta, repeated cancellation, reload during every stage, credits at skill100 and exact-boundary hunger. UI resumes the same project and shows partial stage progress before starting.
- [ ] Commit `feat: run text and beat stages continuously`.

## Task 3 A3 Novice prose and clear actions

**Files:** modify `src/lyric-production.js`, `src/rap-notebook-view.js`, `rap-notebook.css`, `src/beat-studio-view.js`; extend `test/lyric-draft.test.js`, `test/rap-notebook-view.test.js`, `test/genre-ui.test.js`.

**Interfaces:** retain normalizeLyric and section types; add saved section `presentation:'prose'|'lines'`. New low-skill base sections use draft/prose. Old sections lacking presentation retain previous rendering and are never regenerated on load.

- [ ] Tests `novice prose all stages`, `notes thresholds`, `empty actions`, `genre hidden`: at writing10 after all stages `assert.ok(sections.every(s=>s.presentation==='prose'&&!s.title))`, every note empty. Test24/25/49/50 based on stage skill, not random fit/quality. Existing saved sections remain unchanged.
- [ ] Run `node --test test/lyric-draft.test.js test/rap-notebook-view.test.js test/genre-ui.test.js`; require RED.
- [ ] Render prose as flowing words with rare paragraphs, preserving ∎/□, punctuation, motifs $$$/Zzz… and spelling underlines. Adaptation produces more regular but still imperfect lines. Empty toolbar only New/Open; ready adds Add/Adapt. Central «Начать писать»/«Продолжить писать» uses A1; FT uses «Работать над битом»/«Продолжить работу». Uniform create/cancel controls. Exposed higher-skill settings for remaining stages are configured before the chain, without intermediate mandatory dialogs.
- [ ] Rerun to PASS; verify empty/draft/paused/ready actions, semantic symbol preservation, no rerender rewriting saved text. Visual check at800×600 and1280×900: no horizontal drift/overflow, clear centered action, long prose wraps normally.
- [ ] Commit `feat: show novice prose and clear creative actions`.
