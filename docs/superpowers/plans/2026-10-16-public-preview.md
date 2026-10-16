# Audio-free Public Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a playable, audio-library-free first preview from `Trioracks/battle-life/master`, with a lightweight shared development checkout and reproducible updates.

**Architecture:** Export selected current source files into a clean clone of the existing remote history, never merge the full local asset history. One explicit build profile disables recorded-track playback without changing simulation data; separate source/site allowlists and Git-object audits enforce exclusion. GitHub Actions validates and publishes only the resulting static site.

**Tech Stack:** Existing vanilla ES modules, Three.js, Web Audio, Node 24/node:test, Git, GitHub Actions/Pages. No new runtime dependency. Portable browser QA uses locked development dependency `playwright` 1.62.1, matching the installed QA runtime.

**Spec:** `docs/superpowers/specs/2026-10-16-public-preview-design.md` (approved in chat).

## Global Constraints

- Existing public repository: `Trioracks/battle-life`; publication branch: `master`; implementation branch: `codex/first-public-preview`.
- Preserve `D:/Project/Battle`, its media, history, saves and unrelated untracked files. Implementation checkout: `D:/Project/Battle-web`. Do not use the full repository as a worktree/clone source for the public history.
- No compression, transcoding, image/model optimization, new voices, balance changes, backend, telemetry or save synchronization.
- Exclude binary audio, raw `stems`, Blender sources, archives, secrets, local settings and QA output from public Git and Pages. Keep text catalog IDs and save compatibility.
- Public profile `public-preview`; optional local profile `local-full`. Public copy: `Музыка и вокал отключены в тестовой веб-версии`. Keep procedural UI/room effects.
- Artifact budget: 350 MiB total, 95 MiB per file. Fail closed on excess; do not silently optimize or delete.
- Public version `0.1.0-preview.1`, actual short commit SHA; all resource paths must work under `/battle-life/`.
- No force push, history rewrite, branch deletion, bulk push, player-localStorage access or stopping the user's server on port 4173.
- Local scratch/build/cache/browser data must stay on D:. Set npm/Playwright/TEMP paths before installs or launches. Linux hosted CI uses its own workspace and runner temp, not Windows paths.
- Each numbered task: separate implementer, independent review, fixes and re-review before proceeding. Final whole-package review precedes merge/publication. Controller performs external release steps after reviewed evidence.

## Review Focus

1. A WAV committed and then deleted must still block push because it exists in new history (Task 1, commit-range fixture).
2. Saved track versions and creation jobs opened without banks must retain their recipes and finish normally, without retry/gesture loops (Task 2, frozen-save and work-panel tests).
3. A clean Linux/second-PC checkout must not silently skip logic tests or depend on D:/C: source paths (Task 3, test discovery and portability fixtures).
4. Case-sensitive Pages URLs, module query strings and Worker paths must resolve under `/battle-life/`, including cached-update behavior (Task 4 and Task 6).
5. A delayed old workflow or manual run from a non-master branch must not overwrite the latest public release (Task 5, workflow-policy tests).

## File Map and Shared Contracts

All implementation-relative paths below refer to `D:/Project/Battle-web`, not the preserved full checkout. Source spec/plan are copied with the approved source snapshot. Use the source HEAD recorded at execution; `4485fb9` is the pre-plan baseline, original game snapshot `13607f4`. Remote master read-only preflight returned `eb6f1a6725a4fa15764e3ddea0d47c607a376bed`; refresh it before changing anything.

