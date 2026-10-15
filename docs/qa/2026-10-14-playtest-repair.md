# Playtest repair acceptance — 15 October 2026

This acceptance covers the 14 October repair specification and the user's additive experimental audio bank supplied on 15 October. The final integration base is `5078f4d8fdc20fb3adcb8d0fcd31df001963a7f5`. Independent whole-branch review is a separate controller gate after Task 11 review; this document does not claim that review is complete.

## Scope and reproduction

Client revision 42 traverses 190 reachable local modules and both social/PCM Workers, including `beat-user-experimental-bank.js`, `source-levels.js` and `source-levels-user-experimental-v1.js`. Vendor URLs and released geometry asset revisions retain their own identities.

Use installed Edge and existing Playwright. Set `PLAYWRIGHT_MODULE_PATH` to the installed runtime module and `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to Edge; set `npm_config_cache=D:/Codex/Caches/npm` and `npm_config_update_notifier=false`. Every native tool places TEMP/TMP below its D-drive artifact directory. Run each command serially, with a distinct `FT_QA_DIR` under `D:/Project/Battle/artifacts/task-11/`:

```powershell
node tools/verify-long-campaign.mjs --label=final
node tools/verify-battle-fps.mjs
node tools/verify-playtest-layout.mjs
npm test
```

All three native tools default to isolated `http://127.0.0.1:4191` and reject port 4173. Browser contexts are fresh; the player's origin/save is never loaded. The layout tool may also use an explicitly supplied isolated `BATTLE_QA_URL`. No browser, engine or dependency installation is required.

## Acceptance coverage

- Campaign progression at 1/5/10/20 beat/text pairs, with 20 meaning forty completed plans plus a separate active project. Exact project/plan histories are compared while walking, using FT Studio and doing work.
- FT Studio, notebook, Underweb and torent at 1280×720, 1366×768 and 1920×1080. Thirty reopen/play/occlude/close cycles at each size capture RAF/audio/DOM/listener resources and background transfer progress. Every app p95 is asserted before PASS; maxima remain separate evidence.
- Twenty recorded vocals on the twenty-pair fixture, full/beat/vocal files and concurrent export, delayed real social Worker replies while browser files, phone presentation and a partial upload change. Upload/file/version binding survives persistence and actual host reload; a submitted track proceeds through acknowledgement, judging and final history. The explicit future-clock catch-up exercises lifecycle; it is not described as time spent creating the long campaign.
- New, legacy, damaged-section and invalid saves plus storage rejection. Invalid raw bytes and the last durable save are preserved. Frozen exports, versions, submissions, judging and tournament history survive removal of editable projects and progression.
- Default contextual apartment controls, result navigation labelled “Группа”, current Underweb/group/messages layouts, keyboard focus, adaptive full score tables, background activity, all three native sizes.
- Download/installer timing, first phone delivery and task-specific audio/recording behaviors retain their independent targeted tests. The combined suite is run as the final gate.

## Evidence and current results

Campaign measurements are in `artifacts/task-11/campaign-v1/final.json`: all six work scenarios and all three desktop resource scenarios passed their budgets. The later functional assertion failed because of QA fixture metadata and JSON key order; that failure remains in place. The authoritative functional-only run is `campaign-integration-v5/final-integration.json`, exit 0, with 20 pairs/40 plans/20 vocals, four exports, 1113 retained judging records, real late Worker/save compatibility/quota checks and literal browser reload. Canonical SHA-256 hashes match for exports, versions, submissions, tournaments and judging after reload. The earlier functional failures, structural comparison evidence and v3 host-load pass remain separately preserved. V4's attempt to duplicate the whole expected archive in sessionStorage exceeded its quota; v5 retains only compact hashes there.

| Campaign work | FPS | Update p95 / max ms | Frame p95 / max ms |
|---|---:|---:|---:|
|1 pair,1280×720|122.8|4.6 /10.3|7.1 /173.6|
|5 pairs,1280×720|139.3|3.8 /10.7|7.1 /27.7|
|10 pairs,1280×720|137.8|4.5 /12.4|7.1 /27.7|
|20 pairs,1280×720|137.1|4.1 /20.8|7.1 /27.8|
|20 pairs,1366×768|134.9|4.8 /26.5|7.1 /34.7|
|20 pairs,1920×1080|136.4|4.4 /21.8|7.1 /27.8|

All twelve desktop app measurements had frame p95 7.1ms and update p951.2–4.7ms. The largest desktop frame was270.9ms during FT profiling; it is retained. At each size,30cycles ended at the exact baseline:185event listeners,720DOM nodes,372connected elements, one document, zero studio RAF/audio/retiring nodes and zero settled cue nodes. Background transfers advanced4.27–4.28MB.

