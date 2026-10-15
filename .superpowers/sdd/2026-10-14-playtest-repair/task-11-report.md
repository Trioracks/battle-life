# Task 11 — final integration acceptance

Implementer status: DONE_WITH_CONCERNS. All scoped implementation and gates below are verified. Retained limits: pre-SVG-MIME-fix campaign/FPS profiles, explicitly scoped corrected visual checks, bounded headless measurements, and upstream Task 10/12 limitations. Independent reviews remain the controller's next step.

Base: `5078f4d8fdc20fb3adcb8d0fcd31df001963a7f5`, existing `codex/sloboda-workflow-design` checkout. Completion date: 15 October 2026. The Task 12 user-approved additive bank is included. Controller owns independent task review and the single broad branch review; no implementer helpers/reviewers were dispatched.

## Implementation

Added shared native sample summaries/target assertions, default combined campaign/work/resource acceptance, 30 reopen cycles at all three sizes, separate browser integration using twenty recorded beat/text pairs, real delayed Worker ownership, immutable file submission/lifecycle, save compatibility and quota rollback. Every desktop app now asserts its p95 targets. Existing historical baseline/failures are preserved and reused artifact labels fail explicitly. Raw app/work samples and CPU profiles retain maxima.

Adapted FPS/contextual controls and three-size serial scenarios, retained raw samples/failures, protected browser/server acquisition and cleanup. Layout verification self-hosts on isolated 4191. Software verifier acquisition is inside cleanup protection. Results back navigation now says “Группа”. Revision tool traverses local imports and Worker URLs and writes revision 42 through 190 modules; additive bank/facade/calibration modules are verified reachable. Geometry/vendor identities and old calibration content remain unchanged.

## RED / GREEN

Required skills were read directly: implementer prompt, TDD and writing-good-tests, verification-before-completion. Direct apply_patch could not follow the workspace reparse point; used the approved installed apply-patch entry through scoped elevated PowerShell for all source/document edits. All shell calls used `sandbox_permissions=require_escalated` because the default helper is known broken.

RED: `node --test test/v-krugu-revision.test.js test/battle-results-table.test.js test/playtest-acceptance.test.js` exited 1: 10 tests, 6 pass, 4 fail, duration 477.2178 ms. Expected failures: missing `← Группа`, missing `assertNativeTargets` function, entry still rev41 rather than42, first graph edge `apartment-app.js → apartment-v3-motion.js?rev=41`. Combined late-Worker ownership was an existing-behavior characterization and passed before changes.

Cleanup probe baseline: `node --test test/native-qa-cleanup.test.js` exited 0, 1/1, 837.5177 ms. Node already exited promptly on an uncaught launch error; no false RED claim is made. The resource acquisition was still moved inside the requested explicit finally protection.

GREEN after fixes: same focused set plus cleanup, 11/11 pass, fail0, 870.2103 ms. Extended focused command:

```powershell
node --test test/playtest-acceptance.test.js test/native-qa-cleanup.test.js test/v-krugu-revision.test.js test/battle-results-table.test.js test/creative-performance.test.js test/pc-audio-exports.test.js test/pc-browser-downloads.test.js test/phone-presentation.test.js test/social-background.test.js test/user-experimental.test.js
```

Exited 0: tests54/pass54/fail0, duration6228.6737 ms. No warnings. `node --check` passed for campaign, workflow helper, FPS and layout harnesses.

## Serial native gate

Environment for every native run:

```powershell
$env:PLAYWRIGHT_MODULE_PATH='C:/Users/zubko/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
$env:npm_config_cache='D:/Codex/Caches/npm'
$env:npm_config_update_notifier='false'
```

Controller was notified before profiling to avoid competing load. Each run gets its own D-drive `FT_QA_DIR`, logs and browser temp. Port4173 never loaded. Native measurements, full-suite result, final file list and self-review are appended after execution.

### Campaign and functional workflow

`FT_QA_DIR=D:/Project/Battle/artifacts/task-11/campaign-v1; node tools/verify-long-campaign.mjs --label=final` completed6work and3desktop gates, each enforcing p95.30cycles at each size (90total) had exact stable185listeners/720nodes/372connected elements/1document, zero settled studioRAF/audio/retiring/cue nodes. Transfer bytes progressed4268584.500011444/4280814.000007629/4273839.000003815. Raw per-app samples, CPU profiles and screenshots remain in that directory. Work/FPS table and maxima are in the committed QA document; desktop max270.9ms and work max173.6ms remain visible. No maximum was discarded for a percentile-only claim.

