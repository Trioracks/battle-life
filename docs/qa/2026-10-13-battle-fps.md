# Battle lifecycle FPS regression — 2026-10-13

Client revision: **41**. Branch: `codex/sloboda-workflow-design`.

## Cause and repair

The apartment advanced and normalized the entire social/tournament domain on every animation frame. Large completed archives amplified that work. Closing selection also generated NPC tracks synchronously; if the atomic save failed, the same calculation was retried each frame.

The domain now runs in a coalescing module Worker: one job at a time, integer game minutes, at least 250 ms between dispatches. Results merge only owned sections, guarded against newer UI actions. Events become visible only after a successful atomic save. Failed writes preserve the previous save, stop automatic retries and show a retry control without blocking movement.

Historical archives are normalized/compressed off-thread and transferred as deltas with shared immutable records. The existing save format and migration/recovery checks remain in use. Unchanged base sections reuse independently encoded LZW streams; the existing decoder understands their dictionary-reset boundaries.

Native work/sleep checks additionally found synchronous audio PCM processing and per-frame rendering of the invisible desktop. Audio now uses the same DSP algorithms in a separate Worker, with sample-exact parity tests. A hidden desktop keeps receiving state but renders once before becoming visible; hidden speech no longer measures layout. No reduction in graphics, sample rate or sound effects.

## Native measurements

Headless installed Edge, 1920×1080, same machine, warmed movement. These are scenario measurements, not guarantees for every GPU or save. The normal user origin/storage at port 4173 was not modified; QA uses isolated port 4176 and fresh browser storage.

| Scenario | Before | After | After frame p95 |
|---|---:|---:|---:|
| Walking, full archive, 3D | 71.1 FPS | 144.0 FPS | 7.1 ms |
| Walking, full archive, 2D | 68.1 FPS | 144.0 FPS | 7.1 ms |
| Three-stage beat work, full archive | 62–66 FPS | 132.3 FPS | 7.1 ms |
| Sleep, full archive | 116–119 FPS | 133.6 FPS | 7.1 ms |
| Walking after failed deadline save | repeated synchronous calculation in diagnostic | 142.8 FPS | 7.1 ms |

Ordinary selection close and judging keep rendering while their Worker is busy. An artificial jump straight through 70 game days still has one roughly 167 ms frame while committing the complete accumulated tournament. The work run includes one 201 ms frame near a transition boundary, although work-frame update p95 is 3.7 ms. Synchronous localStorage commits can still cause short one-off stalls; this patch does not promise zero dropped frames.

## Verification

- `tools/verify-battle-fps.mjs`: PASS; walks through selection, judging, final, 2D/3D, reload, all three audible beat-work stages, sleep, quota failure and explicit retry.
- Tournament, track-version and judging archives exactly match the synchronous reference; event IDs remain unique after catch-up and reload.
- Failed storage leaves previous saved bytes unchanged; no repeated worker jobs while failed; retry generates the expected 32 selection versions.
- PCM tests compare calibrated stereo drums, pitched music, vocal and intro/outro samples exactly against the existing DSP. Cancelled, disposed and failed workers cannot start stale playback.
- `npm test`: **1137/1137 passed**, 102682 ms (`fps-full-tests-3.log`).

Artifacts (ignored local QA output): `artifacts/v-krugu-qa/battle-fps-regression.json`, `fps-native-5.log`, `fps-work.cpuprofile`, `fps-full-tests-3.log`, `battle-fps-recovered.png`. Original walking baseline values were recorded during diagnosis; the reusable diagnostic JSON was subsequently overwritten by an after-run and is not a baseline artifact.

## To verify in the game

Reload with **Ctrl+F5**, then continue the existing save. A new game is not required. Walk after the battle deadline, check the results, create a beat, sleep and reload. If saving is unavailable, the warning's retry button should recover once storage is writable, without freezing the apartment in the meantime.

## Decisions

- Newly announced rounds use skill/practice at dispatch time, not completion time. Continuous XP changes do not invalidate every job and starve battle advancement; creative progress itself is merged from the live state. Tradeoff: the round's skill snapshot may lag visible XP by the worker's calculation latency.
- The performance repair includes audio preparation and invisible UI rendering because native testing reproduced their stalls in the requested all-stage scenario. Tradeoff: additional Worker/lifecycle code; DSP results are unchanged and cancellation is tested.
