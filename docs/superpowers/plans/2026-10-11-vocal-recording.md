# Vocal recording implementation plan

Spec: docs/superpowers/specs/2026-10-11-vocal-recording-design.md
Branch base: 78c0143. Inline execution, then one fresh whole-branch review.

## Global constraints

Preserve source WAVs and existing saves. D: only for generated artifacts. No external writes, uploads or microphone access. Use apply_patch for source edits, RED→GREEN tests for behavior. Browser audio/3D tests run serially. Local merge is authorized by user.

## Task 1: Asset pipeline and catalogue

Files: scripts/prepare-vocal-assets.mjs, src/vocal-catalog.js, src/beat-beginner-bank.js, tests/vocal-assets.test.mjs; extend existing bank generator if needed.
Produces: 40 stable vocal IDs and paths, exact 4-bar derived WAVs, beginner bank 16 parts per family.
Steps: write catalogue/WAV duration/source preservation tests; run node --test tests/vocal-assets.test.mjs (Expected: FAIL missing catalogue); implement deterministic generator and catalogue; generate assets; repeat (Expected: PASS). Commit asset pipeline, catalogues and derived assets.

## Task 2: Recording data and production lifecycle

Files: src/vocal-result.js, src/vocal-production.js, src/beat-production.js, src/lyric-production.js, src/virtual-pc-state.js, tests/vocal-production.test.mjs.
Consumes catalogue IDs; produces normalizeRecording, normalizeRecordingState, startVocalWork, advanceVocalWork, effectiveVocalSkill. Beat normalization preserves recording. Job.output is the proposed next recording revision used by both preview and completion.
Steps: RED tests for prerequisites, drafts/clean/mute/post limits, hardware ceiling, malformed saves, interrupted practice and competing jobs; implement pure model + migration; run node --test tests/vocal-production.test.mjs (Expected: PASS). Commit.

## Task 3: Audible recording and playback ownership

Files: src/vocal-result-dsp.js, src/beat-audio.js, src/beat-playback.js, src/beat-work-audio.js, tests/vocal-audio.test.mjs.
Consumes recording profiles; produces deterministic vocal PCM, active-take playback descriptors and work preview. Existing transport remains synchronized, paused/resumed and cancelable.
Steps: RED tests raw/draft/clean/master difference, bounded samples, fixed length, muted draft exclusion, snapshot keys and failed load cleanup; implement DSP and playback; run node --test tests/vocal-audio.test.mjs plus existing beat audio/playback tests (Expected: PASS). Commit.

## Task 4: Studio and work-scene integration

Files: src/recording-studio-view.js, src/beat-studio-view.js, src/ft-studio-view.js, src/home-creative-work.js, src/beat-work-view.js, src/apartment-app.js, stylesheet and relevant tests.
Consumes production job and playback preview. Produces text picker, draft/clean/post actions, permanently muted draft row, progressive work skill meter and audible camera work.
Steps: RED tests for 9→10→11 tracks, eligible text picker, work routing, skill labels and busy controls; implement; run focused tests then npm test (Expected: all PASS). Update cache revisions to 28. Commit.

## Task 5: End-to-end validation and integration

Files: native browser scenario, offline audio comparison renderer and QA report under D:/Codex/Builds/Battle/vocal-recording.
Steps: run all tests (Expected: all PASS); run actual application browser scenario with ready text/beat, draft work, pause/stop, clean work, mix/master, save/reload (Expected: no page errors, correct muted track and audio); render raw/draft/clean/master from same user source (Expected: distinct, finite, bounded, lower/mid attenuation measurable); inspect screenshots; fresh reviewer; fix important findings RED→GREEN and rerun suite; commit and merge locally into codex/lyrics-web-world, retaining feature branch.

## Review focus

Review malformed/cross-project job snapshots, repeated practice on interrupted work, invalid source IDs, concurrent jobs, clean replacement after postprocessing, cache invalidation and audio source cleanup, independent beat/vocal DSP, low-end equipment never reaching raw, hidden-page resumption, layout at narrow sizes and old-save compatibility.
