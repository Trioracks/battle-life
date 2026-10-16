# Lyrics and Living Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement task-by-task. Independent scene/audio/web domains use superpowers:dispatching-parallel-agents with disjoint file ownership. Steps use checkboxes for tracking.

**Goal:** Deliver six requested improvements as a tested local game patch.

**Architecture:** Pure persisted models for lyrics, sound profiles and dated web content; existing PC and apartment lifecycle owns time/camera/persistence. Keep existing saves compatible, isolate renderer from content and separate generated prose from historical source facts.

**Tech Stack:** ES modules, Three.js, Web Audio, Node test runner, existing Playwright runtime.

**Spec:** docs/superpowers/specs/2026-10-10-lyrics-web-world-design.md

**Completed:** Implementation checkpoint `0e1b1cc`, client revision26, final 627/627 tests plus native browser/audio scenarios. Coupled task files were committed together after integration rather than as half-working intermediate commits. Details and explicit content/balance limitations: docs/superpowers/qa/2026-10-10-lyrics-web-world-progress.md.

## Global Constraints

- Work in D:/Project/Battle on codex/lyrics-web-world; baseline 18115e3, 562 passing tests.
- No push, no real posts, no save erasure, no source-audio mutation, no new caches on C:.
- New imports initially rev=25; root performs one canonical revision upgrade after integration.
- Main owns PC state/install/explorer/UI/apartment-app; scene agent owns scene/camera only; audio agent owns beat modules; web agent owns Underweb/catalog/web CSS/data.
- User explicitly requests autonomous completion; no intermediate design/plan approval pause.

## Review Focus

- Reload mid-work must not duplicate skill rewards, regenerate text, lose active jobs or cross-apply beat/lyric jobs.
- New app must survive software normalization, disk accounting, installer cancellation and old saves.
- Direct URLs and history must not reveal future forum posts/news; arbitrary player text is inert textContent.
- 2D geometry must match 3D while scene picking/monitor zoom/doors remain functional.
- Audio transforms must preserve duration and original buffers, reject malformed profiles and release delayed/fading sources.

### Task 1: One apartment scene

**Files:** src/apartment-v3-scene.js, src/apartment-v3-camera.js, new shared-scene helper if needed; test/apartment-shared-scene.test.js; tools/verify-shared-scene.mjs.
**Interfaces:** Existing createApartmentView contract unchanged. Both modes render the same staticScene, with only camera/occlusion/avatar visibility changing.
- [x] Write behavioral test proving same geometry/state ownership in both modes and unchanged interaction targets.
- [x] Run node --test test/apartment-shared-scene.test.js; expected new regression fails.
- [x] Implement shared scene composition, remove 2D image-plane dependency from gameplay, retain preview/cutscene contracts.
- [x] Run camera/scene tests and browser 2D/3D captures with identical clock/light state; expected no scene divergence or console errors.
- [x] Commit scoped files after full suite (integrated checkpoint).

### Task 2: Skill and decision sound

**Files:** src/beat-mix.js, src/beat-audio.js, src/beat-playback.js, src/beat-production.js, src/beat-studio-view.js; new DSP/profile modules; corresponding tests and tools/verify-beat-result.mjs.
**Interfaces:** normalizeBeatMix handles v1 and v2; v2 profile snapshots per-layer result, immutable across growth/reload. Existing BeatAudio playback/work interfaces unchanged. Production stores results on completed stages, analysis describes actual result.
- [x] Add tests for 10 novice bounds, skill/slider monotonic comparison, clean100, beneficial110, persistence, old saves, first drum layer and fixed 90 BPM lengths.
- [x] Run new tests to establish missing behavior.
- [x] Implement bounded pure scoring plus deterministic per-layer fixed-length DSP; safe native graph for delay/EQ/colour and cleanup.
- [x] Verify actual rendered audio finite, non-silent, no clipping, same duration and unchanged originals; run all tests.
- [x] Commit scoped files (integrated checkpoint).

