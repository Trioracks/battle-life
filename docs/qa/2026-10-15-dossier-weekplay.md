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

The complete Node suite passed: 1,404 tests, 0 failures, 0 skipped (101.369 seconds). Focused integration/cache/fix coverage passed33/33. The full suite ran once on the final product and test tree.