- `tools/publication/policy.mjs`: source/site path and content policy, limits. No file mutation.
- `tools/export-public-source.mjs`: dry-run-first snapshot importer from Git objects, never history.
- `tools/audit-publication.mjs`: source-tree, artifact and new-commit object checks; machine-readable result.
- `src/build-info.js`: checked-in public-safe build defaults; generated build copy contains real release metadata.
- `src/game-audio.js`: choose existing BeatAudio or unavailable transport by profile; no simulation mutation.
- `tools/run-tests.mjs`, `test/helpers/local-assets.js`, `test/local-assets/`: explicit public/full test separation.
- `tools/serve-preview.mjs`: loopback dev/QA server, subpath handling, optional read-only local audio overlay.
- `tools/build-preview.mjs`: deterministic allowlisted static artifact, metadata and resource validation.
- `.github/workflows/pages.yml`: public-profile checks/build/deploy with master-only release condition.
- `AGENTS.md`, `README.md`, `docs/public-preview.md`, `docs/release-checklist.md`: update, audio-boundary, second-PC and feedback rules.
- `tools/verify-public-preview.mjs`, `test/helpers/public-preview-fixture.js`: isolated browser acceptance and live-site smoke.

Commands defined by the end of the plan: `npm test` (public unit/integration), `npm run test:local-assets -- --asset-root D:/Project/Battle`, `npm run build:preview`, `npm run audit:source`, `npm run audit:site`, `npm run verify:preview`, `npm start`. Commands fail nonzero on failed assertions; CI and local use the same implementations.

---

### Task 1: Clean public source snapshot and exclusion boundary

**Files:** Create `tools/publication/policy.mjs`, `tools/export-public-source.mjs`, `tools/audit-publication.mjs`, `test/publication-policy.test.js`, `docs/public-source-provenance.json`; update `.gitignore`. Import the reviewed current source inventory as this task's explicit deliverable, not an unexplained bulk copy.

**Interfaces:**
- `classifyPublicationFile(relativePath, bytes, {target:'source'|'site'}) -> {allowed:boolean, reason:string}`; reject absolute/traversal paths, links, unknown binary types, forbidden folders/types and audio/archive signatures. Text references to `.wav` are allowed; embedded audio payloads are not.
- `auditTree({root,target}) -> Promise<{ok,files,totalBytes,violations}>`; `auditGitRange({repo,base,head}) -> Promise<{ok,commits,violations}>` checks every newly introduced commit tree/blob, not only the final diff.
- `exportPublicSource({sourceRepo,sourceRef,destination,dryRun:true|false}) -> Promise<{sourceCommit,files,totalBytes,conflicts}>`; destination must be the verified new checkout, never the source or a broad parent directory.
- CLI audit modes: `node tools/audit-publication.mjs source|site --root PATH`; `... history --base REF --head REF`. Report JSON plus readable errors; no tokens/credentials in output.

- [ ] **Step 1 — Bootstrap isolated public history.** Verify source status and HEAD, fresh remote HEAD, existing public tree and absence of excluded historical objects. If `D:/Project/Battle-web` already exists, inspect and reuse only if it is the intended clean checkout; otherwise stop instead of overwriting. Clone `https://github.com/Trioracks/battle-life.git` with `--single-branch --branch master` into that directory and create `codex/first-public-preview`. No push yet; source repo remains read-only during implementation.
- [ ] **Step 2 — Write policy/history tests first.** Use tiny generated fixture bytes and temporary Git repositories under D: locally/runner temp in CI; no real recordings as fixtures. Assert the following and a two-commit add-WAV/delete-WAV range returning `ok:false`:

```js
assert.equal(classifyPublicationFile('assets/source/scene.blend', bytes, {target:'source'}).allowed, false);
assert.equal(classifyPublicationFile('assets/ui/sound.png', riffWaveBytes, {target:'site'}).allowed, false);
assert.equal(classifyPublicationFile('src/catalog.js', Buffer.from("const path='x.wav';"), {target:'source'}).allowed, true);
assert.equal(classifyPublicationFile('../escape.js', bytes, {target:'site'}).allowed, false);
assert.equal(classifyPublicationFile('test/example.test.js', jsBytes, {target:'site'}).allowed, false);
```

