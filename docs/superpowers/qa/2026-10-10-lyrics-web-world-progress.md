# Progress — plan: docs/superpowers/plans/2026-10-10-lyrics-web-world.md

Baseline: 18115e3, 562/562 tests, clean repository. Branch codex/lyrics-web-world.

Pre-flight: Task2 owns beat production, Task5 owns lyric production; share only music.needs and existing job callback. Root integrates callbacks and cache version. Task3 owns catalog/web; Task5 supplies notebook catalog additions by coordination. Task4 feeds Task3 date-aware routing. Task1 keeps view API unchanged.

Ruling: Autonomous implementation and safe choices instead of review pauses — explicit user request to finish while away. Risk: choices may require tuning tomorrow, so document them and preserve Git checkpoints.
Ruling: Fictional forum participants and original posts instead of invented offensive real-person quotations — maintain period atmosphere without false attribution. Cost: names differ from examples.
Ruling: Preserve archival sound profiles; new scoring applies to newly completed layers/projects — preserve user work and avoid silent remastering. Cost: existing projects may retain old sound.

## Implementation status

- Task 1 implemented. Native renderer verification passes shared geometry/material/target identity, lights/door/clock state, 2D picking, sleep, monitor and creator preview. Root inspected matched camera captures.
- Task 2 implemented. Native Web Audio renders 0/5/10/30/90/99/100/110; all retain 470,400 frames at 44.1 kHz (90 BPM), finite output, unchanged source hashes. First drums are processed too. Dry100 error approximately 2.7e-8. Pause/resume and failed graph cleanup pass.
- Task 3 implemented. Independent review's midnight input and reply-history findings fixed RED/GREEN; re-review accepted with 18/18 targeted tests. Actual PC browser preserves caret/name/address/search and rejects reply501 explicitly without deleting history.
- Task 4 implemented and audited: 244 three-day issues, 2012-09-01 through 2014-08-31, eight categories, 234 distinct source URLs. Full source ledger checked against data. Corrected Steam timezone/region/early-access/episode distinctions; current store metadata is not presented as proof of a historical Steam launch. Direct HTTP check reached 233/234 sources; the XSEED connection timeout was separately checked through the web reader and is documented, together with secondary sources and two current publisher-store fallbacks.
- Task 5 implemented. Final revision26 native game scenario passed actual installation, battle/free choice, keyboard work/camera, reload/resume, all three stages, additions, adaptation, persistence, modal Tab/Escape and 640/1280 layouts. Existing FT full workflow also passes hunger/food/resume, hidden-page audio gating, nine lanes and real Play/Pause/Stop.
- Task 6 complete. Final canonical revision26 suite: 627/627 passed, zero failures (24,410 ms). Root reran native notebook, FT beginner, shared scene, sound result and Underweb scenarios; all passed. Independent reviewers accepted regression fixes with no remaining Critical/Important findings in their reviewed scope.

Verified implementation commit: `0e1b1cc` (`feat: add lyric studio and living Underweb world`). Final documentation is a separate follow-up checkpoint. Preview opening for `http://127.0.0.1:4173/?rev=26` was queued in the current chat; the app will show it when this chat is visible. No push or merge performed.

## Review rulings and balance

- Audio result is captured at stage START, not completion: the work excerpt and final layer must match. Practice gained during the job does not retroactively remaster that layer.
- A weaker-skill ceiling `55 + 0.55 * min(beatmaking, sound)` prevents expert beatmaking plus novice sound skill from reaching 110. Exhaustive 1,331 novice slider combinations: 6.6–31, mean 11.55, 95.8% within 5–20. Temporary balance, centralized in beat-result.js.
- Near100, crossfade the complete coloured path rather than only filter parameters; otherwise native high-pass phase prevents convergence to the original.
- Independent task1/2/5 review: no Critical; fixed all three Important issues (saved lyric decisions now influence structure, additions use their own current skill, modal focus/Tab/Escape and background inertness). Also fixed Minor FT picker inclusion of lyric documents. Reviewer accepted fixes after 28/28 targeted tests.
- Added RED/GREEN regression for writing across midnight or resuming days later: updated date uses actual completion clock, created date is preserved.
- Existing written lines remain unchanged when adding a verse. Adaptation intentionally restructures the document and creates a new version.
- Forum NPC conversations cover the opening days of the existing battles (up to day11); player replies persist indefinitely up to the explicitly handled capacity. Future seasons and further authored conversations are content expansions, not fabricated activity counters.
- A revision26 browser run overlapped a two-file forum edit and loaded a transient missing export. After the writer finished, fresh isolated notebook and FT runs both passed. No runtime workaround or test weakening was added.
- Integration choice: retain codex/lyrics-web-world locally, without push/merge or cleanup. User asked for autonomous completion and review tomorrow; no additional integration approval is assumed. One coherent feature checkpoint includes coupled model/UI/cache references so rollback does not leave a half-integrated app.

## Tomorrow's manual walkthrough

1. Open Underweb → Файловая помойка → Рэпблокнот. Download, open installer, install (10 real seconds), launch from desktop/Start.
2. New text → free topic or battle. Complete the three work stages; the beginner has no visible sliders. Try adding a diss/story verse, then adapting to a finished beat.
3. Create a NEW FT beat to hear v2 result processing (old archival projects keep their prior profiles). Listen after each stage and at the end.
4. Switch room camera2D/3D: it is the same geometry/state. Read separate battle sites and Подземка/forum; local replies and drafts survive reopening.
5. Искра shows the current historical issue. Sleeping/work advances the shared calendar; every third day another issue appears. Archive/search reveal only already-published issues.

Artifacts (D: only): D:/Codex/Builds/Battle/{shared-scene-20261010,beat-result-20261010,rap-notebook-20261010,underweb-community-20261010}. Browser scenarios use isolated contexts, not the user's saves. Raw research is kept outside the repository at D:/Codex/Temp/Battle-underweb-news-20261010.
