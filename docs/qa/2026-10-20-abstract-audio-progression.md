# Abstract audio and progression — local QA, 2026-10-20

Worktree: `D:\Project\Battle\.worktrees\abstract-audio-progression`. Task 9 base: `41924428deafce018067958f4238f4cb0f203968`; complete feature comparison baseline: `fcd2637`. No push, deployment, source removal, or permanent-checkout integration is performed by the Task 9 implementer.

## Automated integration

`test/abstract-integration.test.js` exercises sixteen real production chains: four fixed Abstract families, genre XP 0/100, Daniel/new Kapa. It saves/reloads active beat/text and pending recording jobs, checks complete credit/snapshot persistence, records, captures an immutable version, exports, attaches/submits and reloads. Recipe family/adjacent indices, instrument/vocal source IDs, execution, practice policy/plan, voice bag catalog version, full playback descriptors and duration survive. Editing/removing the source cannot change either archive. Initial integration run already passed; no artificial defect was introduced.

The NPC integration uses the real generator for all forty existing participants, all six hero voices and two rounds. It checks hero exclusion, permanent assignment and fresh takes, reload/idempotence, playable descriptor and unchanged participant style. Abstract compatibility is exercised through the shared production/playback/export contracts, without altering NPC styles.

Task 1 deferred proof negatives directly apply the finalizer to synthetic D: fixtures with wrong intake hash, wrong prepared hash, changed approved hash/destination and a missing approved row. All 255 fixture originals survive every rejection. Real sources are never passed to `-Apply` by these tests.

## Client graph

The 29 Task 1–8 changed modules and their importer closure use canonical `?rev=49`, including module workers. Only import query strings change in the 115 runtime source files touched by Task 9. Entry and new test skill stylesheet use 49. Unchanged creator stylesheet stays 48; released unrelated styles stay 43; unchanged banks keep their released revisions. Graph tests traverse the complete entry graph, enforce canonical URLs and reject Node-only dependencies.

## Source audit

`node tools/audit-abstract-audio.mjs` passed: 255 originals, 255 identical archived copies, 37 unchanged exclusions, all 255 preparation input hashes and 146 output hashes. Seventeen manifests with 692 hashed rows resolve all 689 catalog sources, including historical banks/voices. Counts: 43 Abstract recipes, 13 experimental leads, 51 usable Daniel takes and 48 usable new Kapa takes. Full evidence: `artifacts/abstract-20261020/integration-audit.json`.

| Manifest | SHA-256 |
| --- | --- |
| intake | `b3a4126ec474e40c7d92bc65281c6f1aba0f01eaba71572b3ebb71b2e2373794` |
| abstract-v1 | `68b19d2fa050e5a0f59ce0e57cc8e55cf1c0bf9a93dabc452289bcd6765003f8` |
| experimental-leads-v1 | `7d4018e11a045ef6160860c06def592263466415857366ab96a84221d7592681` |
| npc-daniel-v1 | `2a9e0dcadcdeb99d3cccd3838e59cbe2a6425019da8039e7875d15f3f64ed3f8` |
| npc-kapa-v2 | `1bb84e30baf9e75fa630fc095008220ce0f220c9b54d9df883254d59a449a1bc` |

## Local examples and limitations

`node tools/prepare-abstract-demos.mjs` produces twelve frozen mixed-track fixtures: four families × Daniel/Kapa, final Track04 #19→20 × both voices, and experimental lead1 × both voices. `node tools/serve-abstract-demos.mjs` serves a visible render page at `http://127.0.0.1:4192/tools/abstract-demo.html`. Rendering is initiated by the root agent through the supported browser UI. Actual module-worker PCM must equal the synchronous runtime reference sample for sample; final mixing uses the same source calibration, windows, per-layer graphs, output gain and master as BeatAudio. OfflineAudioContext runs stereo 44100 Hz. No alternate EQ, added fades or loudness normalization is applied. The loopback sink saves only allowlisted output names on D:, requires the same origin, rejects differing existing files and links, and bounds uploads. A visible JPEG field saves one fixed screenshot, maximum 2 MiB.

Metrics include finite/clipped samples, peak/RMS, beat/vocal solo RMS ratio and adjacent sample steps at musical boundaries. These are measurements, not proof of perceived smoothness or musical compatibility. The experimental lead1 broad-texture pairing and final Track04 repeated bar still require human listening. No subjective listening claim is made.

Root-triggered final render completed: twelve 21.333333-second stereo WAVs saved under `artifacts/abstract-20261020/demos/`, all with zero nonfinite/clipped samples. Peak range 0.1861–0.3557; overall RMS range 0.01478–0.03710. Each example used one actual worker with four successful jobs, zero worker errors, no fallback, and exact worker/reference PCM parity. Full-song vocal/beat solo RMS ratio ranges −18.11 to −6.05 dB, including intro/outro silence; this is not perceived loudness. `render-evidence.json` stores per-example source IDs, output SHA-256, worker evidence, boundary-step measurements and gain metrics. No mix adjustment was made merely to improve these numbers.

Static listening page: `artifacts/abstract-20261020/demos/index.html`; final normal server route `/artifacts/abstract-20261020/demos/index.html`. The generator rerun preserved identical fixtures and the helper check resolved all twelve unique audio URLs to existing WAVs. This page requires neither the QA server nor rerendering. The generator refuses different existing fixture/gallery bytes.

