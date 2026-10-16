# Battle lifecycle FPS regression

User requirement: stable play before and after battle deadlines, through judging and the final. Fix the confirmed regression without reducing graphics quality or resetting saves. User authorized autonomous implementation.

Evidence: full tournament archives cost ~10 ms in advanceSocial on every frame; disabling that call changes measured walking from 68–71 to ~142 FPS on this machine. Closing selection generates 32 tracks synchronously (~600 ms); a failed save discards it and repeats the work every frame. Actual failure of the user's save is unconfirmed.

Design: one module Worker advances social/tournament time, including archive normalization/compression. The room frame advances movement, creative work and downloads only. Coalesce requests to integer game minutes, at most once per 250 ms of real time, one job in flight. Send changed input sections only; worker returns only semantically changed domain sections. A result commits against its captured domain dependencies, preserving unrelated current player work. Stale results are discarded and recomputed. A reset or disposed host never accepts old results.

Durability: retain the existing single-key atomic save and migration backups. Reuse prepared immutable archive sections from the trusted worker, without weakening validation of loaded saves. Publish new events only after successful persistence. Worker/save errors latch visibly, with explicit retry; no per-frame regeneration. Walk and render remain available. Save failure preserves the previous saved bytes.

No balance/timing changes: original dueAt, deterministic generation, judge panels, progression and outcomes remain identical. Background completion can appear shortly after its due time; catch-up uses original timestamps. Legacy synchronous APIs remain for deterministic tools/tests.

Verification: behavioral regressions for frame isolation, input races, save failure/retry, reload/reset/dispose; compare actual background results to the synchronous reference. Browser checks on an isolated origin, real walking during deadline/judging/final, and injected save failure. Never change the user's 4173 save. Record measured frame times rather than promising a universal hardware FPS.
