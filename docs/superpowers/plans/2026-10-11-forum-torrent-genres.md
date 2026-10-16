# План жанров и завершения студийного обновления

> **For agentic workers:** Use superpowers:executing-plans for genre tasks with TDD. Independent forum, torrent and marker tasks use dispatching-parallel-agents.

**Goal:** Finish genre progression and forum, torrent and timeline corrections, preserving saves and archived audio.

**Architecture:** A pure genre module owns permanent choices, caps and snapshots. Music state integrates separate XP ledgers; playback consumes saved profiles. Existing UI contracts remain.

**Tech Stack:** ES modules, Web Audio, Node test runner, isolated Playwright.

**Spec:** docs/superpowers/specs/2026-10-11-genre-specialization-design.md; latest autonomous-work instruction authorizes implementation without further approval.

## Global constraints

- Same checkout, codex/forum-torrent-genres; local merge into codex/lyrics-web-world after validation. No push.
- Preserve ZIP and source media. D: only scratch/builds.
- Historical forum uses attributed facts/short excerpts and links, no wholesale copying or invented real-person quotes.
- General 25/50/75 unlock three choices; 100 one primary. All genre XP starts zero, cap75 except primary100.
- New experimental FX require genre XP25 and postproduction; archives retain old algorithm. Current banks stay90BPM, authentic genre banks deferred content.

### Task 1: Genre model and safe migration

**Files:** src/genre-progression.js, src/beat-production.js, src/virtual-pc-state.js, test/genre-progression.test.js, affected fixtures.

**Interfaces:** normalizeGenreProgression, genreOptions, chooseGenre, chooseSpecialization, genreSnapshot, addGenrePractice, genreCap. music.genres={version:1,chosen:[],primary:null,xp:{...}}. Jobs have separate genreCredit.

1. Write tests for thresholds24.99/25/49.99/50/74.99/75/99.99/100, unknown/duplicate/locked choices, one primary, caps; new experimental projects, partial/resume, migrated partial only remaining XP, raw backup failure.
2. Run node --test test/genre-progression.test.js. Expected: FAIL missing APIs.
3. Implement rules, snapshots, credit ledger and raw pre-genre backup; retain old genrePractice counters as compatibility data, never award them. Update superseded practice-only fixtures.
4. Run node --test test/genre-progression.test.js test/beat-production.test.js test/virtual-pc-state.test.js. Expected: PASS.

### Task 2: Saved creative audio

**Files:** audio-performance.js, beat-result.js, beat-playback.js, beat-result-dsp.js, vocal-result-dsp.js, test/genre-audio.test.js.

**Interfaces:** optional genreProfile preserves archive compatibility. creativeProfileAmount(profile,legacySkill,postGain): zero before25/no post; .2/.8/.5/.3 at25/50/75/100 times postGain/4. Playback/cache keys transport profiles.

1. Test gates/interpolation/nonexperimental/legacy path, vocal ceiling and +3/+1.5dB, snapshot stability.
2. Run node --test test/genre-audio.test.js. Expected: FAIL missing behavior.
3. Implement snapshot-preserving normalization and creative routing only; keep technical EQ/timing, duration, original files.
4. Run focused genre-audio, beat DSP and vocal DSP suites. Expected: PASS.

### Task 3: Genre choices and progress

**Files:** beat-studio-view.js, beat-work-view.js, apartment-app.js, test/genre-ui.test.js.

**Interfaces:** Task1 rules; permanent choices confirmed, new projects only available genres. Work HUD genreProgress independent of audio snapshots.

1. Test novice fixed genre, unlock/confirm/cancel, chosen style creation, caps, sliders exactly25, genre meter absent during writing/recording.
2. Run node --test test/genre-ui.test.js. Expected: FAIL missing controls.
3. Implement UI preserving modal focus and transport.
4. Run genre-ui, beat-ui, beat-work-view tests. Expected: PASS.

### Task 4: Independent features and integration

**Files:** Marker renderer/CSS; community/archive; torrent software/UI; browser verifiers; revision imports.

**Interfaces:** Markers preserve renderer API; community preserves topic IDs/local replies; torrent owns notebook/FT downloads except client bootstrap.

1. Inspect independent agent diffs and focused RED/GREEN evidence.
2. Update cache closure to rev34. Run node --test. Expected: all PASS.
3. Isolated browser QA for genre UI, timeline, torrent focus/resume, archive and casts; audio exports maintain duration/hardware ceiling.
4. Fresh whole-branch review; Important fixes RED/GREEN and full suite. Commit then local merge. Expected: tracked tree clean, unrelated ZIP unchanged.

## Review Focus

Partial legacy job migration; malformed caps/choices; profile loss through normalizers/cache; future archive visibility and saved replies; metadata duplicate clicks/minimized client; marker/playhead alignment; archived audio and vocal hardware limits.
