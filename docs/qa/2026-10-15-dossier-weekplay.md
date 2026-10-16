# Dossier weekplay release verification

Release cache revision: 43. Baseline: 91f6e6f97ead9de00b43a74070b6c3fb3e9d71b3.

The automated check uses the real apartment host in existing native Edge, fresh browser contexts, and an isolated server on port 4203. It never opens or seeds the player's 4173 origin. Output and browser temporary data stay under D:/Project/Battle/artifacts/dossier-weekplay/task-10. No dependency downloads or new media intake are required.

## Reproduction

Run from D:/Project/Battle:

```powershell
& 'C:/Program Files/nodejs/node.exe' tools/verify-dossier-weekplay.mjs
$env:SOCIAL_BACKGROUND_QA_DIR='artifacts/dossier-weekplay/task-10/pcm'
& 'C:/Program Files/nodejs/node.exe' tools/verify-social-background-audio.mjs
$env:npm_config_cache='D:/Codex/Caches/npm'
$env:npm_config_update_notifier='false'
& 'C:/Program Files/nodejs/npm.cmd' test
```

The native command includes an actual 224-second manual sleep. Its optional WEEKPLAY_SMOKE=1 development mode waits only two seconds and deliberately records passed:false; it cannot establish week-long acceptance. WEEKPLAY_QA_DIR selects a separate evidence directory. Every run creates a fresh context and closes its own browser/server.

The review supplement isolates the missing mounted-board publication transition without repeating the week:

```powershell
$env:WEEKPLAY_TRANSITION_ONLY='1'
$env:WEEKPLAY_QA_PORT='4205'
$env:WEEKPLAY_QA_DIR='artifacts/dossier-weekplay/task-10/transition-final'
& 'C:/Program Files/nodejs/node.exe' tools/verify-dossier-weekplay.mjs
& 'C:/Program Files/nodejs/node.exe' --test test/dossier-weekplay-integration.test.js test/rap-dossier-board.test.js test/rap-dossier-view.test.js
Remove-Item Env:WEEKPLAY_TRANSITION_ONLY
```

This mode uses a fresh isolated host save immediately before publication: completed prior selection and its saved two-entrant bracket, but no next-round record, theme or announcement. Normal apartment time advances from minute 13430 through 13440; the actual social Worker generates the new round. The dossier stays mounted throughout. Assertions require new round/opponent cards, increased Worker commits, unchanged mounted view identity, no pre-cutoff disclosure (also querying the resulting state at the earlier cutoff), no unstudied judge assignment/private fields, zero PCM requests, and actual round-source/opponent-profile navigation from the cards. The small fixture intentionally isolates publication; it does not replace the retained 40-project live-week stress evidence.

Final supplement passed on port4205: minute13430.884875→13440.012275 in36.7131 real seconds, ten additional Worker commits, same mounted dossier, zero PCM requests, and correct source/profile routes. No page errors or asset failures; owned resources, browser and server cleaned up. Evidence is `artifacts/dossier-weekplay/task-10/transition-final/evidence.json`; captures there are `before-round-publication.png`, `after-round-publication-1280.png`, `after-opponent-publication-1280.png`, `after-round-publication-390.png`, `published-round-source.png`, and `published-opponent-profile.png`. All six were visually inspected. The narrow capture shows the scrollable list's top/new-round boundary; desktop captures show both newly generated cards and their detail panels.

## Coverage

- Twenty completed beat/text pairs (40 projects and 40 plans), twenty durable exported recordings, and twenty completed observations in the whole apartment host.
- Initial bedroom, three desktop resolutions (1280×720, 1366×768, 1920×1080) and 390×844 narrow layout; SVG MIME and native image decode.
- Installer progress after leaving the desktop and during real manual sleep; explicit wake and queued phone notice; food acceptance/full refusal.
- Native stale social Worker after a group read; group badges and read retirement; person and community dialog routing.
- Download popover, install-only study routing, timed dossier installation, public social playback/pause/resume/stop, work camera, paused study, and zero PCM requests from research.
- Thirty reopen cycles covering social row ownership, dossier, paused jobs, global listeners, observers, intervals, RAF, Workers, DOM nodes and audio sources. Hidden dossier receives 180 updates with zero graph projections.
- Cross-system Node regressions cover research spanning a published round boundary, new opponent discovery without new judge knowledge, missing source observations, old/corrupt saves and quota rollback.
- SHA-256 comparison of 464 tracked assets/source-bank files and original exports, projects, plans, reports and version references; added NPC publication records are allowed, original archives must remain identical.

Only three approved narrow behavior fixes accompany the tests: group-notice footer, canonical legacy introduction copy under cadence quarantine, and a bounded PCM evaluation watchdog. Existing legacy reaction plans do not persist a body field; validated publication time equal to the announcement identifies the original canonical legacy copy. Public disclosure gates and assignment rules are unchanged.

## Evidence and limits

Detailed command output, measurements, screenshots and preservation hashes are local artifacts; they are not repository payload. The final native evidence is artifacts/dossier-weekplay/task-10/live-final/evidence.json and the full Node output is artifacts/dossier-weekplay/task-10/full.log.

Acceptance targets are whole-game frame p95 ≤25 ms and update p95 ≤20 ms. Cold maxima are reported independently, including the first caseboard render; they are not hidden by trimming warm-up samples. Native Edge runs headlessly. PCM rendering is objectively checked, but no claim of subjective listening is made.

Final native run passed with no page errors or asset failures. It stayed in manual sleep for 224.093 real seconds (10,084.77 game minutes), processed 895 Worker commits, retained five queued notices and woke only on the explicit wake control.