- [ ] **Step 3 — Run RED.** `node --test test/publication-policy.test.js`; expected failure from missing policy/audit implementation, not a missing external asset.
- [ ] **Step 4 — Implement policy, audit and importer.** Source allowlist: root HTML/CSS/package/approved documentation, `src`, `vendor`, `data`, `test`, `tools` text files; runtime asset folders (`assets/apartment`, `models`, `battle-covers`, `npc-photos`, `social`, `ui`, `fonts`) with approved types; text audio manifests; required tracked research JSON such as `docs/research/package-one-reference-sources.json`; this spec/plan. No untracked backlog ingestion. Site excludes dev/docs/tests/tools and includes only runtime assets plus `assets/audio/pc/manifest.json`; FT manifests remain source-only. Preserve required third-party notices, validate known binary formats instead of accepting an extension alone. Stream size/hash checks; inspect Git content without adding the source repo as a remote/parent. Record actual source SHA and copied hashes in provenance. Keep unknown/conflicting files for review, never wipe destination recursively.
- [ ] **Step 5 — Import only after dry-run review.** Run importer against the frozen source ref first with `dryRun:true`, review inventory/conflicts and Git diff, then apply it. Protect the new publication tools from being overwritten by import. `.gitignore` covers excluded formats, `.local-audio.json`, `dist`, QA artifacts and caches; audit remains authoritative.
- [ ] **Step 6 — Run GREEN and commit.** Policy tests, `audit ... source --root .`, `git diff --check`, source/target status and copied-file hash report. Confirm preserved source media hash samples. Stage the explicit reviewed inventory, commit `feat: import safe public source snapshot`; audit the new Git range before any push. Independent reviewer checks both content and ancestry.

### Task 2: Public audio capability and truthful UI

**Files:** Create `src/build-info.js`, `src/game-audio.js`, `test/public-audio-profile.test.js`, `test/public-audio-ui.test.js`; modify `src/virtual-pc-ui.js:128`, `src/pc-audio-session.js`, `src/beat-studio-view.js:189`, `src/social-audio-view.js`, `src/pc-audio-export-view.js`, `src/beat-market-view.js`, `src/beat-work-audio.js`, `src/beat-work-view.js`, `src/apartment-app.js` only at integration points. Do not refactor production/scoring/catalog modules.

**Interfaces:**
- `BUILD_INFO = {profile:'public-preview', version:'0.1.0-preview.1', revision:'dev', sourceCommit:null}` default export data via named export.
- `PUBLIC_AUDIO_NOTICE` exact approved Russian text; `createGameAudio({profile,engineFactory,engineOptions}) -> AudioTransport`.
- Transport retains existing `play`, `playProject`, `playDescriptor` (`Promise<boolean>`), `unlock`, `getSnapshot`, `pause`, `stop`, `setRoomFrame`, `dispose`, `error`. Add immutable `capabilities:{recordedPlayback:boolean,reason:string}` forwarded through session adapters; existing injected fake engines without this field retain current behavior.
- Public unavailable snapshot is stopped with position/duration 0, no source/owner, and capability reason separate from runtime error. Public play resolves false; unlock resolves without AudioContext; all disposal calls are idempotent. Factory must not construct BeatAudio/PCM worker in public mode. Missing/unknown profile fails closed to public behavior; only explicit `local-full` enables the existing engine.
- Work sync adds `audioNotice` to its existing `{audioError,needsGesture}` result. Public work returns notice with empty error and `needsGesture:false`; rendering does not show an enable-sound retry button.

- [ ] **Step 1 — Write failing profile/UI regressions.** Assert engineFactory/fetch/decode/worker counters stay zero for public play/unlock/stop/dispose, including missing/unknown profiles. Assert only explicit local-full delegates to the original engine. Use existing frozen submission/creative fixtures: compare recipes, exports, submissions and score inputs before/after unavailable playback; complete the same command sequence with public/local fakes and compare simulation results. Mount studio, social row, market, export player and work panel with public capability: disabled recorded-play controls, exact notice, zero fake progress, no repeated start/gesture request; study/export/create controls stay enabled when otherwise eligible.

