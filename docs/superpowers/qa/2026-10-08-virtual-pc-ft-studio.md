# QA — virtual PC and FT Studio

Date: 2026-10-09

## Automated verification

- `npm test` — audit-fix run in the working directory: **342 passed, 0 failed** (23.21 s).
- `npm test` — clean Git export, excluding all pre-existing local/untracked work: **336 passed, 0 failed** (23.03 s). Source/test snapshot tree: `665e2eb18b1ef1152c1ecab9f9e9e87522a99bf5`. The differing totals come from pre-existing local test additions.
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

Earlier review-phase verification: **19 passed, 0 failed** (`test/virtual-pc-ui.test.js`), followed by a full 328-test working-directory run. The newer audit results above supersede that total.

## Scope notes

Pre-existing dirty files and artifact folders were retained. One previously dirty client-module test was initially included in an integration commit, then the two affected local commits were safely rebuilt so that test is again uncommitted and outside this feature's commit scope.

## Audit corrections — 9 October 2026

The user requested corrections after the follow-up audit reproduced draft loss, a stale clock on new game, and a failing committed entry-point test.

- A recovered draft is protected when a new Underweb project or a saved project would replace it. The player can save it before continuing, explicitly discard it, or restore it for editing. A failed storage write retains the guard.
- A validated new-character submission now resets and persists apartment time and PC state together. Cancelling or invalidating the creator preserves the old PC. The controller also clears its previous project, pending action, boot timer, and open window.
- Mixer input updates the project and autosave without replacing the actively dragged range control.
- Window keyboard focus wraps inside the visible window or Start menu. Save dialogs skip disabled controls, contain focus, and make the underlying Studio controls inert.
- Boot advances through four visible stages over 5.5 seconds; short synthesized tones use an AudioContext unlocked by the initial computer click. A denied audio context remains non-fatal.
- My Computer now navigates C: → Windows / My Projects, supports Back, and opens saved project files from their folder.
- Insufficient virtual space disables download/new-project save and displays a Russian explanation. Existing projects can still be updated on a full disk.
- The committed entry-point test now expects the active apartment module. Only that single correction was staged; pre-existing local test additions and `legacy.html` remain outside the commit. An initial attempt to stage the entire modified test was rejected by approval review; the narrower patch was approved and tested in the clean export.
- Client module/style revisions were advanced. The handoff, queue and original plan now distinguish implemented features from the still-open browser acceptance.

Focused audit tests: **38 passed, 0 failed** across PC UI/recovery, new-game lifecycle and audio. New regression cases first failed against the old implementation, then passed after correction.

Browser acceptance was attempted again after the fixes. The browser kernel exited during initialization with `windows sandbox failed: helper_unknown_error: setup refresh had errors`. Real audio playback, pointer dragging, and the full 1280×720 / 640×900 route therefore remain **unverified**. DOM/audio-adapter tests do not replace that acceptance.

The subsequent beat → microphone recording → mix → battle submission/result loop is a separate future gameplay step, not part of these corrections.
