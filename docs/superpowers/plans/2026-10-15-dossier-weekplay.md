# Dossier and Week-long Playtest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make week-long testing usable and build an evidence-based detective dossier alongside coherent listening, downloads and group activity.

**Architecture:** Extend existing immutable state, timed research and Worker boundaries. Public publication and case projections are shared domain seams; DOM/SVG is a view, not a second simulation. Keep module responsibilities narrow and existing frozen assets intact.

**Tech Stack:** Existing JavaScript ES modules, Three.js, Web Audio, Node test runner, Playwright/Edge. No added dependency.

**Spec:** docs/superpowers/specs/2026-10-15-dossier-weekplay-design.md

## Global Constraints

- Preserve existing saves, immutable submissions, exports, completed reports and user assets. Additive validated migrations; damaged data goes to recovery, never silently replaced.
- Work in D:/Project/Battle on codex/sloboda-workflow-design. Do not merge, push, publish, or touch the player's localStorage at http://127.0.0.1:4173. QA uses isolated origins and fresh contexts.
- All new scratch, media, logs, dependency caches and builds stay on D:. No new dependencies or engine replacement.
- Public knowledge only: no future rounds, unpublished judges, hidden scores, private judge weights or future opponent work in public dossier projections or forecasts.
- Analysis is a simulated timed activity, not mass audio playback. No per-frame full-history serialization, DOM rebuild or audio preparation.
- All interactive UI supports keyboard, accessible names, focus, reduced motion and disposal. Retain the low-chrome apartment HUD.
- Independent task reviews and one final package review. Controllers write plans/records, implementers write product code and tests.

## Review Focus

- Save reload during accelerated sleep must neither reset work nor credit offline time: Task 1 reload/power/pause integration test.
- Clearing download history must preserve partial byte accounting and file reopening: Task 5 partial-plus-completed fixture and reload test.
- Stale Worker results must not undo foreground group read/subscription or research: Task 6 delayed reply test, Task 10 native repeat.
- Future/unpublished and missing evidence must not turn into judge insight or a forecast: Tasks 7/8 cutoff, null-evidence and private-field mutation tests.
- Empty cases, deep links, duplicate audio rows and narrow screens must remain usable without leaks: Tasks 4/9 interaction/disposal tests, Task 10 screenshots.

## File boundaries and sequence

1 owns host clocks/sleep/food cues. 2 owns camera framing. 3 owns background demo recipes. 4 owns shared social player. 5 owns browser download state/view. 6 owns canonical community publications, read markers, notifications and dialog navigation. 7 owns research jobs/gates. 8 owns public case graph and subjective forecasts. 9 owns caseboard presentation and social-to-app routing. 10 owns integrated QA and cache revision. Sequential writers; later tasks consume named APIs below. New files follow existing flat src naming, not a broad directory refactor.

### Task 1: Accelerated background installation, manual sleep and food cue

**Files:** Modify src/apartment-v3-time.js, src/apartment-v3-runtime.js, src/apartment-app.js, src/apartment-v3-motion.js, src/phone-hud.js, src/sound-cues.js and existing bed context action factory in apartment-app.js; test/apartment-v3-time.test.js, test/pc-software.test.js; create test/sleep-background-work.test.js. No new global HUD panel. A focused atomic food-consumption helper may be extracted to test persistence/cue ordering.

**Interfaces:** ApartmentTime.beginSleep({mode:'manual',minutesPerSecond:45}) -> boolean; snapshot.sleep.mode identifies manual sleep with finite values. Existing ordinary options unchanged. Add installationElapsedSeconds({activeSeconds,advancedGameMinutes,powered,paused}) -> number in src/pc-installation-clock.js; valid active game advancement contributes advancedGameMinutes*4, no duplicate desktop dt. Existing advanceInstallation(state, seconds) remains pure. Food cue goes through existing successful atomic consume callback.

- [ ] **Step 1:** Write failing behavioral tests: ordinary installer still needs catalog seconds; powered 360-minute sleep finishes it, leaving PC keeps progress, off/pause/hidden/reload add zero; manual sleep remains asleep after 10080 minutes, snapshot reload resumes, manual wake ends; normal sleep still auto-wakes. Successful consumption produces one cue; refused/full/failed-save produces zero.
- [ ] **Step 2:** Run `node --test test/apartment-v3-time.test.js test/pc-software.test.js test/sleep-background-work.test.js`; capture expected RED.
- [ ] **Step 3:** Implement finite manual mode and explicit contextual bed action `Спать до пробуждения (тест)` beside normal sleep; it carries mode into the bed motion request, not a persistent toolbar. Continuous world catch-up and single installer host clock keep menu and visibility guards. Add short filtered-noise crunch through current sound lifecycle. Update old real-time-only sleep contract tests intentionally, not assertions about implementation text.
- [ ] **Step 4:** Run focused tests and `npm test`, capture GREEN/full results; self-review pause boundaries and persistence.
- [ ] **Step 5:** Commit only owned files; report tests and public API changes.