```js
const audio = createGameAudio({profile:'public-preview', engineFactory:()=>{ throw Error('must not construct'); }});
assert.equal(await audio.playDescriptor(descriptor), false);
assert.equal(audio.capabilities.recordedPlayback, false);
assert.equal(audio.capabilities.reason, PUBLIC_AUDIO_NOTICE);
assert.equal(audio.getSnapshot().positionSeconds, 0);
```

- [ ] **Step 2 — Run RED.** `node --test test/public-audio-profile.test.js test/public-audio-ui.test.js`; failures must expose missing capability/notice behavior.
- [ ] **Step 3 — Implement factory and UI wiring.** Replace production BeatAudio construction with the profile factory; keep direct BeatAudio tests and local engine unchanged. Forward capabilities independently of current audio owner so idle rows also know playback is unavailable. Prevent automatic export-player play and creative-work prepare/retry calls in public mode. Preserve procedural keyboard/room/PC cues; never call missing recorded sources as a fallback. Recording progress still represents a simulated recording job, not listening progress.
- [ ] **Step 4 — Run GREEN/regressions and commit.** New tests plus existing `beat-audio`, `pc-audio-session`, `beat-work-audio`, `social-audio-controls`, `pc-audio-exports`, `track-version-audio`, `virtual-pc-lifecycle` tests. Verify a prepared track remains exportable/submittable/studiable without fetching banks. Explicit file staging; commit `feat: add audio-free public preview profile`; independent reviewer checks every playback entry point including RIPLINE and hidden work.

### Task 3: Portable public tests and optional local asset mode

**Files:** Create `tools/run-tests.mjs`, `tools/serve-preview.mjs`, `test/helpers/local-assets.js`, `test/test-profile-discovery.test.js`, `test/preview-server.test.js`, `.local-audio.example.json`, `test/local-assets/` files; modify `package.json`, `package-lock.json`, `test/helpers/apartment-assets.js`, `test/apartment-v3-bundle.test.js`, `test/beat-beginner-bank.test.js`, `test/beat-bank-expansion.test.js`, `test/user-drums.test.js`, `test/user-experimental.test.js`, `test/vocal-assets.test.js`. Use an explicit audit inventory for any additional machine-path/physical-asset test discovered; keep its logical assertions public.

**Interfaces:**
- `run-tests.mjs --profile public|local-assets [--asset-root PATH]`: discover explicit `.test.js` files, public excludes only `test/local-assets`, local runs public plus asset tests; report selected/excluded counts and reasons, nonzero on failure or missing required local root.
- `localAssetPath(relativePath)` resolves only beneath an explicitly validated `BATTLE_LOCAL_ASSET_ROOT`; no default read of another user's drive. Separate raw-source integrity tests from logical selection/catalog/save tests instead of skipping entire mixed files.
- `startPreviewServer({root,port:0|number,prefix:'/battle-life/',profile:'public-preview'|'local-full',assetRoot:null|string}) -> Promise<{origin,url,close}>`; default CLI `npm start` is loopback/public at port 4180. Safe decoding, MIME types (including GLB/WOFF/JSON/JS), no traversal, symlinks or root-directory exposure.
- Local settings file `.local-audio.json` contains `{assetRoot:'D:/Project/Battle'}` and is ignored/never served. Only explicit `--profile local-full` reads it and overlays allowlisted audio-bank routes. Serve a local-only virtual build-info response; do not edit the tracked default. Public mode never probes local settings/assets. Raw stems/Blender sources are test inputs, never HTTP routes.