| Whole-game state | Frames | Frame p95 / max, ms | Update p95 / max, ms |
| --- | ---: | ---: | ---: |
| 40-project room | 360 | 8.1 / 47.1 | 3.5 / 5.8 |
| Initial caseboard | 360 | 8.1 / 293.4 | 0.9 / 24.5 |
| Caseboard 1280 | 360 | 8.2 / 32.1 | 0.9 / 30.8 |
| Caseboard 1366 | 360 | 8.2 / 16.1 | 0.9 / 21.0 |
| Caseboard 1920 | 360 | 8.2 / 16.1 | 0.8 / 19.6 |
| Live manual week | 28,677 | 8.1 / 23.9 | 3.2 / 19.8 |

The initial board's separate open/focus commands took 56.8/40.4 ms. The 293.4 ms cold frame gap is mostly outside the host update; no LongTask entry was observed in that measurement window. Its precise browser/compositor cause remains unprofiled.

Thirty closed-view baselines remained exactly: 376 DOM nodes, 21 global listeners, two resize observers (scene and PC shell), one host RAF, one social Worker, zero intervals, zero social rows and zero audio sources. Paused study data stayed identical. Explicit full-host disposal released all observers, Workers, intervals, rows and sources; the final browser/context close released remaining host callbacks. Hidden dossier projected zero times over 180 updates.

The six native PCM renders passed with distinct hashes, finite samples, no clipping, nonzero intended sections and unchanged saved descriptors.

The complete Node suite passed at release commit 9decad8: 1,404 tests, 0 failures, 0 skipped (101.369 seconds). Focused integration/cache/fix coverage passed33/33. The review supplement adds one test and QA helpers only; product code is identical to that full-suite baseline. The focused integration/board/view command passes18/18; the full suite and 224-second week were not repeated for this QA-only supplement.

## Consolidated final-review corrections

The final review wave, based on 80d254c, unifies saved-report validation across reload, reuse, finding reconciliation and forecast. Malformed supersedes metadata and incompatible source/version references quarantine the original report and dependent finding; both same-source case retry and direct track retry start replacement work without awarding source XP again. Valid historical reports remain readable after their original recording disappears.

Sanitized legacy card reports and quotations now remain reachable through the archive and relevant person/judge details. The projection uses the existing public card's publication, recording and profile gates, copies only public quote fields, preserves the original card, and never creates research findings. Quote details show attribution and calendar dates with a keyboard-usable source link or saved-report fallback. Card references invalidate the mounted board and domain cache. Mixed archive cards have separate positions.

Completed empty research now has an explicit card caption and detail with its public cutoff date. It differs from never studied and damaged-source states; it does not invent observations or reveal skill snapshots.

```powershell
& 'C:/Program Files/nodejs/node.exe' tools/verify-dossier-final-fix.mjs
& 'C:/Program Files/nodejs/node.exe' --test test/rap-analysis.test.js test/rap-research.test.js test/rap-dossier-final-recovery.test.js test/rap-dossier-cases.test.js test/rap-dossier-targets.test.js test/rap-dossier-board.test.js test/rap-dossier-view.test.js test/rap-dossier.test.js test/rap-dossier-forecast.test.js test/judge-dossier-analysis.test.js test/client-module-version.test.js test/v-krugu-revision.test.js
$env:npm_config_cache='D:/Codex/Caches/npm'
$env:npm_config_update_notifier='false'
& 'C:/Program Files/nodejs/npm.cmd' test
```

Final results: focused/cache **88/88**, complete suite **1415/1415**, zero failures/cancellations/skips, full duration **101030.5585 ms**. The cache checks cover revision43, the reachable application graph and both Workers. Logs are under `artifacts/dossier-weekplay/final-fix/` (`focused-final.log`, `full.log`). The final product/test/helper tree was unchanged after this full run.

Native evidence: `artifacts/dossier-weekplay/final-fix/native/evidence.json`, passed:true, errors:[], assetFailures:[], browserClosed:true and serverClosed:true. Existing native Edge ran headlessly in a fresh context on isolated4206 with browser scratch on D:. The real PC/dossier view exposed the legacy judge report with no fabricated findings, displayed the dated quote, and keyboard Enter opened `underweb://social/results/makarevich-1/selection`. SVG MIME was image/svg+xml and native decoded width150. Desktop archive cards did not overlap; completed-empty details were readable at1280×900 and390×844 with no document horizontal overflow.

All six captures were inspected: `legacy-judge-report.png`, `legacy-quote-attribution.png`, `legacy-quote-source.png`, `legacy-archive.png`, `completed-empty-study.png`, and `completed-empty-narrow.png`. The quote screenshot includes attribution, dates and source control; the source screenshot shows the public selection table.

This is focused native UI evidence, not a new whole-apartment timing or weekplay measurement. Timing/lifecycle code was unchanged, so the retained224-second week and cold-frame evidence above remain the applicable measurements. Headless/browser and subjective-listening limitations remain: no subjective audio claim, no claim that every cold frame meets the steady p95 target. The user's4173 origin, existing saves, frozen assets and prior evidence directories were untouched.
## Final independent review residual

Both Important final-review findings (report recovery/retry consistency and access to saved legacy quotations/judge reports) were fixed and accepted by the scoped re-review at `b058d0c`. One Minor presentation defect remains: if a completed empty study was damaged and quarantined, a later successful empty replacement can still show the old damaged-result caption. The new finding is saved correctly, retry works, and source credit is retained; historical recovery currently takes precedence in `src/rap-dossier-cases.js` when choosing this caption. This is explicitly deferred, not claimed fixed. Normal first-time empty studies show their completion and cutoff correctly.

Controller final verification on the completed product tree: `npm test`, 1,415 passed, 0 failures/cancelled/skipped, 103633.8215 ms, exit0. Full log: `artifacts/dossier-weekplay/controller-final-full.log`. No product changes followed this run; only this evidence note was added.