### Task 2: Initial and sleeping bedroom composition

**Files:** Modify src/apartment-v3-camera.js and its render adapter if necessary; test/apartment-v3-camera-comfort.test.js; native screenshot helper under tools/qa and evidence artifacts/dossier-weekplay/task-2. If camera framing alone cannot exclude crown, request controller ruling before changing GLB builder.

**Interfaces:** Existing camera API consumes motion sleeping/initial-rest state; no simulation mutation. Task 1 manual sleep shares ordinary sleep camera state.

- [ ] **Step 1:** Add projection tests for bed/hero in left frame, desk/computer in right, kitchen outside at 1280x720, 1366x768, 1920x1080; narrow view keeps bed primary. Existing walking/typing/rapping camera assertions stay. Replace old assertion requiring doorway for sleeping view.
- [ ] **Step 2:** Run `node --test test/apartment-v3-camera-comfort.test.js`; capture failing current composition.
- [ ] **Step 3:** Implement explicit aspect-aware room framing; do not hide merged material meshes. Use existing Three conventions and read applicable skill; no renderer/engine migration.
- [ ] **Step 4:** Capture native initial/manual/ordinary sleep screenshots on an isolated origin with verified assets and SVG MIME; inspect them. Run focused and full suite; document kitchen and partition crown visibility, leave user server alone.
- [ ] **Step 5:** Commit camera/tests/helper and report exact screenshots.

### Task 3: Distinct arranged archive demos

**Files:** Create src/social-background-audio.js; modify src/social-audio-view.js descriptor construction only; data/social/communities.json only if duration metadata is needed; test/social-catalog.test.js; create test/social-background-audio.test.js.

**Interfaces:** backgroundAudioDescriptor(trackId) -> stable existing BeatAudio-compatible descriptor or null. Six catalog IDs produce different main melody source families, calibrated layers and 2/4/2 bar intro/body/outro at 90 BPM. Caller row receives descriptor duration; Task 4 owns player controls.

- [ ] **Step 1:** Add tests that six IDs have distinct primary melody sources, durations 64/3 seconds within floating tolerance, nonempty section windows with entrances/exits and supported calibrated sources. Assert frozen track-version/export descriptors are unchanged by generating all six demos.
- [ ] **Step 2:** Run `node --test test/social-catalog.test.js test/social-background-audio.test.js`; record RED demonstrating current shared melody/unarranged duration.
- [ ] **Step 3:** Author deterministic recipes using existing compatible source bank and song-form windows; no new WAV generation, no change to immutable actual submissions.
- [ ] **Step 4:** Run focused/full tests and native PCM generation for all six with finite nonzero samples, no clipping, different hashes and audible section activity measured. Report objective validation without claiming subjective listening.
- [ ] **Step 5:** Commit scoped changes and report recipe IDs/interfaces.

### Task 4: Unified social player controls and progress

**Files:** Modify src/social-audio-view.js, src/pc-audio-session.js and src/beat-audio.js only for necessary per-owner natural-end support, social player CSS; create test/social-audio-controls.test.js; extend existing audio-session tests.

**Interfaces:** Shared social row consumes backgroundAudioDescriptor and existing version descriptors; session snapshot keyed to owner/descriptor. Add an explicit loop:false social playback option with existing FT default unchanged if no option exists. Update lightweight bar/time without rebuilding parent DOM.

- [ ] **Step 1:** Behavioral tests toggle Play->Pause->Play on same button, Stop resets to zero, half-duration gives 50% progress, other descriptor never drives row, duplicate same-track rows sync, natural end resets playing state, FT still loops, loading/error and disposal release resources.
- [ ] **Step 2:** Run `node --test test/social-audio-controls.test.js` and relevant existing audio-session tests for expected RED.
- [ ] **Step 3:** Implement one left toggle, right Stop, accessible progress/time for every shared row consumer including dialog attachments; no seek feature or new RAF per row.
- [ ] **Step 4:** Run focused/full tests and a native social attachment play/pause/stop/end check; inspect row screenshot.
- [ ] **Step 5:** Commit and report event/snapshot contract.

### Task 5: Browser download popover and durable history