The first visible render failed because eagerly reading an error-message body consumed a successful response before JSON parsing; this was fixed. A second attempt was rejected by the no-overwrite guard. Its rejected PCM was not retained, so that variation's cause and magnitude are unknown. The third attempt's first WAV exactly matches the retained initial WAV: SHA-256 `26dd389bf37ab678ace8a6fbc2d273a8fd64f8651331b9442c5fdd31eacb089a`, 1,881,600 samples, maximum PCM16 delta 0. This comparison does not establish a universal bit-determinism guarantee for Web Audio.

## Worktree handoff checkpoint

Final complete suite: `npm test` — 1579 pass / 0 fail / 0 skipped, exit 0, 288752.7973 ms; log `artifacts/test-temp/task-9-npm-test-final-2.log`. An earlier full run had 1577 pass / 1 fail due to stale revision48 assertions in `virtual-pc-xp-entry.test.js`; both assertions were corrected before the final green run. Focused graph/entry/sink verification passed 10/10.

Root normal UI evidence at isolated origin `127.0.0.1:4191`: revision49 reload preserved the test career and skill25. Fictional torent/FT Studio installed through normal flow. Abstract unlocked at25 with0XP. Created “Abstract—проверка”; active work hides the top “+”. The first-stage HUD displayed beatmaking25.25 (+0.25), Abstract0.51 (+0.51). After interruption to the room, independent “+1” worked while paused: beatmaking25.82→26.82, Abstract1.63→2.63; other eight skills and Experimental remained0. Root saved a 43,394-byte JPEG through the visible bounded form: `demos/qa-screenshot.jpg`, SHA-256 `e133408750b324cae1f208800665048baad5bf0f480835be35f5da5b393c0f1c`.

Root continued the normal workflow: all three beat stages finished at beatmaking27.73 and Abstract4.46, consistent with the frozen1.732 practice budget and the manual “+1” already included. Studio playback reached “Играет”, with advancing position and zero reported console errors/warnings. Beat export created an immutable virtual audio file. Full-track publication remains pending while the normal Rap Notebook workflow is in progress. Final whole-branch review approved with no Critical/Important findings; its single Minor was the sink test assuming an ignored scratch directory already existed. The test now creates that parent recursively before mkdtemp, so a fresh checkout can run the isolated check independently.

Root owns the remaining publication/attachment checks, verification.json, final transfer/removal and post-transfer audit. No browserPassed=true proof is created by the implementer. All 255 real originals were present during the source audit and remain recoverable from `stems/source-library/` if root later performs the approved finalization.

## Final local acceptance

The root agent completed the operational gates after the checkpoint above.

- Independent task reviews and whole-branch review approved the implementation. The final test-isolation finding was fixed in `de344f2` and independently re-reviewed.
- All 176 feature text paths were integrated into `D:\Project\Battle`, excluding the worktree-bound intake manifest. The original index was unchanged. Inventory comparison confirmed all 1,470 baseline files outside the feature paths remained byte-identical.
- The original intake tool regenerated its manifest with permanent destinations. Its SHA-256 is `183378bb437ef3bb4ace2a209f2c4cf2d20fc0dae2939333107b010008bdb494`. The preparation report retains the worktree digest as historical provenance, not deletion authority.
- Git's CRLF conversion changed four new JSON manifests during integration. Normalized-content comparison proved no data change; their verified LF bytes were restored before asset verification.
- All 255 permanent original copies, 146 preparation outputs, 17 manifests / 692 hashed rows / 689 reachable catalog sources and 37 excluded files passed verification.
- Fresh full suite in the permanent checkout: **1,579 / 1,579**, exit 0, zero skipped/cancelled/failed, 195,505.4951 ms. Log: `artifacts/test-temp/abstract-final-original-npm-test.log`.
- Browser checks used the separate `127.0.0.1:4191` career: six voices, zero start, isolated and fractional +1 persistence, Abstract unlock at 25, paused snapshots, three-stage completion, Daniel recording, full-track export, upload and submission through normal UI. The attachment advanced to 76% / 0:08 of 0:10. After test sleep passed the deadline, the group listed 33 current-season works including the test track; its archive player advanced to 97%. No console warnings/errors were observed. The draft retains its 10.666-second duration; mixed demos are 21.333333 seconds.
- `browser-checks.json` records scope and limits. Four-family browser coverage uses actual runtime Worker demos; no subjective listening is claimed.
- Permanent `127.0.0.1:4173` loaded the existing user's main menu without resuming/resetting that career. Its twelve-example gallery loaded and played a WAV normally.
- Finalizer dry-run verified 255 files and removed zero. Apply removed exactly **255 approved source files**, checked again immediately before deletion. Post-transfer verification confirmed all 255 permanent copies, zero remaining approved originals and all 37 excluded files unchanged. Empty folders, FL projects, ZIP files, archived fragments and unrelated experimental bass/drum files were not removed.

Originals are recoverable from `D:\Project\Battle\stems\source-library`. Exact mappings: `stems/source-library/batches/abstract-20261020-v1.json`. Proof and final counts: `artifacts/abstract-20261020/verification.json` and `post-transfer.json`.

Game: `http://127.0.0.1:4173/`. Examples: `http://127.0.0.1:4173/artifacts/abstract-20261020/demos/`.

No GitHub push/publication. The isolated local branch/worktree is retained as a recovery copy; existing local work remains unstaged in the original checkout.