The command exited1 only after all performance/resource gates, at the added functional assertion `recorded project archive preserved`. Diagnosed exact cause with Node `isDeepStrictEqual` and captured native actual/expected arrays. First fixture mistake: assigning battleId directly left derived battleName=`Вне баттла`. Added RED test: `node --test test/playtest-acceptance.test.js`,3tests/2pass/1fail,459.3168ms (`null !== makarevich-1`). Fixed fixture to pass optional battleId through real createBeat/createLyric commands. GREEN with creative-performance:7/7,761.0274ms.

Functional-only v2 still failed because JSON property ordering changes on normalization; captured exact arrays in `campaign-integration-diagnostic/final-integration-failure.json` (2.6MB). Read-only Node comparison returned `structurally equal true`, first structural difference `null`. Corrected QA to canonical value comparison; production state logic was unchanged.

First successful functional command: `FT_QA_DIR=D:/Project/Battle/artifacts/task-11/campaign-integration-v3; node tools/verify-long-campaign.mjs --integration-only --label=final`, exit0. Output: pairs20/completedPlans40/recordedVocals20/exports4/lateNativeWorkertrue/partialUploadSeconds0.75/totalUploadSeconds2/submissionId`makarevich-1:selection:1:player`/finalStatuscomplete/judgingResults1113/immutabletrue/quotaRollbacktrue/legacytrue/emptytrue/damagedtrue/invalidRawPreservedtrue. This loaded the saved state through a new actual app document. Native errors[]; browser/server cleanup confirmed. Personally inspected `final-campaign-results.png`: current group back link, complete selection table, final-round navigation and pagination visible.

Strengthened verification to a literal `page.reload()` and all five frozen domains. V4 failed in QA expectation storage: duplicating the uncompressed final archive exceeded sessionStorage quota; the game's durable save was successful. This failure remains in `campaign-integration-v4/`. Store only canonical SHA256 expectations across reload, preserving every actual game save byte. Final command uses `FT_QA_DIR=D:/Project/Battle/artifacts/task-11/campaign-integration-v5`, same `node tools/verify-long-campaign.mjs --integration-only --label=final`, exit0, same counts plus actualPageReloadtrue and hashes in `final-integration.json`. Exact hashes: audioExports`f65c83ae8f489019da47f1c39643cc09d6fb63be42c6529c93832a614f718611`; trackVersions`0cc038357467be95f6a695b60d8628706a0964f7f2fde891c6474818fc25375d`; battleSubmissions`b344ed0b39a47fdfa1a9c58a62bcc26f282379244a06c1d3be10d2348ca586f6`; tournaments`4fb6ddd6ba9759bade47610c8f180b460e153c1a8a975885cc89c53d9c40d748`; judging`af799ead7ac750def0931a06caa3bf55350f9cb28de55d9df1deb5766c4d1310`.

The controller directed retaining campaign-v1 successful expensive profiles after QA-only corrections. All game code is unchanged since that run. Runtime-tree fingerprint:213tracked files (`src/`,index.html,desktop-apps.css), SHA256`ed03782281a3fb3529ad96b3158934e2ca2be069c390ab08cde66aa0616ab0dc`, computed by hashing sorted path+NUL+bytes. Failures and maxima remain separately preserved, not overwritten by v3 success. No broad profiles were rerun.

### FPS and layout

`FT_QA_DIR=D:/Project/Battle/artifacts/task-11/fps-v1; node tools/verify-battle-fps.mjs`, exit0.36 rows across all3sizes. `base=http://127.0.0.1:4191`, passed/parity/reload/quotaRetry true, errors[], browserClosed/serverClosed true. Size1280: FPS132.819–144.003, update p95 max4.9/max57.9ms, frame p95 max7.1/max201.5ms, save max93.5ms, long task max188ms,2frames>100ms. Size1366: FPS133.069–143.997, update4.3/55.3ms, frame7.1/187.4ms, save91.8ms, long task187ms,1frame>100ms. Size1920: FPS131.196–143.997, update4.6/59.6ms, frame7.1/173.6ms, save86.8ms, long task180ms,1frame>100ms. Full per-label samples, long tasks and failed-save latched-state evidence retained; a save failure is a test case, not a hidden page error.

