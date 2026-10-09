# QA — virtual PC and FT Studio

Date: 2026-10-09

## Automated verification

- `npm test` — fresh post-follow-up-review run: **328 passed, 0 failed** (20.89 s).
- `git diff --check` — no whitespace errors.
- Focused coverage in the full suite includes immutable PC state and virtual-disk accounting, six-game-hour download completion, power-off pause, midnight timestamps, local Underweb routes, FT Studio project serialization, simulated four-voice audio scheduling, safe close and shutdown prompts, and apartment clock integration.

## Behaviour covered by tests

- FT Studio takes exactly 360 apartment-game minutes to download and only advances while the PC is powered on. Repeating the same game-time clock value or resuming after a real-world delay adds no progress.
- A completed package converts to one 800 MB installed application, never a completed payload plus an installed copy. A 1,500 MB virtual disk retains 700 MB after installation; each saved project reserves 2 MB and capacity is guarded.
- The apartment owns the only clock. Downloads advance during regular apartment time and sleep, including across midnight, while the computer screen keeps the seated actor action held.
- Unit and DOM-controller tests exercise the local `torent`, Underweb battle briefs, wallpapers, My Computer/Projects, and individual FT Studio transitions. They do not substitute for the complete browser route. No network or real filesystem access is used by these features.
- Fake Web Audio verification schedules distinct kick, snare, hat, and bass voices. Audio-context failure remains non-destructive so a project can still be saved.

## Visual/browser acceptance

Not completed. The supported browser automation crashed at initial local-tab creation with `trusted Node process exited unexpectedly; kernel reset`. Consequently the following are intentionally **not claimed as passed**:

- the complete browser route at 1280x720;
- narrow 640x900 layout/scrolling;
- audible Start/Stop playback in a real browser;
- visual confirmation of save/reopen and unsaved-change prompts.

The original local wallpaper assets are present at:

- `assets/ui/virtual-pc/wallpaper-courtyard.png`
- `assets/ui/virtual-pc/wallpaper-factory.png`
- `assets/ui/virtual-pc/wallpaper-room.png`

They are covered by the desktop implementation but await the blocked browser visual check.

## Independent review and follow-up

An independent read-only review found no Critical issues but identified Important defects in the first implementation: Studio could be reached before installation; audio never advanced beyond bar one and could restart after Stop; an open `torent` window did not refresh from game time; dirty-project transitions could bypass the confirmation; audio lifecycle/persistence messaging/focus were incomplete.

Regression coverage and corrections now include:

- installed-only Studio entry at the controller boundary, including Underweb routing to `torent` before install;
- 128-step transport covering all eight bars and cancellation of a deferred AudioContext resume;
- in-place refresh of the live `torent` progress, install controls, disk label, and FT Studio icon from reconciled game time;
- one guarded transition for close, application switch, project replacement, leaving, and shutdown;
- audio stop on edits, save, and all window/lifecycle transitions;
- a clear Russian in-memory-only save message when browser persistence fails;
- stable keyboard focus identity for sequencer and mixer rerenders.

The review follow-up exposed and then verified corrections for one introduced form-reset regression and the remaining modal/storage paths:

- Underweb address and in-progress Studio fields survive every game-time reconciliation; only dynamic desktop/torrent controls update;
- the confirmation dialog receives focus, confines Tab navigation to its three choices, and stops Escape before global apartment handling;
- failed project persistence keeps its requested close/leave/shutdown guarded, rather than hiding the warning and continuing;
- failed virtual-PC load and periodic persistence writes use the same persistent Russian storage warning.
- a clock-only update retains the existing focused `torent` control; its buttons are rebuilt only when download status changes.

Focused post-fix verification: **19 passed, 0 failed** (`test/virtual-pc-ui.test.js`), followed by the full 328-test run above.

## Scope notes

Pre-existing dirty files and artifact folders were retained. One previously dirty client-module test was initially included in an integration commit, then the two affected local commits were safely rebuilt so that test is again uncommitted and outside this feature's commit scope.