**Files:** Modify src/pc-browser-downloads.js, src/pc-browser-downloads-view.js, src/underweb-view.js, root underweb-world.css, src/virtual-pc-ui.js only routing needed; test/pc-browser-downloads.test.js; create test/browser-download-popover.test.js.

**Interfaces:** clearCompletedBrowserDownloadHistory(state) -> {ok,state}; browserDownloadEntries(state,{includeHidden=false}={}) preserves current default return rows plus stable history visibility. Active queue/disk identity survives clear. Existing browse-metadata action opens virtual Explorer Downloads.

- [ ] **Step 1:** Test latest three newest entries, initial closed/new transfer opens, Escape/outside close, details lists full history, folder action navigates, clearing completed excludes active partial, preserves files/bytes through reload and repeat download does not duplicate storage. Test no-room error.
- [ ] **Step 2:** Run `node --test test/pc-browser-downloads.test.js test/browser-download-popover.test.js`; record RED.
- [ ] **Step 3:** Add validated history visibility independent of transfers/files; toolbar-anchored overlay with remaining seconds (existing one-second transfer), details/clear/folder actions. A short download-to-toolbar arrival/highlight acknowledges a new transfer; suppress nonessential movement under reduced motion. Keep user manual installer-open flow. No full-width expanded strip.
- [ ] **Step 4:** Run focused/full suite; native screenshot and keyboard/outside interaction, including browser window close/reopen listener cleanup.
- [ ] **Step 5:** Commit and report migration contract.

### Task 6: Canonical group publications, unread notifications and sender navigation

**Files:** Create src/social-community-publications.js; modify src/social-state.js, src/social-reactions.js, src/social-profile-policy.js, src/social-community-view.js, src/social-view.js, src/phone-notifications.js, src/social-background.js only merge ownership if needed, src/social-dialog-view.js, src/social-messages-view.js. Tests: test/community-publications.test.js (new), test/community-unread.test.js (new), existing social reaction/background/message tests.

**Interfaces:** publicCommunityPosts(state,{communityId,nowMinute}) -> [{id,communityId,at,kind,authorId,authorName,body,judgeId?,roundId?,battleId?}] sanitized published-only; publicAnnouncedJudges(state,{battleId,roundId,nowMinute}) -> [{id,name,announcedAt,profileUrl}]. markCommunitySeen(state,{communityId,nowMinute}) -> {ok,state}; communityUnreadCounts(state,{nowMinute}) -> {total,byCommunity}. Keep existing publicJudgeAnnouncements export as adapter. Read markers reside in foreground-owned social state with timestamp+stable-ID cursor semantics.

- [ ] **Step 1:** Test first/new judge times spread through a seven-day window, no early profile exposure, published theme-author exception, admin attribution and distinct truthful copy, static reactions; legacy published posts/votes remain visible. Test subscribe baseline, two future posts yield badge 2 and exactly two durable phone IDs, visible visit clears, repeated unchanged mark-seen preserves state identity, unsubscribed no phone flood, same-minute IDs, reload and stale Worker reply preserve marks. Test heading/author/avatar typed navigation for community/person/self.
- [ ] **Step 2:** Run `node --test test/community-publications.test.js test/community-unread.test.js` plus existing affected social tests; capture RED.
- [ ] **Step 3:** Build canonical publication projection without dependency cycles (do not call profileAccess from its source). Persist migration cutoff/cadence where needed. Adapt wall, access, reactions, groups sorting and phone to same IDs/timestamps. Marking displayed posts read also retires their queued group-post notices, so leaving the PC does not show already-read posts; personal-message notices are untouched. Implement semantic name links in both dialog kinds; no route from display name. Preserve immutable foreground ownership during Worker merges.
- [ ] **Step 4:** Run focused/full suite and native open-group/badge/read/notification/dialog navigation checks. Document publication schema and new API exactly for Tasks 7/8.
- [ ] **Step 5:** Commit and report.

### Task 7: Installed-app research jobs and public evidence

**Files:** Create src/rap-research.js and src/rap-research-sources.js; modify src/rap-analysis.js, src/judge-dossier-analysis.js, src/virtual-pc-state.js, src/home-creative-work.js, src/beat-work-view.js and creative-work mutual exclusion call sites. Add test/rap-research.test.js; extend test/rap-analysis.test.js and normalization/job tests. UI routing belongs to Task 9.