Layout command: `FT_QA_DIR=D:/Project/Battle/artifacts/task-11/layout-v1; node tools/verify-playtest-layout.mjs`, exited1 at group img.complete false before PNG had decoded on the new cold self-host. Exact failure/screenshot saved. Trace confirmed PNG URL/mime was valid; fixed harness to await img.decode(), keeping naturalWidth assertion. No production change. Rerun with `FT_QA_DIR=D:/Project/Battle/artifacts/task-11/layout-v2`, exit0: all3sizes and focus/vote/table assertions pass, errors[]. Frame p95/max7.0–7.1/7.1ms, update p95 1.5/1.6/1.5ms, max1.7/2.0/1.6ms. Full5/23judge score coverage,27wide columns, adaptive5/6/15selection rows; no horizontal clipping. Personally inspected all3 `table-wide-WIDTH.png` screenshots.

Self-review replaced the cleanup regression's machine-specific Playwright dependency with a one-method failing-launch fixture at the external browser boundary; it still runs the real verifier and acquires the real HTTP server. The original real invalid-Edge-path probe is retained in this report. Final focused command `node --test test/native-qa-cleanup.test.js test/playtest-acceptance.test.js test/v-krugu-revision.test.js test/battle-results-table.test.js` exited0:12/12,549.254ms, no warnings.

### Controller visual finding and resource correction

The controller saw three blank caption buttons and a broken Start image in layout-v2. Traced createPcIcon to the real `.svg?rev=35` assets. Campaign/FPS/new layout QA servers omitted `.svg` from MIME maps; software QA already served `image/svg+xml`. Prior `artifacts/task8-browser-downloads/browser-1280x720.png` shows all glyphs correct with proper MIME. The prior existing4190 host was unavailable to read-only GETs during this check; no player's4173 origin was loaded.

Added a real browser resource guard, then ran layout at width1280 with `FT_QA_DIR=artifacts/task-11/layout-assets-red`: exited1, `/assets/ui/virtual-pc/icons/computer.svg SVG MIME`, actual`application/octet-stream`, expected`image/svg+xml`. Failure screenshot/JSON/log retained. Corrected all three QA server MIME maps; no production assets, source or styles changed. Native GREEN `FT_QA_DIR=D:/Project/Battle/artifacts/task-11/layout-v3-assets; node tools/verify-playtest-layout.mjs`, all3sizes exit0, errors[]. Each size checks9actual shell image nodes: HTTP200, MIME image/svg+xml, decodedtrue, naturalWidth150. Personally viewed corrected home-1280/group-1280 screenshots: Start, app, minimize, restore and close glyphs visible. Final layout frame p95/max7.0/7.1ms; update p95 2.6/1.2/1.5ms, maxima4.0/1.2/2.2ms; all focus/table checks pass.

The controller explicitly requested scoped asset/screenshot verification instead of full profile reruns. Preserved campaign/FPS measurements predate the QA SVG MIME fix, so they lacked successfully rendered shell glyphs. This limitation is stated in the QA document; current asset-complete layout timings pass at all three sizes. No claim is made that the old blank-icon screenshots represent final visuals.

### Full-suite RED and required retry

First `npm test *> artifacts/task-11/full-test.log` exited1:1260tests,1258pass,2fail,113378.4261ms. Both failures were stale revision41 expectations: `home integration invalidates every changed dependency and its importers with one canonical URL` (`test/client-module-version.test.js`) and `entry loads versioned Sloboda stylesheet and module, and host feeds game metadata` (`test/virtual-pc-xp-entry.test.js`). Kept both graph/metadata contracts and changed their package revision to42. Focused command `node --test test/client-module-version.test.js test/virtual-pc-xp-entry.test.js test/v-krugu-revision.test.js`:9/9 pass,512.0855ms. No unrelated failures were omitted. A fresh full run is required and uses `full-test-final.log`, preserving the failed log.

### Self-review evidence

Batched Git object comparison against5078f4d stripped only query revisions and CRLF:138changed runtime modules; only `src/battle-results-table-view.js` has a non-revision semantic diff (the requested visible navigation label). Runtime fingerprint remains exactly `ed03782281a3fb3529ad96b3158934e2ca2be069c390ab08cde66aa0616ab0dc`. `node tools/bump-package-client-revision.mjs` returns revision42/visited190/updates[]; canonical graph is idempotent and includes both Workers/new source facade. `Get-NetTCPConnection -LocalPort 4191,4188 -State Listen -ErrorAction SilentlyContinue` returned no listeners after the native tools closed. Source calibration, audio assets, Blender outputs and user origin remain untouched.

