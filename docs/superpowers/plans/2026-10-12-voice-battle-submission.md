# Voice and Battle Submission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Отдельная вокальная анимация, согласованный уровень голоса и сдача сохранённой версии трека на баттл.

**Architecture:** A pure submission model owns snapshots, a picker selects virtual projects, Underweb renders status. Snapshots store decisions and lyric association, never PCM in localStorage. Performance pose is selected from the active job; vocal gain is independent of quality.

**Tech Stack:** ES modules, Three.js additive poses, Web Audio DSP, DOM, Node.js tests.

**Spec:** `docs/superpowers/specs/2026-10-12-sloboda-workflow-design.md`, internet, vocals and submissions sections.

## Global Constraints

- Inherit `2026-10-12-sloboda-track-patch.md`; use A's active work descriptor, not duplicate UI job state.
- Absolute vocal gain: raw−2 dB, mixed−1 dB, mastered+0.5 dB. Master without mix also+0.5. Do not stack previous+3/+1.5 gains.
- Ready beat with draft vocal is sufficient; clean/mix/master optional. Off-topic submission allowed without quality penalty.
- Virtual publication only, ending in pending; no judges, notifications or opponents yet.

## Review Focus

- Clean replaces draft audibly while draft remains visibly muted/locked — B1.
- Cancelled rap pose restores bones; mix/master still use keyboard motion — B1.
- Original text/project edited or deleted after submission — snapshot stays intact — B2.
- Repeated Submit/cancel replacement never create two current submissions — B2–B3.
- Midnight rerender preserves picker selection/focus without submitting — B3.

## Task B1 Performance pose and gain

**Files:** modify `src/vocal-result.js`, `src/vocal-result-dsp.js`, `src/apartment-v3-animation.js`, `src/apartment-v3-scene.js`, `src/apartment-app.js`, `src/home-creative-work.js`, `src/ft-studio-view.js`, `src/virtual-pc-icons.js`; create `assets/ui/virtual-pc/icons/microphone.svg`; tests `test/vocal-post-balance.test.js`, `test/apartment-v3-animation.test.js`, `test/vocal-ui.test.js`.

**Interfaces:** vocalPlaybackProfile retains shape, changes only vocalGainDb. creativeWorkDescriptor adds `performance:'typing'|'rapping'`, rapping only for recording draft/clean. Scene passes `state.workPerformance` into ApartmentAnimation.update.

- [ ] Tests expect dB `[−2,−1,+0.5,+0.5]` for raw/mix/master/both. For identical damage profile: `assert.ok(Math.abs(rms(processed)/rms(base)-10**(db/20))<1e-6)`. Test silence, invalid gain, immutable source, different typing/rapping poses and restored quaternion after stopping.
- [ ] Run `node --test test/vocal-post-balance.test.js test/apartment-v3-animation.test.js test/vocal-ui.test.js`; require RED.
- [ ] Support negative finite gain in DSP while retaining damage/seed/quality. Add smooth additive seated pose toward the right desk mic: chest/head turn, slight lean, hand gestures. Restore base before each mixer update and on exit; no missing named animation clip or phone asset. SVG microphone marks both rows; keep draft mute locked.
- [ ] Rerun to PASS; hear identical raw/mixed/mastered sources and visually inspect draft/clean/mix/master/interruption. Measure gain before the shared output limiter, listen after it.
- [ ] Commit `feat: add mic performance and rebalance vocals`.

## Task B2 Immutable submission model

**Files:** create `src/battle-submission.js`, `test/battle-submission.test.js`; modify `src/virtual-pc-state.js`, `src/vocal-result.js`, `src/vocal-production.js`, `src/virtual-pc-catalog.js`.

**Interfaces:** `submissionCandidates(state,battleId)->[{projectId,name,seconds,postStage,topicMatch,issue}]`; `submitBattleTrack(state,{battleId,projectId,gameDay,replace=false})->{state,ok,reason}`; `normalizeBattleSubmissions(value)->Submission[]`. Store `state.battleSubmissions`. `Submission={version:1,battleId,roundId:'selection',revision,submittedDay,projectId,status:'pending',topicMatch,track,lyrics}`; track/lyrics are deep snapshots. Store the lyric snapshot as `recording.text.snapshot`; an unavailable legacy association uses `lyrics:null` and `topicMatch:null`, visibly unverified but still submittable. Invalid snapshots retain raw metadata and an issue marker rather than disappearing.

- [ ] Tests `registered draft accepted`, `off topic allowed`, `snapshot independent`, `replace consent`, `malformed retained`: registered ready+draft returns ok; missing registration/vocal returns false. Off-topic gives false topicMatch but unchanged quality. After editing/deleting original `assert.deepEqual(savedSubmission,beforeEdit)`.
- [ ] Run `node --test test/battle-submission.test.js test/virtual-pc-state.test.js test/vocal-production.test.js`; require RED.
- [ ] One submission per battle/round; same version repeat is idempotent, changed version requires replace. Validate ready state, registration, finite day and audio availability. Extend recording text metadata with a lyric snapshot at recording start, preserving existing id/name/revision. For legacy recording use current text only if id/revision match; otherwise mark association unverified, not silently attach a newer text. Duration follows existing song form (4 bars before mix,8 after). Backup `battle-life-virtual-pc-v1-before-battle-submissions` before schema rewrite; no reward or score calculation. Update Makarevich's visible demo duration rules so accepted10.67/21.33-second tracks do not contradict mandatory60–120 seconds.
- [ ] Rerun to PASS; JSON round-trip, changed/deleted text, stale revision, duplicate submission, corrupt metadata, backup quota failure preserving original raw save. Existing submission must survive without current source project.
- [ ] Commit `feat: persist battle track submissions`.

## Task B3 Picker and Iskra

**Files:** create `src/battle-submission-view.js`, `test/battle-submission-view.test.js`; modify `src/underweb-view.js`, `src/virtual-pc-ui.js`, `src/virtual-pc-catalog.js`, `src/virtual-pc-window-state.js`, `underweb-world.css`; tests `test/underweb-news-view.test.js`, `test/virtual-pc-window-state.test.js`.

**Interfaces:** `mountBattleSubmissionPicker(root,{getState,battleId,getGameDay,onChange,onClose})->{update,dispose}` uses B2 candidates as a simulated file picker, not system file input. mountUnderweb gains `onSubmitTrack(battleId)`; onChange uses existing persistence and surfaces its failure. Closing restores focus to the invoking button.

- [ ] Tests `registered battle opens picker`, `off topic nonblocking`, `cancel replace preserves old`, `my battles based on registrations`, `browser first maximized`: `assert.equal(mode,'maximized')`, only registered battles in sidebar; draft submits pending. Midnight refresh retains selected project; Escape cancels without state mutation.
- [ ] Run `node --test test/battle-submission-view.test.js test/underweb-news-view.test.js test/virtual-pc-window-state.test.js`; require RED.
- [ ] Add submit/replace action, pending status and saved version details. Replace obsolete copy saying recording/submission unavailable. Iskra has prominent dated news near search, directory below, right-hand My battles with submission state; retain archive/date visibility and remove “Без ИИ-ответов”. First Underweb open maximized inside work area; later resize/minimize/restore retain geometry. Other battle pages stay available; acceptance journey uses makarevich-1.
- [ ] Rerun to PASS; empty picker explains next action, ineligible files explain why, storage failure never says successfully sent. Check keyboard, small/large viewport and date rollover.
- [ ] Commit `feat: submit tracks through battle websites`.