- [ ] **Step 1 — Write failing discovery/server tests.** Discovery must include logical tests from all five mixed audio files, reject an empty selected suite, and fail an explicit local run with missing banks. Test server `/battle-life/`, query strings, valid public asset, forbidden `../`, encoded traversal and `.local-audio.json`; public mode with a valid local pack configured still has no audio overlay. Local profile serves the requested preserved bank byte-identically. Use tiny generated fixture responses, not private recordings, for portable tests.
- [ ] **Step 2 — Run RED.** `node --test test/test-profile-discovery.test.js test/preview-server.test.js`.
- [ ] **Step 3 — Split physical checks and implement runners.** Move physical WAV/PCM/raw-source assertions to named files in `test/local-assets`; retain all numerical/model logic and text-manifest checks in public suite. Separate Windows Blender installer dry-run from portable scene/validator checks; the Windows-only test is explicitly reported in full local mode, not silently claimed on Linux. Replace drive-specific temp/root assumptions in tests that remain public, preserving safety checks. `node --test` invocation receives explicit discovered paths (no shell glob dependency). Node engine target 24; add locked Playwright 1.62.1 devDependency only for QA, no runtime library.
- [ ] **Step 4 — Verify both profiles.** Run `npm test` from the clean audio-free clone and full local tests with `--asset-root D:/Project/Battle`. Public-source audit must also pass after running with optional assets. Confirm source original files unchanged and no local paths/settings entered Git. Run on Windows locally and Linux through Task 5 CI.
- [ ] **Step 5 — Commit and independent review.** Explicit staging; commit `test: separate public checks from local media fixtures`. Review counts/assertion migration and loopback/local-overlay containment, not merely green exit codes.

### Task 4: Reproducible site artifact, version and subpath validation

**Files:** Create `tools/build-preview.mjs`, `test/public-preview-build.test.js`, `src/release-info-view.js`, `test/release-info-view.test.js`; modify `index.html`, `src/apartment-app.js`, `apartment-v3.css`, `package.json`, `test/client-module-version.test.js`; mechanically update active module/CSS/Worker revisions to 44 in this public checkout. Keep legacy HTML in source if source tests need it; exclude it from public artifact and remove its public link.

**Interfaces:**
- `buildPreview({root,outDir,revision,sourceCommit}) -> Promise<{files,totalBytes,manifest}>`, public-only; `revision` is the actual public Git HEAD, `sourceCommit` comes from Task 1 provenance. CLI rejects local-full and outputs `dist/public-preview` by default. Never recursively delete an arbitrary requested directory; rebuild only verified owned output or a new staging directory.
- Artifact `release.json` has `{version,revision,sourceCommit,profile,builtAt}`; generated `src/build-info.js` matches it. Artifact includes `.nojekyll` and required runtime licenses. Build report lists copied paths/sizes/hashes outside served output; original files remain unchanged.
- `mountReleaseInfo(root,{buildInfo}) -> {dispose}` exposes compact release label and audio limitation in the menu/help area, keyboard-readable and non-obscuring; no new gameplay overlay.

- [ ] **Step 1 — Write failing builder/version tests.** Fixture build excludes audio, raw sources, tests, local config and archives even when present; rejects forbidden file magic and budgets; refuses output outside designated owned build directory. Assert `totalBytes <= 350*1024*1024`, every file `<=95*1024*1024`, generated public profile and real supplied SHA, valid `.nojekyll`, and no legacy link. An intentionally missing imported JS/Worker or referenced scene asset must fail with its path, rather than produce a half-working site.
- [ ] **Step 2 — Run RED.** `node --test test/public-preview-build.test.js test/release-info-view.test.js`.
- [ ] **Step 3 — Implement allowlisted copying and release display.** Do not transform media. Validate module/import-map/CSS/Worker graphs, scene JSON and dynamically selected scene/portrait/cover inventories; exclude audio catalog strings intentionally rather than treating them as downloadable public resources. For static source tests retain their fixtures; for actual artifact ensure every reachable dependency exists with exact case. Update revision invariants to 44; arbitrary test-only imports need not become shipped assets.
- [ ] **Step 4 — Run GREEN and artifact checks.** `npm test`, `npm run build:preview`, `npm run audit:source`, `npm run audit:site`; serve artifact under `/battle-life/` using Task 3 server and check HTML/release metadata/resource responses. Repeat build with a fixed timestamp in fixtures to prove deterministic bytes apart from declared build time. Check UI label at narrow and wide desktop sizes without hiding controls.
- [ ] **Step 5 — Commit and independent review.** Explicit files/mechanical revision inventory; commit `build: package audio-free Pages preview`. Reviewer compares build inventory against both source policy and live runtime dependency closure.