### Final full-suite GREEN

Exact final PowerShell command:

```powershell
$env:npm_config_cache='D:/Codex/Caches/npm'
$env:npm_config_update_notifier='false'
$env:TEMP='D:/Project/Battle/artifacts/v-krugu-qa/browser-temp'
$env:TMP=$env:TEMP
npm test *> artifacts/task-11/full-test-final.log
$taskExit=$LASTEXITCODE
Get-Content -LiteralPath artifacts/task-11/full-test-final.log -Tail 18
exit $taskExit
```

Exit 0. Tests 1260, pass 1260, fail 0, cancelled 0, skipped 0, todo 0, duration_ms 110338.312. Full output preserved. Search for failing-test markers, warnings and npm notices returned only the passing counters; output is pristine. This second full run was required by the first run's two observed failures, not an unchanged status rerun. All targeted behavior tests are included in the full suite. `git diff --check` is clean. Branch confirmed `codex/sloboda-workflow-design`.

### Reproduction commands and file scope

After setting installed Edge/Playwright and D-drive environment shown above, the authoritative commands/destinations are:

```powershell
$env:FT_QA_DIR='D:/Project/Battle/artifacts/task-11/campaign-v1'
node tools/verify-long-campaign.mjs --label=final
$env:FT_QA_DIR='D:/Project/Battle/artifacts/task-11/fps-v1'
node tools/verify-battle-fps.mjs
$env:FT_QA_DIR='D:/Project/Battle/artifacts/task-11/layout-v3-assets'
node tools/verify-playtest-layout.mjs
$env:FT_QA_DIR='D:/Project/Battle/artifacts/task-11/campaign-integration-v5'
node tools/verify-long-campaign.mjs --integration-only --label=final
```

These name existing preserved evidence; choose new output directories/labels when reproducing because overwrites are rejected. Actual chronological native runs and all failures are detailed above. Normal origin is4191; all browser contexts are fresh. No profiling runs overlap. The full suite runs after native tools have closed.

Changed tracked files:138runtime modules (mechanical revision42 imports/Worker URLs; only the requested group navigation label changes behavior), index.html, desktop-apps.css; tests `battle-results-table`, `client-module-version`, `v-krugu-revision`, `virtual-pc-xp-entry`, and `helpers/long-campaign-fixture`; tools `bump-package-client-revision`, `verify-battle-fps`, `verify-long-campaign`, `verify-pc-software`, `verify-playtest-layout` and mechanical cache-key updates to `verify-phone-hud`, `verify-retired-drums`, `verify-social-shell`, `verify-social-submission`, `verify-track-version`.

New files: `tools/qa/acceptance-metrics.mjs`, `tools/qa/final-workflows.mjs`, `test/playtest-acceptance.test.js`, `test/native-qa-cleanup.test.js`, `test/helpers/failed-browser-launch.cjs`, `docs/qa/2026-10-14-playtest-repair.md` and this report. Total planned scope:162files. No source-bank regeneration, calibration rewrite, production diagnostic API, unrelated backlog staging, push or merge.

Final staging inspection confirmed exactly 162 scoped files, with zero backlog/stems/assets paths staged. All five final QA-tool syntax checks and `git diff --cached --check` passed. Existing unrelated untracked files remain. The controller owns the following independent task review and one broad final branch review.

## Retained limitations and upstream evidence

Task12 native results and limitations are carried verbatim in substance to the committed QA document: exact descriptor/export/prepared-PCM identity, existing ≤2e-7 final native graph variance, no subjective listening or byte-identical final WAV. Original28 raw files remain recoverable in the drums/bass/keys-leads role archives, intake verified empty by Task12. No independent regeneration was performed.

Task10 authoritative final-v3 evidence is retained. Offline builder allocator warning75.65MB and exit0 failed export recovered by hash-verified staging remain documented; no rebuild/engine/dependency upgrade was performed. Ordinary FT lanes retain lazy REC attachment and existing audio ownership. Broad independent branch review remains the controller's subsequent gate and is not claimed by this implementer.