### Task 3: Independent battle sites and forum

**Files:** src/underweb-view.js, src/virtual-pc-catalog.js, src/underweb-community.js and view, web CSS, tests.
**Interfaces:** resolveUnderweb(address, metadata={}) adds forum/news routes while preserving old routes. mountUnderweb uses getMetadata().gameDay. Forum stored in pcState.community normalized by exported normalizeCommunity; root plugs into PC state. Catalog battle ID makarevich-1 must be accepted by PC/lyrics.
- [x] Browse reference, record sources and decision against invented real-person quotes.
- [x] Add failing DOM/model tests for site navigation, forum pages/reply/persist, safe text and future-date filtering.
- [x] Implement distinct battle skins/tabs and date-driven fictional local community, return dynamic software links untouched.
- [x] Run focused tests and browser screenshots at 1280/640; full suite before commit.

### Task 4: Historical news archive

**Files:** src/underweb-news.js, src/underweb-news-data.js, data source ledger/tool, tests; hooks in Underweb Task3 owner.
**Interfaces:** newsForDay(gameDay), newsIssue(id, gameDay), archiveForDay(gameDay); starts 2012-09-01 every3days through2014-09-01, each row has id/publishDate/eventDate/title/body/sourceTitle/sourceUrl.
- [x] Write tests for every3day coverage, archive/direct route future exclusion, original short sourced texts, invalid dates and fallback after archive ends.
- [x] Research real events and build source-backed offline data, no fabricated calendar filler.
- [x] Implement dated issue selection and local full article/archive links, preserve actual event dates.
- [x] Verify all rows and future-route tests, capture news and archive screens, commit.

### Task 5: Rap notebook and work integration

**Files:** src/lyric-production.js, src/rap-notebook-view.js, src/lyric-work-audio.js, new CSS; pc-software*, virtual-pc-state/ui/explorer/icons, apartment-app, beat-work-view (generalize labels only), tests and browser tool.
**Interfaces:** normalizeWriting(value,projects), normalizeLyric(value), createLyric(state,input,skills,rng), startLyricWork(state,{projectId,kind,sliders,beatId},skills), advanceLyricWork(state,minutes,clock={day,minutes}), effectiveWritingSkill(state,skills). Commands return {state,ok,reason}; advance returns {state,minutes,finished,blocked,practiceGained,reason?}. State.writing={activeTextId,practice,job}; projects include kind:'lyrics'. Shared needs remain state.music.needs. `job` contains projectId,kind,stage,total,elapsed,skill,practiceCredit,sliders and saved date/seed metadata.
- [x] RED tests for new software download/install/disk/saves and text project options/structure/stage persistence/needs/rewards.
- [x] Implement download/install generic catalog handling (notebook4MB/12MB/10s), app shortcut and explorer documents.
- [x] Implement deterministic glyph document, three stages, skill bounds, battle rules, additions and adaptation with saved version metadata.
- [x] Mount Notepad-style UI, wire work lifecycle with keyboard audio, common needs and visible writing practice.
- [x] Verify create for registered/other/free, all stages, interrupt-food-resume, reload, edit version, adapt completed beat; no auto registration or real lyrics.
- [x] Run full suite; commit scoped integration.

### Task 6: Integration and review

**Files:** canonical module revision references, QA notes, verification scripts.
- [x] Check cross-task contracts, migrate battle IDs/community/writing normalization without clobbering fields.
- [x] Raise canonical revision, run npm test and relevant browser/native-audio scripts, inspect screenshots and recorded metrics.
- [x] Request independent whole-branch review; fix important findings with regression tests.
- [x] Commit verified patch, leave local branch available for review (no unasked push); request latest local preview (queued for chat visibility).
- [x] Prepare six-block status, source links, test evidence and explicit temporary balance/content decisions for final handoff.