### Task 5: Update workflow and human/agent rules

**Files:** Create `.github/workflows/pages.yml`, `test/pages-workflow-policy.test.js`, `AGENTS.md`, `docs/public-preview.md`, `docs/release-checklist.md`; update `README.md`, `package.json`, lockfile only as needed for the existing QA dev dependency. Do not change unrelated global agent settings.

**Interfaces:** Workflow events `pull_request`, `push` on master, `workflow_dispatch`; only master push/manual events may deploy. Public validation uses Task 3 commands and Task 4 artifact; optional local media are never CI dependencies. Pages environment outputs the live URL and release SHA.

- [ ] **Step 1 — Write workflow-policy tests.** Assert master-only deploy condition, `needs` successful checks/build, `contents:read` default permissions, deploy-only `pages:write`/`id-token:write`, environment `github-pages`, concurrency cancellation scoped to publication, artifact path exactly `dist/public-preview`, no upload of source/audio/QA directories. Non-master dispatch/PR cannot deploy; stale master SHA is checked against current master immediately before deploy and an older job cannot queue after a newer deployment.
- [ ] **Step 2 — Run RED.** `node --test test/pages-workflow-policy.test.js` fails for absent/unsafe workflow, not network access.
- [ ] **Step 3 — Implement CI and documentation.** Use official `actions/checkout` v6, `setup-node` v7, `configure-pages` v5, `upload-pages-artifact` v4, `deploy-pages` v4, resolve their official commit SHAs and pin them with version comments during execution. Node 24, `npm ci`, public tests, source/new-history audit, public build, artifact audit, browser smoke (Task 6). PR validation must work before Pages exists: neither configure-pages nor deploy-pages runs on the PR path; configure-pages belongs to the guarded master deploy job. Preserve credentials only where genuinely needed; never add a PAT to tracked files. Avoid charged/private runner services. Document D: cache settings, `npm start`, build/audit commands, local pack opt-in, Codex opening the cloned folder, branch-review-master-update cycle, source snapshot origin, no merging the preserved full branch, revert/redeploy and tester screenshot checklist.
- [ ] **Step 4 — Run GREEN and instructions check.** Workflow-policy tests and all public tests pass. Execute documented clean-clone commands locally, verify no missing machine-global paths, confirm public docs do not link to excluded private files. Workflow Linux execution is verified after audited implementation-branch push in Task 6; do not claim it already ran.
- [ ] **Step 5 — Commit and independent review.** Commit `ci: publish reviewed master previews to Pages`; reviewer checks token scope/event conditions, supply-chain pins, audio-boundary documentation and stale-run behavior.

### Task 6: Browser acceptance, merge and first live publication

**Files:** Create `tools/verify-public-preview.mjs`, `test/helpers/public-preview-fixture.js`, `test/public-preview-qa-policy.test.js`, `docs/qa/2026-10-16-public-preview.md`; update QA npm script/workflow connection. Binary QA output stays under ignored D: artifacts, not public Git. Release actions are controller-owned after task and package reviews.

**Interfaces:** `verify-public-preview.mjs --root dist/public-preview --prefix /battle-life/ [--url HTTPS_URL --live]`; local mode starts isolated loopback server on an available port, never 4173; live mode writes only a fresh isolated browser context's own test save. Report `{version,revision,viewports,checks,audioRequests,unexpectedResponses,pageErrors,screenshots}` outside artifact. Expose no test-only routes/modules in the published site.