**Interfaces:** normalizeRapResearch(raw) -> {version:1,job,findings,nextSequence,recovery}; startCaseStudy(state,{kind,battleId,roundId,characterId,heroSnapshot,nowMinute}) -> existing {ok,state,reason,jobId?,findingId?}, kind in battle/round/judge/opponent. advanceCaseStudy(state,{gameMinutes,nowMinute}) -> existing work-result shape; pauseCaseStudy(state) -> state. Store in state.rapResearch, foreground-owned. Public source provider consumes Task 6 canonical announcements and current published tournament track/review APIs; exports caseStudySources(state,request) -> {sourceIds,reviewIds,judgeIds,trackVersionIds,cutoff}. Finding stores kind/subject, frozen IDs/cutoff/heroSnapshot, createdAt and explicit empty evidence result. Completed per-track observations reuse existing study policy and immutable report shape in rapAnalysis.reports, not duplicate a new truth evaluator.

- [ ] **Step 1:** Test every track/judge/case start and resume refuses without installed dossier; uninstall preserves records. Battle/round takes 360 game minutes at 45/8 minutes/sec; track/judge/opponent takes 45 (bulk opponent evidence still simulated). Pause/needs/reload resumes remaining time, all creative jobs mutually exclusive. Freeze cutoff: later sources are not included; no sources completes unknown; unchanged repeat gives no new XP; malformed/missing source job recovers/pauses. Published prior opponent data only, future roster/work excluded. Bulk job makes zero audio engine calls and produces bounded finite reports.
- [ ] **Step 2:** Run `node --test test/rap-research.test.js test/rap-analysis.test.js` and related judge tests; capture RED.
- [ ] **Step 3:** Implement validated separate job/finding state, installed gate shared by old/new study functions, reusable pure report construction and public source snapshots. Integrate descriptor/time/needs/pause and dynamic duration label. No invented historical reviews; old-season listening demos do not prove judge taste. Keep existing competence gates and completed report immutability.
- [ ] **Step 4:** Run focused/full suite including previous job normalization, installed fixture updates and Worker merge protection. Report interfaces/return schemas for Tasks 8/9.
- [ ] **Step 5:** Commit and report.

### Task 8: Public case graph and subjective forecasts

**Files:** Create src/rap-dossier-cases.js and src/rap-dossier-forecast.js; extend src/rap-dossier.js only compatibility needed; test/rap-dossier-cases.test.js and test/rap-dossier-forecast.test.js (new).

**Interfaces:** dossierCases(state,{nowMinute}) -> [{id,title,battleId?,kind}]; publicDossierCase(state,{caseId,nowMinute}) -> {id,title,nodes,edges}, nodes have stable id, kind battle/round/track/judge/opponent/forecast, title, public subject IDs, status, profileUrl?, reportIds, findingIds, sourceIds, action request for startCaseStudy/startTrackStudy where allowed. Registration creates battle case; submitted immutable versions link own track. My Recordings includes exported immutable versions. publicTrackForecast({report,judgeHypotheses=[],scale=50,comparisonReport=null}) -> {status,range:null|[lo,hi],comparison,confidenceText,sources,label:'Моё предположение'}. Inputs are reports/learned hypotheses only, never state/judge-private configuration. Scale comes from public round rules; pair rounds show comparison instead of invented numeric total.

- [ ] **Step 1:** Test application-only case, linked own version, public current/prior round folder, discovered announced judges and current known opponent; no future round/hidden judge/unpublished works. Empty/old/corrupt reference stays explicit and navigable. Test no report yields unavailable; low-skill report gives broad range (at least 45% of scale), higher-evidence narrows but never below 15%, changed private judging data does not change forecast; missing/comparison unknown and mismatched report versions do not fabricate win certainty. Prior saved reports stay byte-identical.
- [ ] **Step 2:** Run `node --test test/rap-dossier-cases.test.js test/rap-dossier-forecast.test.js`; record RED.
- [ ] **Step 3:** Project bounded active case from sanitized source APIs; deterministic nodes/edges with battle center, own track and subordinate forecast, rounds/judges/opponent connections. Before battle/round study, the folder is available but judge cards are undiscovered; a completed finding reveals its public judge IDs, and later announcements add unknown cards only to that researched folder. Forecast center comes from mean subjective band midpoints, uncertainty from report confidence and relevant learned judge evidence, clamped to public score scale. Qualitative pair comparison only when both reports support it; missing axes expand uncertainty. Do not run judging or decode audio. Cache by relevant immutable refs/publication boundary, not full JSON history per frame.
- [ ] **Step 4:** Run focused/full suite and instrument projection on 20 tracks/multiple rounds; report no-leak tests and immutable outputs.
- [ ] **Step 5:** Commit and report public node/action schemas for Task 9.

### Task 9: Detective caseboard and research routing

