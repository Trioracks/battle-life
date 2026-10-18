# Manual test-sleep x10

Implemented the manual bed-menu rate at 450 game minutes per real second. Ordinary sleep remains six game hours over eight real seconds; manual sleep remains active until explicit wake. The app entry and helper use cache revision 46.

Changed files:

- `src/apartment-actions.js` — shared manual sleep menu options.
- `src/apartment-app.js` — bed menu passes the shared options to the real action runtime.
- `index.html` — invalidates the app entry cache.
- `test/sleep-background-work.test.js` — real motion and clock regression for 22.4 seconds, seven game days, explicit wake, and ordinary sleep.
- `test/client-module-version.test.js`, `test/v-krugu-revision.test.js`, `test/virtual-pc-xp-entry.test.js` — updated cache revision expectations.

TDD and focused verification:

- RED: `npm test -- --test-name-pattern='manual bed menu rate'` failed because `sleepOptionsForActionMenu` did not exist (`undefined` where the new production menu option was expected).
- GREEN: `node --test --test-name-pattern='manual bed menu rate' test/sleep-background-work.test.js` — 1 passed, 0 failed.
- Cache checks: `node --test --test-name-pattern='manual bed menu rate|home integration invalidates|current entry' test/sleep-background-work.test.js test/client-module-version.test.js test/v-krugu-revision.test.js` — 3 passed, 0 failed.
- Controller separately executed the actual app menu loop with lightweight DOM shims and real motion/time objects; the manual option advanced 10,080 minutes in 22.4 seconds and stayed asleep until wake. The normal bed option retained 360 minutes over eight seconds.

Full suite: `npm test` — 1,425 passed, 0 failed, 0 skipped; duration 126,637.9677 ms. The existing installer dry-run test needs access to its temporary fixture path under `D:\Codex\Builds\Battle`; after running with the approved D: sandbox escalation, the final full suite passed. An earlier run caught a stale `rev=45` assertion in `test/virtual-pc-xp-entry.test.js`; it was updated to 46 before the passing run.

Commit: `502499a` (`Increase manual test sleep speed to x10`).

Caveat: an already-running or saved manual sleep retains its saved rate. Wake, reload, and select the manual option again to use the new rate.