- [ ] **Step 1 — Add failing QA guard tests.** Verify rejection of source root instead of built artifact, user's existing origin/port 4173, wrong revision, any binary-audio request, unexpected 404/error or served test module. Live mode requires HTTPS and an isolated context; no reused browser profile. Bound browser operations/watchdog and close only processes created by the verifier.
- [ ] **Step 2 — Run RED, implement QA harness, then GREEN.** Use normal imports from locked Playwright, environment-selectable existing Edge/Chromium executable; on Windows all browser temp/cache paths on D:. New dependency/browser download only if needed with correct cache settings. Public browser fixtures use serializable simulation data to prepare later scenarios in an isolated test save; actual UI handles subsequent actions. Do not alter production domain code for test shortcuts.
- [ ] **Step 3 — Exercise the built artifact.** At 1280x720 and 1920x1080: new character/scene; bed/manual sleep and background installation; PC/software; text/beat/vocal progression and metadata export; submission attachment/send; social group/dialog/navigation; dossier study; disabled audio on studio/social/export/work views; reload/continue. Include one natural new-game flow and fixture-assisted later-round views, reporting their distinction. Assert no recorded-audio network/PCM starts, no unexpected responses/page errors, constant frozen recipes and advancing jobs. Review actual screenshots. Test an old cached revision followed by the new entry and verify canonical revision 44, including Worker and CSS paths.
- [ ] **Step 4 — Run full release gate and commit.** `npm test`, explicit local asset suite on this machine, build/audits, browser QA, `git diff --check`; record exact pass/fail counts, artifact size, source/base/release SHAs and limitations. Do not claim subjective listening. Commit QA/docs and rerun metadata-sensitive build/smoke for the committed HEAD. Independent task review, then a fresh whole-package review; fix and re-review blocking findings.
- [ ] **Step 5 — Push only reviewed clean-history branch.** Refresh remote, verify no conflicting new master, run `audit ... history --base origin/master --head HEAD`. Push only `codex/first-public-preview`; open a PR to master and attach its URL to this chat. Use the authenticated GitHub connector for API actions or Git credentials for push; CLI auth was unavailable during planning, so do not assume Pages settings access. Do not extract or expose tokens. If account login is required for a missing operation, ask the user to complete it. No heavy original branch push.
- [ ] **Step 6 — Verify CI and merge as authorized.** Wait for Linux public tests/build/browser checks on this exact PR head; fix genuine failures in the clean branch. Configure Pages for GitHub Actions using an authenticated supported tool/UI, preserving unrelated repository settings; then merge reviewed changes normally into master, no force. Public GitHub Pages is an intended publication, not a private family-only site. Poll release jobs with backoff and report actionable failure rather than claiming success from a pushed commit.
- [ ] **Step 7 — Verify live site and hand off.** Confirm successful deploy for current master, returned HTTPS URL, release metadata SHA, scene, new save/reload and no missing assets under `/battle-life/`. Share the verified playable URL, source repository link, current version, known no-music limitation, second-PC commands and feedback guide. If deployment is blocked, preserve completed local work and report exact outstanding authority/action without marking publication done.

## Coverage and Self-review

- Spec 1-3: Task 1 safe snapshot/ancestry and Task 6 master/Pages release; no second repository or destructive cleanup.
- Spec 4: Task 2 capability/UI and Task 3 opt-in local overlay preserve gameplay and source identities; Task 6 exercises the real artifact.
- Spec 5: Task 1 policy, Task 4 reproducible artifact/subpath/version, Task 5 CI/master guard, Task 6 live verification.
- Spec 6: Task 3 portable run/test commands and Task 5 two-computer/feedback documentation.
- Spec 7: All six tasks have named tests, red/green checks and independent review; final browser/local-media/Linux/live evidence is explicitly distinguished.
- Spec 8: Plan awaiting user review. Existing chosen execution method is subagent-driven with independent task reviews; do not ask the user to choose again.

Reference APIs: [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [setup-node](https://github.com/actions/setup-node), [checkout](https://github.com/actions/checkout). These inform implementation; no workflow or publication has been created by writing this plan.