Campaign-v1 and the final gates use the same game code. The SHA256 of sorted tracked `src/`, `index.html` and `desktop-apps.css` path+byte sequence (213files) is `ed03782281a3fb3529ad96b3158934e2ca2be069c390ab08cde66aa0616ab0dc`. After campaign-v1, only QA fixture/harness/docs were corrected, so the controller explicitly retained its successful profiles without repeating expensive native measurements.

FPS passed all 36 scenarios in `artifacts/task-11/fps-v1/battle-fps-regression.json`, with exact synchronous/Worker archive parity, reload, quota failure/retry, errors `[]` and closed browser/server. Each row below takes maxima across that size's twelve scenarios; these columns deliberately retain occasional stalls:

| Resolution | FPS range | Update p95 / max ms | Frame p95 / max ms | Save max ms | Long-task max ms |
|---|---:|---:|---:|---:|---:|
|1280×720|132.8–144.0|4.9 /57.9|7.1 /201.5|93.5|188|
|1366×768|133.1–144.0|4.3 /55.3|7.1 /187.4|91.8|187|
|1920×1080|131.2–144.0|4.6 /59.6|7.1 /173.6|86.8|180|

The authoritative layout run is `artifacts/task-11/layout-v3-assets/results.json`: all three resolutions pass, errors `[]`, and all nine shell image nodes per size return HTTP 200, `image/svg+xml`, successful decoding and positive natural width. Frame p95/max was 7.0/7.1 ms; update p95 2.6/1.2/1.5 ms and maxima 4.0/1.2/2.2 ms. All 5/23 judge scores remain visible, with adaptive selection pagination of 5/6/15 rows and all 27 wide-table columns fitting. Wide tables were inspected at all sizes; corrected home/group screenshots confirm visible Start/app/caption glyphs. Layout-v1's cold-load PNG readiness failure and `layout-assets-red`'s SVG MIME failure are preserved; the verifier waits for decoding and checks actual image resources.

Controller visual review caught blank shell glyphs in the earlier QA screenshots. The isolated servers had omitted SVG MIME handling, serving these files as generic binary data. Production assets/code were correct; the prior Task 8 host screenshot shows the glyphs. All three QA servers now serve `image/svg+xml`. Preserved campaign/FPS profiles predate this QA-only MIME correction and therefore do not include successfully rendered SVG shell glyphs. The controller directed retaining those expensive profiles and doing scoped resource/screenshot verification; the corrected three-size layout run above supplies the current asset-complete timing check. Earlier blank-icon screenshots are historical, not final visual acceptance.

Final `npm test` passed 1,260/1,260 tests, zero failures/skips, in 110338.312 ms; log `artifacts/task-11/full-test-final.log`. The earlier full log remains with its two stale revision-41 expectation failures; both tests now enforce revision 42. Focused final revision checks passed 9/9 and scoped acceptance checks passed 12/12. No dependency or engine update was performed.

Raw samples, profiles, failure JSON and screenshots remain under `artifacts/task-11/`. The original baseline and historical failures remain under `artifacts/v-krugu-qa/long-campaign/`; no previous result is replaced by a passing rerun. Existing campaign labels and FPS/layout evidence directories are protected against overwrite. Historical 20-pair update p95 was 257.2/265.9/266.0 ms at the three sizes; maxima 299.8/311.8/381.9 ms.

## Limits and retained provenance

Native targets are p95 frame ≤25 ms and p95 main update ≤20 ms. FPS is computed from sampled requestAnimationFrame intervals in installed headless Edge; maxima and frames over 100 ms are retained, not treated as equivalent to the p95 requirement. These bounded scenarios are not a universal hardware or every-scene guarantee.

Task 12's existing native evidence is `artifacts/user-experimental-v1/native/{evidence,legacy-comparison,unchanged-base-repeat}.json`: 28 decodes, 28 exact Worker/prepared-PCM matches, 14 recipes, nine immutable exports and actual page reload. Source descriptors/exports/prepared PCM remain exact; final native mixed PCM has pre-existing ≤2e-7 browser summation variance. No byte-identical final WAV or subjective-listening claim is made. Revision changes do not regenerate or recalibrate sources.

The 28 supplied raw originals are recoverable from the three role archives below `stems/janres/non/{drums,bass,keys-leads}/90bpm/user-2026-10-15/`, with hashes in their manifests. The verified duplicate intake was emptied by Task 12; this acceptance performs no source deletion.

Task 10's authoritative evidence is `artifacts/task-10/final-v3/native-evidence.json`. Its offline Blender builder reported a 75.65 MB allocator warning and one exit-0 failed export; the delivered asset was recovered through hash-verified staging. No Blender rebuild or dependency change was performed during final acceptance. Any future required Blender invocation must include `--python-exit-code 1`.