**Files:** Replace src/rap-dossier-view.js presentation; add src/rap-dossier-board-view.js if needed for SVG layout responsibility; update dossier CSS, src/social-view.js, src/rap-analysis-view.js, src/social-audio-view.js and profile research view, src/virtual-pc-ui.js routing. Add test/rap-dossier-board.test.js and test/social-study-routing.test.js.

**Interfaces:** mountRapDossier keeps getState/getMetadata/commit/navigate and adds existing on-study/app-focus callbacks as needed, documented to controller. It consumes Tasks 7/8 node actions and only public case graph. Social Study affordances request dossier focus with target IDs, never mount a report. All research detail/report views render inside dossier.

**Carried review minor:** Task4 row-local failure text can remain after a duplicate row successfully retries the same recording. Clear obsolete matching failure on a successful snapshot and cover the duplicate retry with a regression. Preserve Task4 releaseRows(root) ownership when replacing social/dialog subtrees.

- [ ] **Step 1:** Tests social me/groups/dialog/profile routes contain no analysis cards installed or not; installed Study opens target dossier, uninstalled routes to download with explanation. Board contains battle folder, submitted-track node with forecast beneath, public rounds/judges/opponent links; node selection shows focused detail, study launches correct frozen IDs. Test case switching, empty state, unavailable sources, keyboard/focus, narrow list, resize/fit and disposal without listener/RAF growth.
- [ ] **Step 2:** Run `node --test test/rap-dossier-board.test.js test/social-study-routing.test.js`; capture RED.
- [ ] **Step 3:** Build code-native dark blue-green board, cream paper, red pins/SVG connections matching supplied reference. Use CSS variables; restrained transitions/reduced motion. Deterministic layout with fit control and case/round selector, not drag physics. Detail pane separates fact, impression, forecast and sources; judges link to social profile where Study routes back to app. Keep results in app; dynamic work progress and explicit unknown/no-evidence text. Integrate old report access without requiring old social leak.
- [ ] **Step 4:** Run focused/full suite; native screenshots at three desktop sizes plus narrow fallback, verify graph connections and readable small forecast, transitions and no underlying camera input.
- [ ] **Step 5:** Commit and report screenshots/accessibility checks.

### Task 10: Week-long integrated regression, performance and cache release

**Files:** Create tools/verify-dossier-weekplay.mjs, test/dossier-weekplay-integration.test.js and docs/qa/2026-10-15-dossier-weekplay.md; mechanical rev42->43 asset/module cache graph including both Workers and root HTML. Reuse existing isolated QA helpers and only add focused helpers under tools/qa. Harden tools/verify-social-background-audio.mjs evaluation with a bounded watchdog closing the browser on timeout (Task3 deferred review finding); test timeout cleanup without a long wait. Product fixes require controller-approved scope if new root cause appears.

**Interfaces:** All prior task APIs; existing app public UI and test-only fixtures. No production debug endpoints or test-only methods.

- [ ] **Step 1:** Add integrated regressions for sleep plus installer/notifications, stale Worker after group read, research across published round transition, old save and damaged source recovery; verify baseline behavior before fixture expectations, no tautological source text assertions.
- [ ] **Step 2:** Run focused integration tests; new failing behavior goes back to owning task via controller, not silently waived.
- [ ] **Step 3:** Bump cache graph to rev43 mechanically; ensure imported modules/assets and both Workers agree. Run fresh native browser on isolated origin with SVG MIME checked. Exercise UI: install then leave/sleep; live 224-second manual week then wake; initial bedroom; food success/refusal; social player; downloads; dialog links; group posts/badges; install-only study; caseboard progression into next round and opponent. Preserve player origin/server.
- [ ] **Step 4:** Run `npm test`; 20-project stress plus repeated 30 reopen cycles, record frame/update p95 (targets 25/20ms), cold max, listener/node/RAF/audio lifecycle, native errors and asset failures. Three desktop sizes and narrow layout screenshots; inspect pixels. State any headless or listening limitations honestly.
- [ ] **Step 5:** Commit test/tools/cache/report only, with exact commands/results/evidence paths and remaining issues for final package reviewer.

## Controller self-review

Coverage: A->1, B->2, C->3/4/5, D->6, E->7/8/9, acceptance->10. Later user dialog addition is in 6; visual/subjective/round/opponent addition is in 7/8/9. Signatures and ownership above align; no task invents public judge truth. Each task has RED, implementation, focused/full GREEN and commit. Review Focus cases are owned explicitly. Existing completed rev42 package is out of scope except regressions caused by this package.
